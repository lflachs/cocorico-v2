const fs = require('fs');
const path = require('path');

// Simple SVG to PNG placeholder icons
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#ffffff"/>
  <text x="50%" y="50%" font-size="${size * 0.7}" text-anchor="middle" dominant-baseline="central">🐓</text>
</svg>`;

  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), svg);
  console.log(`Created icon-${size}x${size}.svg`);
});

console.log('PWA icons generated successfully!');
console.log('Note: For production, convert these SVG files to PNG using an image converter.');
