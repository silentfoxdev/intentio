// Generate the SVG and toolbar PNGs from one geometric design, without dependencies.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const iconDir = path.join(root, 'extension', 'icons');
fs.writeFileSync(path.join(iconDir, 'icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="Intentio">
  <rect x="1" y="1" width="94" height="94" rx="19" fill="#0b121a" stroke="#25506e" stroke-width="2"/>
  <path d="M25 24h46v9H53v30h18v9H25v-9h18V33H25z" fill="#00a8ff"/>
</svg>
`);
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}
function pixel(x, y) {
  const radius = 19;
  const dx = Math.max(20 - x, 0, x - 76);
  const dy = Math.max(20 - y, 0, y - 76);
  if (dx * dx + dy * dy > radius * radius) return [0, 0, 0, 0];
  const edge = x < 3 || y < 3 || x > 92 || y > 92;
  const mark = (x >= 25 && x < 71 && ((y >= 24 && y < 33) || (y >= 63 && y < 72))) ||
    (x >= 43 && x < 53 && y >= 33 && y < 63);
  if (mark) return [0, 168, 255, 255];
  return edge ? [37, 80, 110, 255] : [11, 18, 26, 255];
}
function makePng(size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const color = pixel((x + 0.5) * 96 / size, (y + 0.5) * 96 / size);
      for (let c = 0; c < 4; c++) row[1 + x * 4 + c] = color[c];
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0))
  ]);
  fs.writeFileSync(path.join(iconDir, `icon${size}.png`), png);
}
makePng(48);
makePng(96);
