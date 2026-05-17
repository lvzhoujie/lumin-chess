#!/usr/bin/env node
// Convert source SVG assets into the PNGs that @capacitor/assets expects.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'assets');

const jobs = [
  { src: 'icon-only.svg', dst: 'icon-only.png', size: 1024 },
  { src: 'splash.svg', dst: 'splash.png', size: 2732 },
  { src: 'splash-dark.svg', dst: 'splash-dark.png', size: 2732 }
];

(async () => {
  for (const job of jobs) {
    const srcPath = path.join(assetsDir, job.src);
    const dstPath = path.join(assetsDir, job.dst);
    if (!fs.existsSync(srcPath)) {
      console.warn(`⚠  Missing source: ${job.src} — skipping`);
      continue;
    }
    await sharp(srcPath, { density: 384 })
      .resize(job.size, job.size, { fit: 'fill' })
      .png({ compressionLevel: 9 })
      .toFile(dstPath);
    console.log(`✓ ${job.src} → ${job.dst} (${job.size}×${job.size})`);
  }
})().catch(err => { console.error(err); process.exit(1); });
