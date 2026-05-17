#!/usr/bin/env node
// Render the launcher icons for Android from assets/icon-only.svg.
//
// Adaptive icons (Android 8+, the ic_launcher_foreground.png assets) need the
// art to live in the inner 66% safe zone — the outer ring is masked off by
// each launcher's shape (circle, squircle, rounded square, etc). Our SVG
// already has the art centered well within that bound, so we render the full
// canvas without extra padding.
//
// Legacy icons (Android 7 and below) use a round/square PNG at the same
// densities — we render the same art on a white background for those.

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'icon-only.svg');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');

// (density-dir, edge-px) per the Android adaptive-icon spec (108dp base).
const DENSITIES = [
  { dir: 'mipmap-mdpi',    size: 108 },
  { dir: 'mipmap-hdpi',    size: 162 },
  { dir: 'mipmap-xhdpi',   size: 216 },
  { dir: 'mipmap-xxhdpi',  size: 324 },
  { dir: 'mipmap-xxxhdpi', size: 432 },
];

// Legacy launcher PNG sizes (48dp baseline, scaled per density).
const LEGACY_SIZES = {
  'mipmap-ldpi':    36,
  'mipmap-mdpi':    48,
  'mipmap-hdpi':    72,
  'mipmap-xhdpi':   96,
  'mipmap-xxhdpi':  144,
  'mipmap-xxxhdpi': 192,
};

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function renderForeground(size, outPath) {
  const buf = await sharp(SRC, { density: 600 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(outPath, buf);
}

async function renderLegacy(size, outPath, { round }) {
  // Square legacy: white background + art centered.
  // Round legacy: white circle mask + art centered.
  const inner = Math.round(size * 0.72);
  const fg = await sharp(SRC, { density: 600 })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  let base = sharp({
    create: { width: size, height: size, channels: 4, background: WHITE },
  });

  if (round) {
    const r = size / 2;
    const mask = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="white"/></svg>`
    );
    base = sharp(await base.png().toBuffer())
      .composite([{ input: mask, blend: 'dest-in' }]);
  }

  const composited = await base
    .composite([{ input: fg, gravity: 'center' }])
    .png()
    .toBuffer();
  fs.writeFileSync(outPath, composited);
}

(async () => {
  for (const { dir, size } of DENSITIES) {
    const out = path.join(RES, dir, 'ic_launcher_foreground.png');
    await renderForeground(size, out);
    console.log(`✓ ${path.relative(ROOT, out)} (${size}×${size})`);
  }

  for (const [dir, size] of Object.entries(LEGACY_SIZES)) {
    const sq  = path.join(RES, dir, 'ic_launcher.png');
    const rnd = path.join(RES, dir, 'ic_launcher_round.png');
    await renderLegacy(size, sq, { round: false });
    await renderLegacy(size, rnd, { round: true });
    console.log(`✓ ${path.relative(ROOT, sq)} + ic_launcher_round.png (${size}×${size})`);
  }
})();
