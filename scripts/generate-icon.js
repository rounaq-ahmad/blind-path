#!/usr/bin/env node
/**
 * Generates assets/icon.png and assets/adaptive-icon.png (both 1024×1024).
 * No external dependencies — uses only built-in Node.js modules.
 * Run: node scripts/generate-icon.js
 */
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 1024;

function hex2rgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const BG    = hex2rgb('#0d0b1a'); // near-black background
const GLOW  = hex2rgb('#e3c8ee'); // pal.lit — firefly body colour
const WHITE = [255, 255, 255];

function lerp(a, b, t)    { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function blend(base, fg, alpha) {
  return base.map((c, i) => Math.round(lerp(c, fg[i], clamp(alpha, 0, 1))));
}

// ── Raster ────────────────────────────────────────────────────────────────────
function render(size, scale) {
  const cx = size / 2;
  const cy = size / 2;
  const raw = Buffer.alloc(size * (1 + size * 3)); // filter byte + RGB

  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / scale;
      const dy = (y - cy) / scale;
      const d  = Math.sqrt(dx * dx + dy * dy);

      let rgb = [...BG];

      // Outer ambient halo (radius 0–340)
      if (d < 340) {
        const t = 1 - d / 340;
        rgb = blend(rgb, GLOW, t * t * 0.18);
      }

      // Middle glow ring (radius 0–180)
      if (d < 180) {
        const t = 1 - d / 180;
        rgb = blend(rgb, GLOW, t * t * 0.42);
      }

      // Inner bright core (radius 0–72)
      if (d < 72) {
        const t = 1 - d / 72;
        rgb = blend(rgb, WHITE, t * t * 0.88);
      }

      // Hot spot / nucleus (radius 0–28)
      if (d < 28) {
        const t = 1 - d / 28;
        rgb = blend(rgb, WHITE, t);
      }

      // Tiny specular dot (radius 0–8, offset up-left like real insect shine)
      const sx = dx + 14, sy = dy + 10;
      const sd = Math.sqrt(sx * sx + sy * sy);
      if (sd < 8) {
        const t = 1 - sd / 8;
        rgb = blend(rgb, WHITE, t * 0.6);
      }

      const ri = y * (1 + size * 3) + 1 + x * 3;
      raw[ri] = rgb[0]; raw[ri + 1] = rgb[1]; raw[ri + 2] = rgb[2];
    }
  }
  return raw;
}

// ── PNG encoder ───────────────────────────────────────────────────────────────
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t  = Buffer.from(type, 'ascii');
  const d  = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const ln = Buffer.alloc(4); ln.writeUInt32BE(d.length);
  const cd = Buffer.concat([t, d]);
  const ck = Buffer.alloc(4); ck.writeUInt32BE(crc32(cd));
  return Buffer.concat([ln, t, d, ck]);
}

function makePNG(size, rawScanlines) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Output ────────────────────────────────────────────────────────────────────
const out = path.join(__dirname, '..', 'assets');

// icon.png — full 1024×1024, glow fills ~60% of canvas
const iconRaw = render(SIZE, 1);
fs.writeFileSync(path.join(out, 'icon.png'), makePNG(SIZE, iconRaw));
console.log('✓  assets/icon.png           (1024×1024)');

// adaptive-icon.png — foreground layer; glow scaled down for safe-zone padding
// Android crops to a circle covering ~72% of the image width, so we scale the
// glow to sit comfortably inside that zone.
const adaptRaw = render(SIZE, 1.45);
fs.writeFileSync(path.join(out, 'adaptive-icon.png'), makePNG(SIZE, adaptRaw));
console.log('✓  assets/adaptive-icon.png  (1024×1024, safe-zone padded)');
console.log('\nDone. app.json already points at both files.');
