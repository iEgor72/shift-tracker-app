// One-shot generator for the dark PWA splash PNG. Solid #0C0C10 is enough for
// iOS apple-touch-startup-image because it gets scaled. Re-run only if the
// brand background colour changes.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { resolve } from 'node:path';

const COLOR = [0x0c, 0x0c, 0x10];
const WIDTH = 1024;
const HEIGHT = 1024;
const OUTPUT_PATH = resolve('assets', 'splash-dark.png');

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

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(WIDTH, 0);
ihdr.writeUInt32BE(HEIGHT, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type RGB
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

const row = Buffer.alloc(1 + WIDTH * 3);
row[0] = 0; // filter: none
for (let x = 0; x < WIDTH; x++) {
  row[1 + x * 3] = COLOR[0];
  row[2 + x * 3] = COLOR[1];
  row[3 + x * 3] = COLOR[2];
}
const raw = Buffer.alloc(HEIGHT * row.length);
for (let y = 0; y < HEIGHT; y++) row.copy(raw, y * row.length);
const idat = deflateSync(raw, { level: 9 });

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const png = Buffer.concat([
  signature,
  writeChunk('IHDR', ihdr),
  writeChunk('IDAT', idat),
  writeChunk('IEND', Buffer.alloc(0))
]);

writeFileSync(OUTPUT_PATH, png);
console.log(`Wrote ${OUTPUT_PATH} (${png.length} bytes)`);
