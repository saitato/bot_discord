const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

const OUTPUT_DIR = path.join(__dirname, '../src/game/icon/cards');
const FONT_PATH = path.join(__dirname, '../font/Font-Arial/SVN-Arial Regular.ttf');
const FONT_FAMILY = 'Discordhost Cards';

const SUITS = [
  { code: 'H', symbol: '?', color: '#d62839', label: 'hearts' },
  { code: 'D', symbol: '?', color: '#d62839', label: 'diamonds' },
  { code: 'S', symbol: '?', color: '#111827', label: 'spades' },
  { code: 'C', symbol: '?', color: '#111827', label: 'clubs' },
];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const WIDTH = 420;
const HEIGHT = 600;
const RADIUS = 28;

const PIP_LAYOUTS = {
  '2': [[0.5, 0.23], [0.5, 0.77]],
  '3': [[0.5, 0.2], [0.5, 0.5], [0.5, 0.8]],
  '4': [[0.32, 0.25], [0.68, 0.25], [0.32, 0.75], [0.68, 0.75]],
  '5': [[0.32, 0.25], [0.68, 0.25], [0.5, 0.5], [0.32, 0.75], [0.68, 0.75]],
  '6': [[0.32, 0.23], [0.68, 0.23], [0.32, 0.5], [0.68, 0.5], [0.32, 0.77], [0.68, 0.77]],
  '7': [[0.5, 0.14], [0.32, 0.25], [0.68, 0.25], [0.32, 0.5], [0.68, 0.5], [0.32, 0.75], [0.68, 0.75]],
  '8': [[0.32, 0.18], [0.68, 0.18], [0.32, 0.37], [0.68, 0.37], [0.32, 0.63], [0.68, 0.63], [0.32, 0.82], [0.68, 0.82]],
  '9': [[0.5, 0.12], [0.32, 0.23], [0.68, 0.23], [0.32, 0.41], [0.68, 0.41], [0.5, 0.5], [0.32, 0.77], [0.68, 0.77], [0.5, 0.88]],
  '10': [[0.32, 0.15], [0.68, 0.15], [0.32, 0.31], [0.68, 0.31], [0.32, 0.47], [0.68, 0.47], [0.32, 0.69], [0.68, 0.69], [0.32, 0.85], [0.68, 0.85]],
};

function ensureFont() {
  if (fs.existsSync(FONT_PATH) && !GlobalFonts.has(FONT_FAMILY)) {
    GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY);
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function paintBase(ctx) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.shadowColor = 'rgba(15, 23, 42, 0.28)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, 12, 12, WIDTH - 24, HEIGHT - 24, RADIUS);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#d7dce6';
  ctx.stroke();
}

function drawCorner(ctx, rank, suit, x, y, mirrored = false) {
  ctx.save();
  if (mirrored) {
    ctx.translate(WIDTH, HEIGHT);
    ctx.rotate(Math.PI);
    x = WIDTH - x;
    y = HEIGHT - y;
  }

  ctx.fillStyle = suit.color;
  ctx.textAlign = 'center';
  ctx.font = `700 50px "${FONT_FAMILY}"`;
  ctx.fillText(rank, x, y);
  ctx.font = `700 42px "${FONT_FAMILY}"`;
  ctx.fillText(suit.symbol, x, y + 46);
  ctx.restore();
}

function drawCenterPips(ctx, rank, suit) {
  const pips = PIP_LAYOUTS[rank];
  if (!pips) return false;

  ctx.fillStyle = suit.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 64px "${FONT_FAMILY}"`;

  for (const [px, py] of pips) {
    ctx.fillText(suit.symbol, WIDTH * px, HEIGHT * py);
  }

  return true;
}

function drawFaceCard(ctx, rank, suit) {
  const title = rank === 'A' ? 'A' : rank;
  const centerColor = suit.color === '#111827' ? '#1f2937' : suit.color;

  const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 36, WIDTH / 2, HEIGHT / 2, 180);
  glow.addColorStop(0, suit.color === '#111827' ? '#e5e7eb' : '#ffe3e3');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(60, 100, WIDTH - 120, HEIGHT - 200);

  ctx.strokeStyle = `${centerColor}55`;
  ctx.lineWidth = 5;
  roundRect(ctx, 96, 120, WIDTH - 192, HEIGHT - 240, 22);
  ctx.stroke();

  ctx.fillStyle = centerColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 150px "${FONT_FAMILY}"`;
  ctx.fillText(title, WIDTH / 2, HEIGHT / 2 - 30);
  ctx.font = `700 120px "${FONT_FAMILY}"`;
  ctx.fillText(suit.symbol, WIDTH / 2, HEIGHT / 2 + 92);

  ctx.font = `700 26px "${FONT_FAMILY}"`;
  ctx.fillStyle = '#64748b';
  ctx.fillText('DISCORDHOST', WIDTH / 2, HEIGHT / 2 + 164);
}

function renderCard(rank, suit) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'middle';

  paintBase(ctx);
  drawCorner(ctx, rank, suit, 54, 64, false);
  drawCorner(ctx, rank, suit, 54, 64, true);

  if (!drawCenterPips(ctx, rank, suit)) {
    drawFaceCard(ctx, rank, suit);
  }

  return canvas.toBuffer('image/png');
}

function renderBack() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  paintBase(ctx);

  roundRect(ctx, 40, 40, WIDTH - 80, HEIGHT - 80, 24);
  const gradient = ctx.createLinearGradient(40, 40, WIDTH - 40, HEIGHT - 40);
  gradient.addColorStop(0, '#1d4ed8');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.lineWidth = 6;
  ctx.strokeStyle = '#93c5fd';
  ctx.stroke();

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const cx = 92 + (col * 60) + ((row % 2) * 26);
      const cy = 92 + (row * 56);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = row % 2 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(191,219,254,0.22)';
      ctx.fillRect(-16, -16, 32, 32);
      ctx.restore();
    }
  }

  ctx.fillStyle = '#dbeafe';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 54px "${FONT_FAMILY}"`;
  ctx.fillText('? ?', WIDTH / 2, HEIGHT / 2 - 34);
  ctx.font = `700 34px "${FONT_FAMILY}"`;
  ctx.fillText('DISCORDHOST', WIDTH / 2, HEIGHT / 2 + 30);
  ctx.font = `700 54px "${FONT_FAMILY}"`;
  ctx.fillText('? ?', WIDTH / 2, HEIGHT / 2 + 92);

  return canvas.toBuffer('image/png');
}

function main() {
  ensureFont();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const code = `${rank}${suit.code}`;
      fs.writeFileSync(path.join(OUTPUT_DIR, `${code}.png`), renderCard(rank, suit));
    }
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'back-blue.png'), renderBack());
}

main();
