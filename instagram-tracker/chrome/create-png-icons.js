// Create minimal PNG icons for Chrome extension
const fs = require('fs');
const path = require('path');

// Minimal PNG file structure (1x1 transparent pixel, then we'll scale conceptually)
function createMinimalPNG(width, height, r = 64, g = 94, b = 230) {
    // PNG signature
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);      // Width
    ihdrData.writeUInt32BE(height, 4);     // Height
    ihdrData.writeUInt8(8, 8);             // Bit depth
    ihdrData.writeUInt8(2, 9);             // Color type (RGB)
    ihdrData.writeUInt8(0, 10);            // Compression method
    ihdrData.writeUInt8(0, 11);            // Filter method
    ihdrData.writeUInt8(0, 12);            // Interlace method
    
    const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
    const ihdrChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x0D]), // Length
        Buffer.from('IHDR'),
        ihdrData,
        Buffer.from([ihdrCrc >>> 24, (ihdrCrc >>> 16) & 0xFF, (ihdrCrc >>> 8) & 0xFF, ihdrCrc & 0xFF])
    ]);
    
    // Simple IDAT chunk with solid color
    const pixelData = Buffer.alloc(width * height * 3); // RGB
    for (let i = 0; i < pixelData.length; i += 3) {
        pixelData[i] = r;     // Red
        pixelData[i + 1] = g; // Green  
        pixelData[i + 2] = b; // Blue
    }
    
    // Add filter bytes (0 for no filter)
    const filteredData = Buffer.alloc(height + pixelData.length);
    for (let y = 0; y < height; y++) {
        filteredData[y * (width * 3 + 1)] = 0; // Filter byte
        pixelData.copy(filteredData, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
    }
    
    // Compress data (minimal zlib)
    const compressed = zlibCompress(filteredData);
    const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
    const idatChunk = Buffer.concat([
        Buffer.from([(compressed.length >>> 24) & 0xFF, (compressed.length >>> 16) & 0xFF, (compressed.length >>> 8) & 0xFF, compressed.length & 0xFF]),
        Buffer.from('IDAT'),
        compressed,
        Buffer.from([idatCrc >>> 24, (idatCrc >>> 16) & 0xFF, (idatCrc >>> 8) & 0xFF, idatCrc & 0xFF])
    ]);
    
    // IEND chunk
    const iendCrc = crc32(Buffer.from('IEND'));
    const iendChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x00]), // Length
        Buffer.from('IEND'),
        Buffer.from([iendCrc >>> 24, (iendCrc >>> 16) & 0xFF, (iendCrc >>> 8) & 0xFF, iendCrc & 0xFF])
    ]);
    
    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Simple CRC32 implementation
function crc32(data) {
    const table = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }
    
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Simple zlib compression (deflate)
function zlibCompress(data) {
    // Minimal zlib header
    const header = Buffer.from([0x78, 0x01]); // CMF and FLG
    
    // Uncompressed block
    const blockHeader = Buffer.from([0x01]); // BFINAL=1, BTYPE=00 (uncompressed)
    const len = Buffer.alloc(4);
    len.writeUInt16LE(data.length, 0);
    len.writeUInt16LE(~data.length & 0xFFFF, 2);
    
    // Adler32 checksum
    let a = 1, b = 0;
    for (let i = 0; i < data.length; i++) {
        a = (a + data[i]) % 65521;
        b = (b + a) % 65521;
    }
    const adler = Buffer.from([(b >>> 8) & 0xFF, b & 0xFF, (a >>> 8) & 0xFF, a & 0xFF]);
    
    return Buffer.concat([header, blockHeader, len, data, adler]);
}

// Create icons with Instagram-like colors
const sizes = [
    { size: 16, r: 64, g: 94, b: 230 },   // Instagram blue
    { size: 32, r: 131, g: 58, b: 180 },  // Instagram purple  
    { size: 48, r: 193, g: 53, b: 132 },  // Instagram pink
    { size: 128, r: 225, g: 48, b: 108 }  // Instagram red
];

const iconsDir = path.join(__dirname, 'icons');

console.log('Creating PNG icons...');

sizes.forEach(({ size, r, g, b }) => {
    const pngData = createMinimalPNG(size, size, r, g, b);
    const iconPath = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(iconPath, pngData);
    console.log(`Created icon${size}.png (${size}x${size})`);
});

console.log('PNG icons created successfully!');