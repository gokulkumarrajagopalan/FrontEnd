# Financial Year Sync Implementation Guide

## Overview

This guide explains how to implement financial year-wise syncing for Balance Sheet, P&L, and Trial Balance reports. The system tracks:
- **Full dump**: All data from company's sync start date to current date
- **Financial year-wise**: 2021-22, 22-23, 23-24, 24-25, 25-26
- **Automatic FY detection**: Identifies which financial year each record belongs to

## 1. Backend Database Schema Changes

### A. Company Financial Configuration Table
```sql
CREATE TABLE company_financial_config (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    company_id BIGINT NOT NULL UNIQUE,
    company_name VARCHAR(255),
    cmp_guid VARCHAR(50),
    sync_start_date VARCHAR(8),  -- YYYYMMDD format (e.g., 20210401)
    sync_interval VARCHAR(20),   -- MONTHLY, QUARTERLY, YEARLY
    last_sync_date DATETIME,
    last_full_dump_date DATETIME,
    sync_status VARCHAR(50),     -- ACTIVE, PAUSED, COMPLETED
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES company(id)
);
```

### B. Financial Year Tracking Tables
```sql
-- Balance Sheet with FY tracking
ALTER TABLE balance_sheet ADD COLUMN (
    financial_year INT,         -- e.g., 2024 for FY 2024-25
    sync_period VARCHAR(50),    -- FULL_DUMP, 2024-25, etc.
    sync_batch_id VARCHAR(50),  -- Group multiple syncs together
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fy (financial_year),
    INDEX idx_sync_period (sync_period),
    UNIQUE KEY unique_record_per_fy (cmp_id, name, financial_year)
);

-- Profit & Loss with FY tracking
ALTER TABLE profit_loss ADD COLUMN (
    financial_year INT,
    sync_period VARCHAR(50),
    sync_batch_id VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fy (financial_year),
    INDEX idx_sync_period (sync_period),
    UNIQUE KEY unique_record_per_fy (cmp_id, name, financial_year)
);

-- Trial Balance with FY tracking
ALTER TABLE trial_balance ADD COLUMN (
    financial_year INT,
    sync_period VARCHAR(50),
    sync_batch_id VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fy (financial_year),
    INDEX idx_sync_period (sync_period),
    UNIQUE KEY unique_record_per_fy (cmp_id, name, financial_year)
);
```

### C. Financial Year Sync History Table
```sql
CREATE TABLE financial_year_sync_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    report_type VARCHAR(50),    -- balancesheet, profitloss, trailbalance
    financial_year INT,
    sync_period VARCHAR(50),
    from_date VARCHAR(8),
    to_date VARCHAR(8),
    records_count INT,
    sync_status VARCHAR(50),    -- SUCCESS, FAILED, PARTIAL
    error_message TEXT,
    sync_batch_id VARCHAR(50),
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (company_id) REFERENCES company(id),
    INDEX idx_company (company_id),
    INDEX idx_fy (financial_year),
    INDEX idx_sync_date (completed_at)
);
```

## 2. Backend API Endpoints

### A. Company Financial Configuration
```
GET  /api/companies/{companyId}/financial-config
POST /api/companies/{companyId}/financial-config
PUT  /api/companies/{companyId}/financial-config
```

**Request/Response:**
```json
{
  "companyId": 1,
  "companyName": "ABC Pvt Ltd",
  "cmpGuid": "guid-12345",
  "syncStartDate": "20210401",
  "syncInterval": "MONTHLY",
  "lastSyncDate": "2025-05-16T10:30:00",
  "lastFullDumpDate": "2025-05-15T08:00:00"
}
```

### B. Trigger Financial Year Sync
```
POST /api/reports/sync-financial-years
```

**Request:**
```json
{
  "companyId": 1,
  "reportTypes": ["balancesheet", "profitloss", "trailbalance"],
  "fullDump": true,
  "syncBatchId": "sync_2025051600001"
}
```

**Response:**
```json
{
  "syncBatchId": "sync_2025051600001",
  "company": {
    "id": 1,
    "name": "ABC Pvt Ltd"
  },
  "dateRanges": [
    {
      "start": "20210401",
      "end": "20260331",
      "fy": "FULL_DUMP",
      "label": "Full Data"
    }
  ],
  "reports": {
    "balancesheet": [
      {
        "period": "2024-25",
        "fy": 2024,
        "success": true,
        "recordsCount": 185,
        "message": "Synced 185 records"
      }
    ],
    "profitloss": [...],
    "trailbalance": [...]
  }
}
```

### C. Query Reports by Financial Year
```
GET /api/reports/balancesheet?companyId=1&financialYear=2024
GET /api/reports/profitloss?companyId=1&financialYear=2024&syncPeriod=2024-25
GET /api/reports/trailbalance?companyId=1&syncPeriod=FULL_DUMP
```

## 3. Frontend Integration

### A. Sync Scheduler Updates
```javascript
// FrontEnd/src/renderer/services/sync-scheduler.js

async syncFinancialYearData(company, userId, tallyPort, backendUrl, authToken, deviceToken) {
    const payload = {
        companyId: company.id,
        reportTypes: ['balancesheet', 'profitloss', 'trailbalance'],
        fullDump: true,  // First time sync
        syncBatchId: `sync_${Date.now()}`
    };
    
    try {
        const response = await fetch(`${backendUrl}/reports/sync-financial-years`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'X-Device-Token': deviceToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        console.log('Financial Year Sync Result:', result);
        return result;
    } catch (error) {
        console.error('Financial Year Sync Error:', error);
        throw error;
    }
}
```

### B. Report Viewer with FY Filter
```javascript
// FrontEnd/src/renderer/components/FinancialReports.vue

<template>
  <div class="financial-reports">
    <!-- Financial Year Selector -->
    <div class="fy-selector">
      <select v-model="selectedFY">
        <option value="FULL_DUMP">Full Data (2021-2026)</option>
        <option value="2021">FY 2021-22</option>
        <option value="2022">FY 2022-23</option>
        <option value="2023">FY 2023-24</option>
        <option value="2024">FY 2024-25</option>
        <option value="2025">FY 2025-26</option>
      </select>
    </div>
    
    <!-- Report Tabs -->
    <tabs>
      <tab label="Balance Sheet">
        <ReportTable 
          :data="balanceSheetData" 
          :financial-year="selectedFY"
        />
      </tab>
      <tab label="Profit & Loss">
        <ReportTable 
          :data="profitLossData" 
          :financial-year="selectedFY"
        />
      </tab>
      <tab label="Trial Balance">
        <ReportTable 
          :data="trialBalanceData" 
          :financial-year="selectedFY"
        />
      </tab>
    </tabs>
  </div>
</template>

<script>
export default {
  data() {
    return {
      selectedFY: 'FULL_DUMP',
      balanceSheetData: [],
      profitLossData: [],
      trialBalanceData: []
    }
  },
  watch: {
    selectedFY(newVal) {
      this.loadReports(newVal);
    }
  },
  methods: {
    async loadReports(fy) {
      const params = fy === 'FULL_DUMP' ? '?syncPeriod=FULL_DUMP' : `?financialYear=${fy}`;
      
      try {
        this.balanceSheetData = await this.fetchReport('balancesheet', params);
        this.profitLossData = await this.fetchReport('profitloss', params);
        this.trialBalanceData = await this.fetchReport('trailbalance', params);
      } catch (error) {
        console.error('Error loading reports:', error);
      }
    },
    async fetchReport(type, params) {
      const response = await fetch(`/api/reports/${type}${params}`);
      return response.json();
    }
  }
}
</script>
```

## 4. Python Usage Example

```python
from financial_year_sync import FinancialYearSyncManager, FinancialYear
from datetime import datetime

# Initialize manager
manager = FinancialYearSyncManager(
    backend_url='http://localhost:8080/api',
    auth_token='your-auth-token',
    device_token='your-device-token',
    tally_host='localhost',
    tally_port=9000
)

# Example 1: Full dump sync
results = manager.sync_financial_reports(
    company_id=1,
    company_name='ABC Pvt Ltd',
    report_types=['balancesheet', 'profitloss', 'trailbalance'],
    full_dump=True
)

# Example 2: Financial year-wise sync
results = manager.sync_financial_reports(
    company_id=1,
    company_name='ABC Pvt Ltd',
    report_types=['balancesheet'],
    full_dump=False
)

# Example 3: Get specific financial year
fy = FinancialYear(2024)
print(f"FY 2024 starts: {fy.start_date}, ends: {fy.end_date}")

# Get all FYs in a range
all_fys = FinancialYear.get_all_years('20210401', '20260331')
for fy in all_fys:
    print(f"  - {fy}")
```

## 5. Sync Workflow

### Initial Setup (One-time)
```
1. Admin sets sync_start_date for company (e.g., 20210401)
2. System triggers full_dump sync
3. All data from 2021-04-01 to current date is synced
4. System identifies financial years and tags each record
```

### Periodic Sync
```
1. Monthly: Sync current financial year data
2. Quarterly: Sync current quarter + year-end cleanup
3. Full dump annually: Every April 1st
```

### Query Examples
```sql
-- Get all balance sheet records for FY 2024-25
SELECT * FROM balance_sheet 
WHERE cmp_id = 1 AND financial_year = 2024;

-- Get records synced in full dump
SELECT * FROM balance_sheet 
WHERE cmp_id = 1 AND sync_period = 'FULL_DUMP';

-- Get records modified in last sync batch
SELECT * FROM balance_sheet 
WHERE cmp_id = 1 AND sync_batch_id = 'sync_2025051600001';

-- Compare across financial years
SELECT name, financial_year, debitAmount, creditAmount 
FROM balance_sheet 
WHERE cmp_id = 1 AND name = 'Sales' 
ORDER BY financial_year;
```

## 6. Variables to Add to Backend

### Company Table
- `financial_year_start_month` (default: 4 for April)
- `sync_start_date`
- `last_financial_sync_date`

### Report Tables (Balance Sheet, P&L, Trial Balance)
- `financial_year` (INT)
- `sync_period` (VARCHAR) - e.g., "2024-25", "FULL_DUMP"
- `sync_batch_id` (VARCHAR) - to group syncs
- `sync_order` (INT) - sequence number for comparison

### Sync History Table
- Complete audit trail of all syncs
- Error tracking
- Retry mechanism

## 7. Error Handling

```python
try:
    results = manager.sync_financial_reports(...)
    
    for report_type, report_results in results['reports'].items():
        for result in report_results:
            if not result['success']:
                logger.error(f"Failed to sync {report_type} for {result['period']}: {result['error']}")
                # Implement retry logic
            else:
                logger.info(f"✓ {report_type}: {result['message']}")
                
except Exception as e:
    logger.error(f"Critical sync error: {e}")
    # Send alert to admin
```

## 8. Advantages

✅ **Full historical data**: Dump all data from 2021 onwards  
✅ **FY-wise comparison**: Compare metrics across years  
✅ **Audit trail**: Track when each record was synced  
✅ **Flexible querying**: Filter by FY, sync period, or batch  
✅ **Error recovery**: Retry failed syncs without re-syncing successful ones  
✅ **Performance**: Index on financial_year enables fast lookups  
✅ **Scalability**: Supports unlimited number of companies and years

## 9. Implementation Timeline

**Phase 1** (Week 1-2): Database schema changes  
**Phase 2** (Week 2-3): Backend API endpoints  
**Phase 3** (Week 3-4): Python sync module integration  
**Phase 4** (Week 4): Frontend UI updates  
**Phase 5** (Week 5): Testing & deployment
