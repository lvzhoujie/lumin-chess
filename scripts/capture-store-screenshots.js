#!/usr/bin/env node
// Generate Google Play Store-compliant screenshots in 9:16 portrait.
//
// Per the Play Console spec, phone screenshots must be 16:9 or 9:16 with
// each side 320–3840 px (≥1080 px to be promotion-eligible). 10-inch tablets
// require each side 1080–7680 px. The existing capture-screenshots.js
// produces 1081×2402 (~9:20, not 9:16), so this script supersedes it for
// store uploads.
//
// Output structure:
//   play-submission/screenshots/phone/{01..04}-*.png       1080×1920
//   play-submission/screenshots/tablet-7/{01..04}-*.png    1080×1920
//   play-submission/screenshots/tablet-10/{01..04}-*.png   1440×2560
//
// Phone and 7" tablet use the same 1080×1920 image set — Play accepts the
// same image for both categories. 10" tablet is rendered at higher pixel
// density so it stays crisp on bigger displays.

const puppeteer = require('puppeteer-core');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PREVIEW_URL = 'http://localhost:8767';
const OUT_ROOT = path.join(__dirname, '..', 'play-submission', 'screenshots');

// Phone uses a 540 CSS viewport (real-phone-class). Tablet-7 and Tablet-10
// share a 720 CSS viewport so the bumped tablet board cap (resizeBoard in
// index.html, ≥700 CSS width) kicks in for both — visibly larger pieces than
// the phone shot. DPR differentiates the output pixel resolution.
const DEVICES = [
  { name: 'phone',     width: 540, height: 960,  dpr: 2 },   // 1080×1920
  { name: 'tablet-7',  width: 720, height: 1280, dpr: 1.5 }, // 1080×1920 at tablet viewport
  { name: 'tablet-10', width: 720, height: 1280, dpr: 2 },   // 1440×2560
];

// Marketing headline burned into the top band of each scene.
const HEADLINES = {
  '01-splash':    'A quiet sliding puzzle',
  '02-tutorial':  'Slide pairs. Swap colors.',
  '03-gameplay':  'Ten hand-tuned levels',
  '04-congrats':  'Race the clock. Top the board.',
};

const wait = ms => new Promise(r => setTimeout(r, ms));

// Composite a solid indigo header band with the scene's headline over the top
// of the captured screenshot. The band overlays the in-app title region —
// intentional: the marketing headline serves the same orienting function.
async function addMarketingBand(filePath, sceneKey, totalWidth) {
  const headline = HEADLINES[sceneKey];
  if (!headline) return;
  const bandHeight = Math.round(totalWidth * 0.26);
  const fontSize = Math.round(totalWidth * 0.058);
  const escape = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg =
    `<svg width="${totalWidth}" height="${bandHeight}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="${totalWidth}" height="${bandHeight}" fill="#4F46E5"/>` +
      `<text x="${totalWidth / 2}" y="${bandHeight / 2}" text-anchor="middle" dominant-baseline="middle"` +
        ` font-family="Helvetica Neue, Helvetica, Arial, sans-serif"` +
        ` font-weight="700" font-size="${fontSize}" fill="#F5F4F2"` +
        ` letter-spacing="-1.5">${escape(headline)}</text>` +
    `</svg>`;
  const baseBuffer = await sharp(filePath).toBuffer();
  await sharp(baseBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(filePath);
}

async function captureSet(page, dir, totalWidth) {
  let file;

  // 1. Boot splash — clear storage, reload, capture during the 2s splash window.
  await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(1000); // stones popped, title faded in, fade-out starts at t=2s
  file = path.join(dir, '01-splash.png');
  await page.screenshot({ path: file });
  await addMarketingBand(file, '01-splash', totalWidth);
  console.log('  ✓ 01-splash.png');

  // 2. Tutorial — wait for splash to clear; tutorial auto-opens since
  //    'lumin-chess-tutorial-done' is unset after the clear above.
  await wait(2000);
  file = path.join(dir, '02-tutorial.png');
  await page.screenshot({ path: file });
  await addMarketingBand(file, '02-tutorial', totalWidth);
  console.log('  ✓ 02-tutorial.png');

  // 3. Gameplay — flag tutorial as done, reload to a fresh Level 1 board,
  //    then select a pair so target-direction arrows surface in adjacent cells.
  await page.evaluate(() => {
    try { localStorage.setItem('lumin-chess-tutorial-done', '1'); } catch (_) {}
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(2800); // boot splash + transition
  await page.evaluate(() => {
    const cells = document.querySelectorAll('.cell');
    cells[0].click(); cells[1].click();
  });
  await wait(300);
  file = path.join(dir, '03-gameplay.png');
  await page.screenshot({ path: file });
  await addMarketingBand(file, '03-gameplay', totalWidth);
  console.log('  ✓ 03-gameplay.png');

  // 4. Congratulations — fabricate the final all-solved state and inject
  //    confetti directly (the in-page spawnConfetti is IIFE-private).
  await page.evaluate(() => {
    document.getElementById('winOverlay').classList.remove('active');
    document.getElementById('tutorialOverlay').classList.remove('active');
    const tbody = document.getElementById('congratsTbody');
    // All 10 current levels with plausible best scores (a few moves above par).
    const rows = [
      ['1', 'Swap the rows', 16],
      ['2', 'Hollow square', 28],
      ['3', 'Single file',   30],
      ['4', 'Twin grays',    31],
      ['5', 'Narrow tower',  38],
      ['6', 'Bottleneck',    41],
      ['7', 'Crosshatch',    51],
      ['8', 'The arena',     53],
      ['9', 'Mind the grays',58],
      ['10','Final field',   85],
    ];
    tbody.innerHTML = rows.map(r =>
      `<tr><td>${r[0]} &middot; ${r[1]}</td><td>${r[2]}</td></tr>`
    ).join('');
    document.getElementById('congratsTotal').textContent = String(rows.reduce((s, r) => s + r[2], 0));
    const ov = document.getElementById('congratsOverlay');
    ov.classList.add('active');
    const colors = ['#4F46E5', '#7c6ef0', '#1C1B1A', '#D4CFBE', '#F2EFE6'];
    const shapes = ['square', 'circle', 'square', 'rect'];
    for (let i = 0; i < 36; i++) {
      const c = document.createElement('div');
      c.className = 'confetti ' + shapes[i % shapes.length];
      c.style.left = (Math.random() * 100) + '%';
      c.style.animationDelay = (Math.random() * 0.6) + 's';
      c.style.animationDuration = (2.6 + Math.random() * 1.6) + 's';
      c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      ov.appendChild(c);
    }
  });
  await wait(1100); // catch confetti mid-fall, not at spawn
  file = path.join(dir, '04-congrats.png');
  await page.screenshot({ path: file });
  await addMarketingBand(file, '04-congrats', totalWidth);
  console.log('  ✓ 04-congrats.png');
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();

  for (const d of DEVICES) {
    const dir = path.join(OUT_ROOT, d.name);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await page.setViewport({ width: d.width, height: d.height, deviceScaleFactor: d.dpr });
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle0' });
    const outW = d.width * d.dpr, outH = d.height * d.dpr;
    console.log(`\n→ ${d.name} — CSS ${d.width}×${d.height} @ ${d.dpr}x = ${outW}×${outH} px`);
    await captureSet(page, dir, outW);
  }

  await browser.close();
  console.log('\nAll screenshots saved under', OUT_ROOT);
})().catch(err => { console.error(err); process.exit(1); });
