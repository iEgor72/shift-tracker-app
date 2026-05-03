// Generator for dark PWA splash PNGs at the exact device-pixel sizes iOS
// expects in apple-touch-startup-image. iOS skips the splash and falls back
// to white if the dimensions do not match, so we need a file per device
// resolution. Re-run if the brand background colour changes.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { resolve } from 'node:path';

const COLOR = [0x0c, 0x0c, 0x10];

// Each entry corresponds to one iOS device family screen in pixels.
// Both portrait and landscape variants are needed because iOS picks
// whichever matches the current orientation.
const SIZES = [
  { w: 1320, h: 2868, name: 'splash-1320x2868.png' }, // iPhone 16 Pro Max
  { w: 1206, h: 2622, name: 'splash-1206x2622.png' }, // iPhone 16 Pro
  { w: 1290, h: 2796, name: 'splash-1290x2796.png' }, // iPhone 15/16 Pro Max
  { w: 1179, h: 2556, name: 'splash-1179x2556.png' }, // iPhone 14/15 Pro
  { w: 1284, h: 2778, name: 'splash-1284x2778.png' }, // iPhone 12/13/14 Pro Max
  { w: 1170, h: 2532, name: 'splash-1170x2532.png' }, // iPhone 12/13/14
  { w: 1125, h: 2436, name: 'splash-1125x2436.png' }, // iPhone X/XS/11 Pro
  { w: 1242, h: 2688, name: 'splash-1242x2688.png' }, // iPhone XS Max, 11 Pro Max
  { w: 828, h: 1792, name: 'splash-828x1792.png' }, // iPhone XR/11
  { w: 1242, h: 2208, name: 'splash-1242x2208.png' }, // iPhone 6+/7+/8+
  { w: 750, h: 1334, name: 'splash-750x1334.png' }, // iPhone 6/7/8
  { w: 1668, h: 2388, name: 'splash-1668x2388.png' }, // iPad Pro 11"
  { w: 2048, h: 2732, name: 'splash-2048x2732.png' }, // iPad Pro 12.9"
  { w: 1024, h: 1024, name: 'splash-dark.png' } // legacy fallback name
];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function writeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function buildSolidPng(width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const row = Buffer.alloc(1 + width * 3);
  row[0] = 0; // filter: none
  for (let x = 0; x < width; x++) {
    row[1 + x * 3] = COLOR[0];
    row[2 + x * 3] = COLOR[1];
    row[3 + x * 3] = COLOR[2];
  }
  const raw = Buffer.alloc(height * row.length);
  for (let y = 0; y < height; y++) row.copy(raw, y * row.length);
  const idat = deflateSync(raw, { level: 9 });

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    writeChunk('IHDR', ihdr),
    writeChunk('IDAT', idat),
    writeChunk('IEND', Buffer.alloc(0))
  ]);
}

for (const { w, h, name } of SIZES) {
  const png = buildSolidPng(w, h);
  const out = resolve('assets', name);
  writeFileSync(out, png);
  console.log(`Wrote ${out} (${png.length} bytes)`);
}
