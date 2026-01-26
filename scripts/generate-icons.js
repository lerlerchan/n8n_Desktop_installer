/**
 * Icon Generator Script
 *
 * This script creates placeholder PNG icons for the n8n Desktop application.
 * These are simple colored circles that can be replaced with proper icons later.
 *
 * To generate proper icons, you can:
 * 1. Use an online tool like https://icoconvert.com/ to create .ico from PNG
 * 2. Use ImageMagick: convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
 * 3. Replace with official n8n branding assets
 */

const fs = require('fs');
const path = require('path');

// Simple PNG file creator (creates a basic colored square)
// For production, replace these with proper icons

// PNG header and IHDR chunk for a 16x16 image
function createSimplePng(width, height, r, g, b) {
  // This creates a minimal valid PNG with a solid color
  // For real icons, use a proper image library or pre-made assets

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);  // bit depth
  ihdrData.writeUInt8(2, 9);  // color type (RGB)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdr = Buffer.concat([
    Buffer.from([0, 0, 0, 13]), // length
    Buffer.from('IHDR'),
    ihdrData,
    ihdrCrc
  ]);

  // IDAT chunk (image data)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      rawData.push(r, g, b);
    }
  }

  const compressed = deflate(Buffer.from(rawData));
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(compressed.length, 0);
  const idat = Buffer.concat([idatLen, Buffer.from('IDAT'), compressed, idatCrc]);

  // IEND chunk
  const iendCrc = crc32(Buffer.from('IEND'));
  const iend = Buffer.concat([
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('IEND'),
    iendCrc
  ]);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Simple CRC32 implementation
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = makeCrcTable();

  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
  }

  crc = (crc ^ 0xFFFFFFFF) >>> 0;
  const result = Buffer.alloc(4);
  result.writeUInt32BE(crc, 0);
  return result;
}

function makeCrcTable() {
  const table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c >>> 0;
  }
  return table;
}

// Simple deflate (zlib) - just use raw data with zlib wrapper for simplicity
function deflate(data) {
  const zlib = require('zlib');
  return zlib.deflateSync(data);
}

// Generate icons
const assetsDir = path.join(__dirname, '..', 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create 16x16 tray icons
const greenIcon = createSimplePng(16, 16, 74, 222, 128);  // Green (#4ade80)
const grayIcon = createSimplePng(16, 16, 156, 163, 175);  // Gray (#9ca3af)
const orangeIcon = createSimplePng(16, 16, 255, 107, 0);  // Orange (n8n color)

fs.writeFileSync(path.join(assetsDir, 'tray-icon-running.png'), greenIcon);
fs.writeFileSync(path.join(assetsDir, 'tray-icon-stopped.png'), grayIcon);
fs.writeFileSync(path.join(assetsDir, 'tray-icon.png'), orangeIcon);

// Create larger icon for app
const appIcon = createSimplePng(256, 256, 255, 107, 0);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), appIcon);

console.log('Icons generated successfully!');
console.log('');
console.log('Note: These are placeholder icons (solid colored squares).');
console.log('For production, replace them with proper n8n branded icons.');
console.log('');
console.log('To create icon.ico from icon.png, use one of these methods:');
console.log('1. Online: https://icoconvert.com/');
console.log('2. ImageMagick: convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico');
