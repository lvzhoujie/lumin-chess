#!/usr/bin/env node
// Render three Instagram-Story ads (1080×1920, 9:16) for Lumin Chess.
//
// Output: ads/lumin-chess-ad-1-hero.png … ad-3.png. The brand mark in every
// frame matches assets/icon-only.svg and assets/splash.svg: two stones,
// stone-radius offset = 0.583r from the pair's center (≈42% overlap).

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const QRCode = require('qrcode');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'ads');
const URL_TEXT = '100fold.ai';
const URL_FULL = 'https://100fold.ai/';
const WIDTH = 1080;
const HEIGHT = 1920;

const COLORS = {
  cream: '#F5F4F2',
  charcoal: '#1C1B1A',
  indigo: '#4F46E5',
  board: '#D9D6D0',
  midGray: '#7A7770',
  lightGray: '#E6E3DC',
};

// Stone-pair offset ratio: matches icon-only.svg exactly (centers at ±7/12 of
// the stone radius from the pair's midpoint → 98/168, ≈42% horizontal overlap).
const STONE_OFFSET = 7 / 12;

const FONT_STACK = `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, 'Helvetica Neue', Arial, sans-serif`;

const STONE_GRADIENTS = `
  <defs>
    <radialGradient id="black" cx="40%" cy="35%" r="62%">
      <stop offset="0%" stop-color="#5b5853"/>
      <stop offset="50%" stop-color="#2b2926"/>
      <stop offset="100%" stop-color="#0a0908"/>
    </radialGradient>
    <radialGradient id="white" cx="40%" cy="35%" r="62%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#f2efe6"/>
      <stop offset="100%" stop-color="#c5c0af"/>
    </radialGradient>
    <radialGradient id="black-dark" cx="40%" cy="35%" r="62%">
      <stop offset="0%" stop-color="#3a3733"/>
      <stop offset="50%" stop-color="#1c1a18"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <radialGradient id="white-dark" cx="40%" cy="35%" r="62%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="55%" stop-color="#e8e3d5"/>
      <stop offset="100%" stop-color="#b8b3a3"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#7c6ef0" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#4f46e5" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow-dark" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#7c6ef0" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#1C1B1A" stop-opacity="0"/>
    </radialGradient>
  </defs>
`;

// Render the brand mark at (cx, cy) with stone radius r. Always uses the
// icon-only.svg geometry (offset = 0.583r) regardless of where it's placed —
// that's how the ads stay on-brand and consistent with the app launch screen.
function brandMark({ cx, cy, r, dark = false, glow = true }) {
  const offset = r * STONE_OFFSET;
  const blackFill = dark ? 'url(#black-dark)' : 'url(#black)';
  const whiteFill = dark ? 'url(#white-dark)' : 'url(#white)';
  const glowFill = dark ? 'url(#glow-dark)' : 'url(#glow)';
  const parts = [];
  if (glow) {
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r * 2.0}" fill="${glowFill}"/>`);
  }
  parts.push(`<circle cx="${cx - offset}" cy="${cy}" r="${r}" fill="${blackFill}"/>`);
  parts.push(`<circle cx="${cx + offset}" cy="${cy}" r="${r}" fill="${whiteFill}"/>`);
  return parts.join('\n  ');
}

async function qrSvgInner(text, sizePx, dark, light = '#FFFFFF00') {
  const svg = await QRCode.toString(text, {
    type: 'svg',
    color: { dark, light },
    margin: 1,
    errorCorrectionLevel: 'M',
    width: sizePx,
  });
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : `0 0 ${sizePx} ${sizePx}`;
  return { inner, viewBox };
}

// Place the QR + url block centered horizontally at `centerX`, top of the
// tile at `topY`. Returns the SVG snippet; sized so the tile + caption fit
// inside the canvas without any cropping.
function qrBlock({ centerX, topY, qrViewBox, qrInner, tone = 'light' }) {
  const QR_SIZE = 240;
  const PAD = 18;
  const TILE = QR_SIZE + PAD * 2;
  const tileX = centerX - TILE / 2;
  const tileY = topY;
  const tileFill = tone === 'dark' ? COLORS.charcoal : COLORS.cream;
  const tileStroke = tone === 'dark' ? '#3a3733' : COLORS.lightGray;
  const urlFill = tone === 'dark' ? COLORS.cream : COLORS.charcoal;
  const captionFill = COLORS.midGray;
  return `
  <g>
    <rect x="${tileX}" y="${tileY}" width="${TILE}" height="${TILE}" rx="22"
          fill="${tileFill}" stroke="${tileStroke}" stroke-width="1.5"/>
    <svg x="${tileX + PAD}" y="${tileY + PAD}" width="${QR_SIZE}" height="${QR_SIZE}" viewBox="${qrViewBox}">
      ${qrInner}
    </svg>
    <text x="${centerX}" y="${tileY + TILE + 64}" text-anchor="middle"
          font-family="${FONT_STACK}" font-weight="600" font-size="48"
          letter-spacing="-1" fill="${urlFill}">${URL_TEXT}</text>
    <text x="${centerX}" y="${tileY + TILE + 100}" text-anchor="middle"
          font-family="${FONT_STACK}" font-weight="500" font-size="20"
          letter-spacing="4" fill="${captionFill}">SCAN · FREE · NO INSTALL</text>
  </g>`;
}

async function makeAd1() {
  // Cream hero — brand mark, wordmark, tagline, sub copy, URL + QR.
  const qr = await qrSvgInner(URL_FULL, 240, COLORS.charcoal);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  ${STONE_GRADIENTS}
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.cream}"/>
  <radialGradient id="vignette" cx="50%" cy="40%" r="60%">
    <stop offset="55%" stop-color="${COLORS.cream}" stop-opacity="0"/>
    <stop offset="100%" stop-color="${COLORS.lightGray}" stop-opacity="0.6"/>
  </radialGradient>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#vignette)"/>

  <!-- Brand mark -->
  ${brandMark({ cx: 540, cy: 700, r: 220 })}

  <!-- Wordmark -->
  <text x="540" y="1100" text-anchor="middle"
        font-family="${FONT_STACK}" font-weight="300" font-size="120"
        letter-spacing="-3" fill="${COLORS.charcoal}">Lumin Chess</text>

  <!-- Tagline -->
  <text x="540" y="1175" text-anchor="middle"
        font-family="${FONT_STACK}" font-weight="600" font-size="24"
        letter-spacing="7" fill="${COLORS.indigo}">QUIET PUZZLES · BRIGHT MINDS</text>

  <!-- Sub copy -->
  <text x="540" y="1265" text-anchor="middle"
        font-family="${FONT_STACK}" font-weight="400" font-size="32"
        fill="${COLORS.midGray}">A sliding pair puzzle.</text>
  <text x="540" y="1310" text-anchor="middle"
        font-family="${FONT_STACK}" font-weight="400" font-size="32"
        fill="${COLORS.midGray}">10 levels. Free to play.</text>

  ${qrBlock({ centerX: 540, topY: 1430, qrViewBox: qr.viewBox, qrInner: qr.inner })}
</svg>`;
}

async function makeAd2() {
  // Show the actual game board with a swipe-guide trace.
  const qr = await qrSvgInner(URL_FULL, 240, COLORS.charcoal);
  // Centered 3x3 board in the upper half.
  const boardSize = 720;
  const boardX = (WIDTH - boardSize) / 2;
  const boardY = 540;
  const pad = 28;
  const gap = 22;
  const cellSize = (boardSize - pad * 2 - gap * 2) / 3;
  // Mid-game state — after one L-down: top-left BB slid into row 1.
  const grid = [
    [null, null, 'B'],
    ['B',  'B',  null],
    ['W',  'W',  'W'],
  ];
  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cx = boardX + pad + (cellSize + gap) * c + cellSize / 2;
      const cy = boardY + pad + (cellSize + gap) * r + cellSize / 2;
      const x = boardX + pad + (cellSize + gap) * c;
      const y = boardY + pad + (cellSize + gap) * r;
      cells.push(`<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="28" fill="#FFFFFF"/>`);
      const v = grid[r][c];
      if (v === 'B') {
        cells.push(`<circle cx="${cx}" cy="${cy}" r="${cellSize * 0.36}" fill="url(#black)"/>`);
      } else if (v === 'W') {
        cells.push(`<circle cx="${cx}" cy="${cy}" r="${cellSize * 0.36}" fill="url(#white)"/>`);
      }
    }
  }
  // Swipe guide showing the next move: vertical pair (1,0)+(2,0) sliding up.
  const trailA = { x: boardX + pad + cellSize/2, y: boardY + pad + (cellSize+gap)*2 + cellSize/2 };
  const trailB = { x: boardX + pad + cellSize/2, y: boardY + pad + cellSize/2 };
  const trail = `<path d="M ${trailA.x} ${trailA.y} L ${trailB.x} ${trailB.y}"
                       stroke="${COLORS.indigo}" stroke-opacity="0.55" stroke-width="14"
                       stroke-linecap="round" stroke-dasharray="6 22" fill="none"/>
                 <circle cx="${trailB.x}" cy="${trailB.y - 4}" r="22" fill="${COLORS.indigo}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  ${STONE_GRADIENTS}
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.cream}"/>

  <!-- Brand mark at top, same geometry as the icon -->
  ${brandMark({ cx: 540, cy: 290, r: 90, glow: false })}
  <text x="540" y="450" text-anchor="middle"
        font-family="${FONT_STACK}" font-weight="600" font-size="22"
        letter-spacing="6" fill="${COLORS.midGray}">LUMIN CHESS</text>

  <!-- Board -->
  <rect x="${boardX}" y="${boardY}" width="${boardSize}" height="${boardSize}" rx="44" fill="${COLORS.board}"/>
  ${cells.join('\n  ')}
  ${trail}

  <!-- Headline below the board -->
  <text x="540" y="1370" text-anchor="middle"
        font-family="${FONT_STACK}" font-weight="700" font-size="74"
        letter-spacing="-2" fill="${COLORS.charcoal}">Slide pairs.</text>
  <text x="540" y="1450" text-anchor="middle"
        font-family="${FONT_STACK}" font-weight="700" font-size="74"
        letter-spacing="-2" fill="${COLORS.charcoal}">Solve the pattern.</text>

  ${qrBlock({ centerX: 540, topY: 1530, qrViewBox: qr.viewBox, qrInner: qr.inner })}
</svg>`;
}

async function makeAd3() {
  // Dark/charcoal challenge variant.
  const qr = await qrSvgInner(URL_FULL, 240, COLORS.cream);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  ${STONE_GRADIENTS}
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.charcoal}"/>
  <radialGradient id="darkbg" cx="50%" cy="30%" r="55%">
    <stop offset="0%" stop-color="#2d2a45" stop-opacity="0.5"/>
    <stop offset="100%" stop-color="${COLORS.charcoal}" stop-opacity="0"/>
  </radialGradient>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#darkbg)"/>

  <!-- Brand mark, same geometry, dark-stone variant -->
  ${brandMark({ cx: 540, cy: 540, r: 170, dark: true })}

  <!-- Brand label -->
  <text x="540" y="810" text-anchor="middle"
        font-family="${FONT_STACK}" font-weight="600" font-size="22"
        letter-spacing="7" fill="${COLORS.indigo}">LUMIN CHESS</text>

  <!-- Headline -->
  <text x="540" y="965" text-anchor="middle"
        font-family="${FONT_STACK}" font-weight="300" font-size="120"
        letter-spacing="-3" fill="${COLORS.cream}">Climb the board.</text>

  <!-- Stat trio -->
  <g font-family="${FONT_STACK}" fill="${COLORS.cream}">
    <text x="220" y="1130" text-anchor="middle" font-weight="700" font-size="100" letter-spacing="-2.5">10</text>
    <text x="220" y="1180" text-anchor="middle" font-weight="500" font-size="20" letter-spacing="5" fill="${COLORS.midGray}">LEVELS</text>

    <text x="540" y="1130" text-anchor="middle" font-weight="700" font-size="100" letter-spacing="-2.5">100</text>
    <text x="540" y="1180" text-anchor="middle" font-weight="500" font-size="20" letter-spacing="5" fill="${COLORS.midGray}">TOP RANKS</text>

    <text x="860" y="1130" text-anchor="middle" font-weight="700" font-size="100" letter-spacing="-2.5">∞</text>
    <text x="860" y="1180" text-anchor="middle" font-weight="500" font-size="20" letter-spacing="5" fill="${COLORS.midGray}">REPLAY</text>
  </g>

  <!-- Sub copy -->
  <text x="540" y="1280" text-anchor="middle"
        font-family="${FONT_STACK}" font-weight="400" font-size="30"
        fill="${COLORS.midGray}">Solve every level. Beat your best time.</text>

  ${qrBlock({ centerX: 540, topY: 1430, qrViewBox: qr.viewBox, qrInner: qr.inner, tone: 'dark' })}
</svg>`;
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const builders = [
    { name: 'lumin-chess-ad-1-hero.png', build: makeAd1 },
    { name: 'lumin-chess-ad-2-puzzle.png', build: makeAd2 },
    { name: 'lumin-chess-ad-3-leaderboard.png', build: makeAd3 },
  ];
  for (const job of builders) {
    const svg = await job.build();
    const outPath = path.join(OUT_DIR, job.name);
    await sharp(Buffer.from(svg), { density: 200 })
      .resize(WIDTH, HEIGHT, { fit: 'cover' })
      .png({ quality: 95 })
      .toFile(outPath);
    console.log(`✓ ${path.relative(ROOT, outPath)} (${WIDTH}×${HEIGHT})`);
  }
})();
