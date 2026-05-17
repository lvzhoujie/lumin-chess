#!/usr/bin/env node
// Render the Lumin Industries brand SVGs into Play-Console-compliant PNGs.
//   icon-512.png            — Developer profile icon (512×512, 24-bit, no alpha)
//   header-4096x2304.png    — Developer header image (4096×2304, light variant)
//   header-dark-4096x2304.png — Developer header image (dark variant)
//   header-1024x500.png     — App store listing feature graphic
//
// Run:  node scripts/build-brand-assets.js
//
// .flatten({ background }) + .removeAlpha() guarantees 24-bit RGB output
// (Play Console rejects PNGs with an alpha channel for these fields).

const sharp = require('sharp');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BRAND = path.join(ROOT, 'brand');

const CREAM = { r: 245, g: 244, b: 242 };  // #F5F4F2
const INK   = { r: 28,  g: 27,  b: 26  };  // #1C1B1A

const JOBS = [
  {
    src: 'icon.svg',
    out: 'icon-512.png',
    w: 512, h: 512,
    bg: INK,
    density: 384,
    label: 'Developer icon 512×512 (24-bit RGB on charcoal)',
  },
  {
    src: 'header-4096x2304.svg',
    out: 'header-4096x2304.png',
    w: 4096, h: 2304,
    bg: CREAM,
    density: 200,
    label: 'Header image 4096×2304 light (24-bit RGB on cream)',
  },
  {
    src: 'header-dark-4096x2304.svg',
    out: 'header-dark-4096x2304.png',
    w: 4096, h: 2304,
    bg: INK,
    density: 200,
    label: 'Header image 4096×2304 dark variant',
  },
  {
    src: 'header-4096x2304.svg',
    out: 'header-1024x500.png',
    w: 1024, h: 500,
    bg: CREAM,
    density: 60,
    label: 'Store feature graphic 1024×500 (downscaled from the same SVG)',
  },
];

(async () => {
  for (const job of JOBS) {
    const srcPath = path.join(BRAND, job.src);
    const outPath = path.join(BRAND, job.out);
    await sharp(srcPath, { density: job.density })
      .resize(job.w, job.h, { fit: 'fill' })
      .flatten({ background: job.bg })
      .removeAlpha()
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log(`  ✓ ${job.out}  —  ${job.label}`);
  }
})().catch((err) => { console.error(err); process.exit(1); });
