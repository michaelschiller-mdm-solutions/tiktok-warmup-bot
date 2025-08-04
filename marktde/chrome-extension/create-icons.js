/*
 * Icon Generator - Creates extension icons in required sizes
 * Run with: node create-icons.js
 */

const fs = require('fs');
const path = require('path');

// Create icons directory
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Simple SVG icon template
const createSVGIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4CAF50;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2196F3;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="url(#grad)" stroke="#fff" stroke-width="2"/>
  
  <!-- Message icon -->
  <g transform="translate(${size*0.2}, ${size*0.25})">
    <!-- Message bubble -->
    <rect x="0" y="0" width="${size*0.6}" height="${size*0.4}" rx="${size*0.05}" fill="#fff" opacity="0.9"/>
    <!-- Message lines -->
    <line x1="${size*0.1}" y1="${size*0.15}" x2="${size*0.5}" y2="${size*0.15}" stroke="#333" stroke-width="2" opacity="0.7"/>
    <line x1="${size*0.1}" y1="${size*0.25}" x2="${size*0.4}" y2="${size*0.25}" stroke="#333" stroke-width="2" opacity="0.7"/>
    <!-- Send arrow -->
    <polygon points="${size*0.45},${size*0.45} ${size*0.55},${size*0.5} ${size*0.45},${size*0.55}" fill="#fff" opacity="0.9"/>
  </g>
  
  <!-- Markt.de indicator -->
  <circle cx="${size*0.8}" cy="${size*0.2}" r="${size*0.08}" fill="#FF5722"/>
</svg>
`;

// Create SVG files
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svgContent);
  console.log(`✅ Created icon${size}.svg`);
});

// Create a simple HTML file to convert SVG to PNG
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Icon Converter</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .icon-container { margin: 20px 0; }
        canvas { border: 1px solid #ccc; margin: 10px; }
    </style>
</head>
<body>
    <h1>Markt.de DM Bot - Icon Converter</h1>
    <p>This page helps convert SVG icons to PNG format for the Chrome extension.</p>
    
    <div class="icon-container">
        <h3>16x16 Icon</h3>
        <canvas id="canvas16" width="16" height="16"></canvas>
        <button onclick="downloadPNG('canvas16', 'icon16.png')">Download PNG</button>
    </div>
    
    <div class="icon-container">
        <h3>48x48 Icon</h3>
        <canvas id="canvas48" width="48" height="48"></canvas>
        <button onclick="downloadPNG('canvas48', 'icon48.png')">Download PNG</button>
    </div>
    
    <div class="icon-container">
        <h3>128x128 Icon</h3>
        <canvas id="canvas128" width="128" height="128"></canvas>
        <button onclick="downloadPNG('canvas128', 'icon128.png')">Download PNG</button>
    </div>

    <script>
        function createIcon(size) {
            const canvas = document.getElementById('canvas' + size);
            const ctx = canvas.getContext('2d');
            
            // Clear canvas
            ctx.clearRect(0, 0, size, size);
            
            // Create gradient
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#4CAF50');
            gradient.addColorStop(1, '#2196F3');
            
            // Background circle
            ctx.beginPath();
            ctx.arc(size/2, size/2, size/2 - 2, 0, 2 * Math.PI);
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Message bubble
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(size*0.2, size*0.25, size*0.6, size*0.4);
            
            // Message lines
            ctx.strokeStyle = 'rgba(51, 51, 51, 0.7)';
            ctx.lineWidth = Math.max(1, size/32);
            ctx.beginPath();
            ctx.moveTo(size*0.3, size*0.4);
            ctx.lineTo(size*0.7, size*0.4);
            ctx.moveTo(size*0.3, size*0.5);
            ctx.lineTo(size*0.6, size*0.5);
            ctx.stroke();
            
            // Send arrow
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.moveTo(size*0.65, size*0.6);
            ctx.lineTo(size*0.75, size*0.65);
            ctx.lineTo(size*0.65, size*0.7);
            ctx.closePath();
            ctx.fill();
            
            // Markt.de indicator
            ctx.beginPath();
            ctx.arc(size*0.8, size*0.2, size*0.08, 0, 2 * Math.PI);
            ctx.fillStyle = '#FF5722';
            ctx.fill();
        }
        
        function downloadPNG(canvasId, filename) {
            const canvas = document.getElementById(canvasId);
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL();
            link.click();
        }
        
        // Create all icons when page loads
        window.onload = function() {
            createIcon(16);
            createIcon(48);
            createIcon(128);
        };
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'create-icons.html'), htmlContent);
console.log('✅ Created create-icons.html');

console.log('\n📋 Instructions:');
console.log('1. Open create-icons.html in your browser');
console.log('2. Click the "Download PNG" buttons to save the icon files');
console.log('3. Save the PNG files in the icons/ directory');
console.log('4. The extension will use these icons automatically');

console.log('\n🎨 Icon creation completed!');