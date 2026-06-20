/**
 * fix-icon.js — make the app icon's white canvas corners transparent and
 * regenerate a multi-size .ico. No external image libraries required.
 *
 * The source icon (assets/icon.png) is a blue rounded "squircle" logo on a
 * 512x512 canvas whose 4 corners are opaque white. We flood-fill the white
 * connected to each corner → transparent (interior whites in the logo are
 * untouched because the blue ring separates them), then emit icon.ico with
 * sizes [256,128,64,48,32,16] (PNG-compressed entries, Vista+).
 *
 * Usage:  node build-scripts/fix-icon.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ASSETS = path.join(__dirname, '..', 'assets');
const SRC = path.join(ASSETS, 'icon.png');

// ── CRC32 (PNG) ──
const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
    }
    return t;
})();
function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG decode (8-bit RGBA, non-interlaced) ──
function readPNG(file) {
    const b = fs.readFileSync(file);
    let off = 8, w = 0, h = 0, bitDepth = 0, colorType = 0, interlace = 0;
    const idat = [];
    while (off < b.length) {
        const len = b.readUInt32BE(off);
        const type = b.slice(off + 4, off + 8).toString('latin1');
        const data = b.slice(off + 8, off + 8 + len);
        if (type === 'IHDR') {
            w = data.readUInt32BE(0); h = data.readUInt32BE(4);
            bitDepth = data[8]; colorType = data[9]; interlace = data[12];
        } else if (type === 'IDAT') idat.push(data);
        else if (type === 'IEND') break;
        off += 12 + len;
    }
    if (bitDepth !== 8 || colorType !== 6) throw new Error(`Expected 8-bit RGBA, got bitDepth=${bitDepth} colorType=${colorType}`);
    if (interlace !== 0) throw new Error('Interlaced PNG not supported');

    const ch = 4, stride = w * ch;
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const px = Buffer.alloc(w * h * ch);
    let pos = 0;
    for (let y = 0; y < h; y++) {
        const ft = raw[pos++];
        for (let x = 0; x < stride; x++) {
            const rb = raw[pos++];
            const a = x >= ch ? px[y * stride + x - ch] : 0;
            const up = y > 0 ? px[(y - 1) * stride + x] : 0;
            const ul = (x >= ch && y > 0) ? px[(y - 1) * stride + x - ch] : 0;
            let v;
            switch (ft) {
                case 0: v = rb; break;
                case 1: v = rb + a; break;
                case 2: v = rb + up; break;
                case 3: v = rb + ((a + up) >> 1); break;
                case 4: {
                    const p = a + up - ul, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - ul);
                    v = rb + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? up : ul));
                    break;
                }
                default: throw new Error('Bad PNG filter ' + ft);
            }
            px[y * stride + x] = v & 0xFF;
        }
    }
    return { w, h, ch, px };
}

// ── PNG encode (8-bit RGBA, filter 0) ──
function encodePNG({ w, h, px }) {
    const ch = 4, stride = w * ch;
    const raw = Buffer.alloc((stride + 1) * h);
    for (let y = 0; y < h; y++) {
        raw[y * (stride + 1)] = 0;
        px.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
    }
    const idat = zlib.deflateSync(raw, { level: 9 });
    const chunk = (type, data) => {
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
        const t = Buffer.from(type, 'latin1');
        const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
        return Buffer.concat([len, t, data, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ── Flood-fill the white connected to the 4 corners → transparent ──
function clearCorners(img) {
    const { w, h, ch, px } = img;
    const seen = new Uint8Array(w * h);
    const isWhite = (i) => {
        const o = i * ch;
        return px[o] > 225 && px[o + 1] > 225 && px[o + 2] > 225 && px[o + 3] > 8;
    };
    const stack = [];
    const push = (x, y) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const i = y * w + x;
        if (seen[i]) return;
        seen[i] = 1; stack.push(i);
    };
    push(0, 0); push(w - 1, 0); push(0, h - 1); push(w - 1, h - 1);
    let cleared = 0;
    while (stack.length) {
        const i = stack.pop();
        if (!isWhite(i)) continue;
        px[i * ch + 3] = 0;           // make transparent
        cleared++;
        const x = i % w, y = (i / w) | 0;
        push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
    }
    return cleared;
}

// ── Area-average downscale (premultiplied alpha to avoid dark fringes) ──
function resize(img, tw, th) {
    const { w, h, ch, px } = img;
    const out = Buffer.alloc(tw * th * ch);
    const sx = w / tw, sy = h / th;
    for (let y = 0; y < th; y++) {
        const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
        for (let x = 0; x < tw; x++) {
            const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
            let r = 0, g = 0, b = 0, a = 0, n = 0;
            for (let yy = y0; yy < y1; yy++) {
                for (let xx = x0; xx < x1; xx++) {
                    const o = (yy * w + xx) * ch, al = px[o + 3] / 255;
                    r += px[o] * al; g += px[o + 1] * al; b += px[o + 2] * al; a += px[o + 3];
                    n++;
                }
            }
            const o = (y * tw + x) * ch, aAvg = a / n;
            const alpha = aAvg / 255;
            out[o] = alpha > 0 ? Math.round(r / n / alpha) : 0;
            out[o + 1] = alpha > 0 ? Math.round(g / n / alpha) : 0;
            out[o + 2] = alpha > 0 ? Math.round(b / n / alpha) : 0;
            out[o + 3] = Math.round(aAvg);
        }
    }
    return { w: tw, h: th, ch, px: out };
}

// ── Build a PNG-compressed .ico ──
function buildICO(images) {
    const pngs = images.map((im) => encodePNG(im));
    const count = pngs.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(count, 4);
    const dir = Buffer.alloc(count * 16);
    let offset = 6 + count * 16;
    images.forEach((im, i) => {
        const base = i * 16;
        dir[base] = im.w >= 256 ? 0 : im.w;
        dir[base + 1] = im.h >= 256 ? 0 : im.h;
        dir[base + 2] = 0; dir[base + 3] = 0;
        dir.writeUInt16LE(1, base + 4);    // planes
        dir.writeUInt16LE(32, base + 6);   // bit count
        dir.writeUInt32LE(pngs[i].length, base + 8);
        dir.writeUInt32LE(offset, base + 12);
        offset += pngs[i].length;
    });
    return Buffer.concat([header, dir, ...pngs]);
}

module.exports = { readPNG, encodePNG, resize, buildICO, clearCorners };

// ── Run (only when invoked directly) ──
if (require.main === module) {
    const img = readPNG(SRC);
    console.log(`Loaded ${img.w}x${img.h}`);
    fs.copyFileSync(SRC, path.join(ASSETS, 'icon-square-backup.png'));
    const cleared = clearCorners(img);
    console.log(`Cleared ${cleared} white corner pixels → transparent`);

    fs.writeFileSync(SRC, encodePNG(img));
    console.log('Wrote transparent assets/icon.png');

    const sizes = [256, 128, 64, 48, 32, 16];
    const icoImages = sizes.map((s) => (s === img.w ? img : resize(img, s, s)));
    fs.writeFileSync(path.join(ASSETS, 'icon.ico'), buildICO(icoImages));
    console.log('Wrote assets/icon.ico with sizes', sizes.join(','));
}
