#!/usr/bin/env node
// Capture Play Store-ready screenshots from the running preview server.
// Uses system Chrome via puppeteer-core. 1080×1920 portrait (Play Console's
// minimum for phone screenshots), which keeps the layout from looking
// stretched on tall viewports.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PREVIEW_URL = 'http://localhost:8767';
const OUT = path.join(__dirname, '..', 'play-submission', 'screenshots');
// Pixel 7 / 8-class CSS viewport at DPR 2.625 → output is ~1081 × 2402 px.
// This makes the board use 86vw of a 412-px CSS viewport (≈ 929 device px),
// matching how the game renders on a real phone instead of getting capped
// to 360 CSS px on a wide desktop viewport.
const WIDTH = 412;
const HEIGHT = 915;
const DPR = 2.625;

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function fullReset(page) {
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch (e) {}
  });
  await page.reload({ waitUntil: 'networkidle0' });
}

async function skipTutorial(page, { unlockTo = 0 } = {}) {
  // Tell the app the tutorial is done so it doesn't open, then unlock levels.
  await page.evaluate(({ unlockTo }) => {
    try {
      localStorage.clear();
      localStorage.setItem('lumin-chess-tutorial-done', '1');
      if (unlockTo >= 1) localStorage.setItem('lumin-chess-best-1', '14');
      if (unlockTo >= 2) localStorage.setItem('lumin-chess-best-2', '32');
      if (unlockTo >= 3) localStorage.setItem('lumin-chess-best-3', '49');
    } catch (e) {}
  }, { unlockTo });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(2800); // boot splash
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: DPR });

  // ── 01. Tutorial slide 1 (welcome) ────────────────────────────────────
  await page.goto(PREVIEW_URL, { waitUntil: 'networkidle0' });
  await fullReset(page);
  await wait(2800);
  await page.screenshot({ path: path.join(OUT, '01-welcome.png') });
  console.log('✓ 01-welcome.png');

  // ── 02. Tutorial slide 2 (pair-rule callout) ─────────────────────────
  await page.click('#tutorialNextBtn');
  await wait(400);
  await page.screenshot({ path: path.join(OUT, '02-pair-rule.png') });
  console.log('✓ 02-pair-rule.png');

  // ── 03. Practice mode — board with highlighted swipe path ────────────
  await page.click('#tutorialNextBtn'); // "Try a move →"
  await wait(500);
  await page.screenshot({ path: path.join(OUT, '03-practice-highlight.png') });
  console.log('✓ 03-practice-highlight.png');

  // ── 04. Level 1 fresh (no tutorial, no practice) ─────────────────────
  await skipTutorial(page, { unlockTo: 0 });
  await page.screenshot({ path: path.join(OUT, '04-level1-fresh.png') });
  console.log('✓ 04-level1-fresh.png');

  // ── 05. Level 1 — pair selected with target arrows ───────────────────
  await page.evaluate(() => {
    const cells = document.querySelectorAll('.cell');
    cells[0].click();
    cells[1].click();
  });
  await wait(250);
  await page.screenshot({ path: path.join(OUT, '05-level1-targets.png') });
  console.log('✓ 05-level1-targets.png');

  // ── 06. Win modal ─────────────────────────────────────────────────────
  await page.click('#resetBtn');
  await wait(200);
  await page.evaluate(() => {
    document.getElementById('winMoves').textContent = '18';
    document.getElementById('winSub').innerHTML =
      'First solve.<br><span class="win-unlock">Next level unlocked.</span>';
    document.getElementById('winNextBtn').style.display = '';
    document.getElementById('winOverlay').classList.add('active');
  });
  await wait(400);
  await page.screenshot({ path: path.join(OUT, '06-win-modal.png') });
  console.log('✓ 06-win-modal.png');

  // ── 07. Level 2 fresh ─────────────────────────────────────────────────
  await skipTutorial(page, { unlockTo: 2 });
  await page.evaluate(() => {
    document.querySelectorAll('.level-dot')[1].click();
  });
  await wait(400);
  await page.screenshot({ path: path.join(OUT, '07-level2.png') });
  console.log('✓ 07-level2.png');

  // ── 08. Level 3 (Mind the grays) fresh ───────────────────────────────
  await skipTutorial(page, { unlockTo: 3 });
  await page.evaluate(() => {
    document.querySelectorAll('.level-dot')[2].click();
  });
  await wait(400);
  await page.screenshot({ path: path.join(OUT, '08-level3-grays.png') });
  console.log('✓ 08-level3-grays.png');

  await browser.close();
  console.log('\nAll screenshots saved to', OUT);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
