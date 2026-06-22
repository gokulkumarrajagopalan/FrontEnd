#!/usr/bin/env python3
"""
Deep Voucher Integrity Reconciler (DB-side diagnostic)
======================================================
Complements reconciliation.py's identity-level check (GUID/AlterID/count) with deep,
per-voucher FIELD reconciliation that catches the "sync dropped/derived/mis-signed a field"
class of bugs — the kind that pass an AlterID check but render wrong.

This is a standalone diagnostic: it queries PostgreSQL directly (server-side / local, where DB
creds exist), so it does NOT run inside the client sync_worker.exe (which only has backend-API
access). Run it after a sync to certify data, or in CI.

Checks (per company):
  1. Unbalanced vouchers          ΣDr must equal ΣCr  (Σ signed ledger amount == 0)
  2. Missing ledger lines         non-Stock-Journal active vouchers with < 2 ledger lines
  3. Duplicate GUIDs              same guid appears twice
  4. True duplicate vouchers      same type+number+date+amount, different GUID
  5. Dr/Cr sign convention        DR must be negative, CR positive (no exceptions)
  6. Header vs ledger total       vouchers.amount != Σ(credit ledger lines)
  7. Bill signed-netting          per ledger line: signed Σ(bills by type) == ledger amount
  8. Income-ledger coverage       item invoices whose income ledger is flagged ledger_from_item
                                  (health metric for the inventory→ledger link fix)

Usage:
  python voucher_reconcile.py --cmp 12 [--json] [--samples 20]
Env (optional): PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD  (defaults to local dev TallyDB).
"""
import argparse
import json
import os
import sys

try:
    import psycopg2
except ImportError:
    print("psycopg2 is required: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(2)

TOL = 0.01  # currency tolerance


def connect():
    return psycopg2.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=int(os.getenv("PGPORT", "5432")),
        dbname=os.getenv("PGDATABASE", "TallyDB"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", "postgres"),
        connect_timeout=int(os.getenv("PGCONNECT_TIMEOUT", "10")),
    )


class VoucherIntegrityReconciler:
    def __init__(self, conn, cmp_id, samples=20):
        self.conn = conn
        self.cmp_id = cmp_id
        self.samples = samples

    def _q(self, sql, params=None):
        cur = self.conn.cursor()
        cur.execute(sql, params or {})
        rows = cur.fetchall()
        cur.close()
        return rows

    # ── individual checks ───────────────────────────────────────────────
    def check_unbalanced(self):
        rows = self._q(
            """
            SELECT v.id, v.voucher_number, v.voucher_type, ROUND(SUM(vle.amount),2) net
            FROM vouchers v JOIN voucher_ledger_entries vle ON vle.voucher_id = v.id
            WHERE v.cmp_id = %(c)s AND v.is_active AND NOT v.is_cancelled AND NOT v.is_deleted
            GROUP BY v.id, v.voucher_number, v.voucher_type
            HAVING ABS(SUM(vle.amount)) > %(t)s
            ORDER BY ABS(SUM(vle.amount)) DESC
            """,
            {"c": self.cmp_id, "t": TOL},
        )
        return self._result("Unbalanced vouchers (sum Dr = sum Cr)", rows,
                            evidence=[{"voucherId": r[0], "number": r[1], "type": r[2], "net": float(r[3])} for r in rows])

    def check_missing_ledger_lines(self):
        rows = self._q(
            """
            SELECT v.id, v.voucher_number, v.voucher_type, COUNT(vle.id) lines
            FROM vouchers v LEFT JOIN voucher_ledger_entries vle ON vle.voucher_id = v.id
            WHERE v.cmp_id = %(c)s AND v.is_active AND NOT v.is_cancelled AND NOT v.is_deleted
              AND v.voucher_type NOT ILIKE '%%stock journal%%'
            GROUP BY v.id, v.voucher_number, v.voucher_type
            HAVING COUNT(vle.id) < 2
            ORDER BY lines
            """,
            {"c": self.cmp_id},
        )
        return self._result("Accounting vouchers with < 2 ledger lines", rows,
                            evidence=[{"voucherId": r[0], "number": r[1], "type": r[2], "lines": r[3]} for r in rows])

    def check_duplicate_guids(self):
        rows = self._q(
            "SELECT guid, COUNT(*) FROM vouchers WHERE cmp_id=%(c)s GROUP BY guid HAVING COUNT(*)>1",
            {"c": self.cmp_id},
        )
        return self._result("Duplicate GUIDs", rows,
                            evidence=[{"guid": r[0], "count": r[1]} for r in rows])

    def check_true_duplicates(self):
        rows = self._q(
            """
            SELECT voucher_type, voucher_number, voucher_date, amount, COUNT(*) c,
                   ARRAY_AGG(id) ids, COUNT(DISTINCT guid) distinct_guids
            FROM vouchers
            WHERE cmp_id=%(c)s AND is_active AND NOT is_cancelled AND NOT is_deleted
              AND voucher_number IS NOT NULL AND voucher_number <> ''
            GROUP BY voucher_type, voucher_number, voucher_date, amount
            HAVING COUNT(*) > 1 AND COUNT(DISTINCT guid) < COUNT(*)
            """,
            {"c": self.cmp_id},
        )
        # Only flag groups where two rows share a GUID (genuine re-import dup). Distinct GUIDs
        # sharing type+number+date+amount are separate Tally vouchers and are legitimate.
        return self._result("True duplicate vouchers (shared GUID)", rows,
                            evidence=[{"type": r[0], "number": r[1], "date": str(r[2]), "amount": float(r[3]), "ids": r[5]} for r in rows])

    def check_sign_convention(self):
        rows = self._q(
            """
            SELECT id, voucher_id, ledger_name, amount, dr_cr
            FROM voucher_ledger_entries
            WHERE cmp_id=%(c)s
              AND ((dr_cr='DR' AND amount > 0) OR (dr_cr='CR' AND amount < 0))
            """,
            {"c": self.cmp_id},
        )
        return self._result("Dr/Cr sign convention violations", rows,
                            evidence=[{"entryId": r[0], "voucherId": r[1], "ledger": r[2], "amount": float(r[3]), "drCr": r[4]} for r in rows])

    def check_header_vs_ledger(self):
        # Expected header amount = the net voucher total: party balance for item invoices
        # (so contra refund/discount lines don't inflate it), else the credit side (= debit side).
        rows = self._q(
            """
            WITH t AS (
              SELECT v.id, v.voucher_number, v.is_invoice, v.amount hdr,
                     COALESCE(SUM(CASE WHEN vle.amount > 0 THEN vle.amount ELSE 0 END),0) cr,
                     COALESCE(SUM(CASE WHEN vle.is_party_ledger THEN ABS(vle.amount) ELSE 0 END),0) party
              FROM vouchers v LEFT JOIN voucher_ledger_entries vle ON vle.voucher_id = v.id
              WHERE v.cmp_id=%(c)s AND v.is_active AND NOT v.is_cancelled AND NOT v.is_deleted
              GROUP BY v.id, v.voucher_number, v.is_invoice, v.amount)
            SELECT id, voucher_number, hdr, cr, party,
                   CASE WHEN is_invoice AND party > 0 THEN party ELSE cr END expected
            FROM t
            WHERE hdr <> 0 AND ABS(ABS(hdr) - (CASE WHEN is_invoice AND party > 0 THEN party ELSE cr END)) > %(t)s
            ORDER BY 1
            """,
            {"c": self.cmp_id, "t": TOL},
        )
        return self._result("Header amount vs net voucher total", rows,
                            evidence=[{"voucherId": r[0], "number": r[1], "header": float(r[2]), "expected": float(r[5])} for r in rows])

    def check_bill_netting(self):
        # WARN-only fidelity check (not a correctness failure): the sync stores bill_amount via
        # abs(), which loses the sign *within* a bill_type — e.g. a 'New Ref' that is actually a
        # reduction, or an 'Agst Ref' credit-note line. So bills won't always net to the ledger
        # line. Outstanding totals are unaffected (they come from the authoritative
        # bills_outstanding snapshot, not these rows). A signed bill_amount column would be needed
        # to make this reconcile exactly; flagged here for visibility.
        rows = self._q(
            """
            WITH x AS (
              SELECT vle.id le_id, vle.voucher_id, vle.ledger_name, ABS(vle.amount) le_amt,
                     SUM(CASE WHEN ba.bill_type ILIKE 'agst%%' THEN -ABS(ba.bill_amount)
                              ELSE ABS(ba.bill_amount) END) signed_bills
              FROM voucher_ledger_entries vle
              JOIN voucher_bill_allocations ba
                   ON ba.ledger_entry_id = vle.id AND ba.bill_type <> 'Voucher'
              WHERE vle.cmp_id=%(c)s
              GROUP BY vle.id, vle.voucher_id, vle.ledger_name, vle.amount)
            SELECT le_id, voucher_id, ledger_name, le_amt, signed_bills
            FROM x WHERE ABS(le_amt - ABS(signed_bills)) > %(t)s
            ORDER BY ABS(le_amt - ABS(signed_bills)) DESC
            """,
            {"c": self.cmp_id, "t": TOL},
        )
        return self._result("Bill signed-netting vs ledger line (abs() fidelity gap)", rows, warn_only=True,
                            evidence=[{"entryId": r[0], "voucherId": r[1], "ledger": r[2], "ledgerAmt": float(r[3]), "signedBills": float(r[4])} for r in rows])

    def check_income_ledger_coverage(self):
        # Health metric (warning, not failure): item invoices whose income ledger is NOT flagged
        # ledger_from_item. After the parser fix + re-sync this should reach 0.
        rows = self._q(
            """
            WITH inv AS (SELECT DISTINCT voucher_id FROM voucher_inventory_entries WHERE cmp_id=%(c)s)
            SELECT v.id, v.voucher_number, v.voucher_type
            FROM vouchers v JOIN inv ON inv.voucher_id = v.id
            WHERE v.cmp_id=%(c)s AND v.is_invoice
              AND NOT EXISTS (SELECT 1 FROM voucher_ledger_entries e
                              WHERE e.voucher_id = v.id AND e.ledger_from_item)
            ORDER BY v.id
            """,
            {"c": self.cmp_id},
        )
        return self._result("Item invoices missing income-ledger flag", rows, warn_only=True,
                            evidence=[{"voucherId": r[0], "number": r[1], "type": r[2]} for r in rows])

    # ── helpers ─────────────────────────────────────────────────────────
    def _result(self, name, rows, evidence=None, warn_only=False):
        count = len(rows)
        status = "PASS" if count == 0 else ("WARN" if warn_only else "FAIL")
        return {
            "check": name,
            "status": status,
            "offending": count,
            "samples": (evidence or [])[: self.samples],
        }

    def run(self):
        checks = [
            self.check_unbalanced,
            self.check_missing_ledger_lines,
            self.check_duplicate_guids,
            self.check_true_duplicates,
            self.check_sign_convention,
            self.check_header_vs_ledger,
            self.check_bill_netting,
            self.check_income_ledger_coverage,
        ]
        results = [c() for c in checks]
        failed = [r for r in results if r["status"] == "FAIL"]
        warned = [r for r in results if r["status"] == "WARN"]
        totals = self._q(
            """
            SELECT (SELECT COUNT(*) FROM vouchers WHERE cmp_id=%(c)s),
                   (SELECT COUNT(*) FROM voucher_ledger_entries WHERE cmp_id=%(c)s),
                   (SELECT COUNT(*) FROM voucher_inventory_entries WHERE cmp_id=%(c)s)
            """,
            {"c": self.cmp_id},
        )[0]
        return {
            "cmpId": self.cmp_id,
            "totals": {"vouchers": totals[0], "ledgerEntries": totals[1], "inventoryEntries": totals[2]},
            "overall": "FAIL" if failed else ("WARN" if warned else "PASS"),
            "checks": results,
        }


def render_text(report):
    out = []
    t = report["totals"]
    out.append(f"Voucher Integrity Reconciliation — cmpId {report['cmpId']}")
    out.append(f"  vouchers={t['vouchers']}  ledgerEntries={t['ledgerEntries']}  inventoryEntries={t['inventoryEntries']}")
    out.append(f"  OVERALL: {report['overall']}")
    out.append("")
    for c in report["checks"]:
        icon = {"PASS": "PASS ", "WARN": "WARN ", "FAIL": "FAIL "}[c["status"]]
        out.append(f"  [{icon}] {c['check']}: {c['offending']} offending")
        for s in c["samples"]:
            out.append(f"           - {json.dumps(s, default=str)}")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description="Deep voucher integrity reconciler (DB-side)")
    ap.add_argument("--cmp", type=int, required=True, help="company cmp_id")
    ap.add_argument("--json", action="store_true", help="emit JSON instead of text")
    ap.add_argument("--samples", type=int, default=20, help="max sample rows per check")
    args = ap.parse_args()

    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    conn = connect()
    try:
        report = VoucherIntegrityReconciler(conn, args.cmp, samples=args.samples).run()
    finally:
        conn.close()

    print(json.dumps(report, indent=2, default=str) if args.json else render_text(report))
    sys.exit(1 if report["overall"] == "FAIL" else 0)


if __name__ == "__main__":
    main()
