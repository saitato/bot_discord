const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

const OUT_DIR = path.join(__dirname, '../src/game/icon/item');
const FONT_PATH = path.join(__dirname, '../font/Font-Arial/SVN-Arial Regular.ttf');
const FONT_FAMILY = 'Discordhost Item Icons';
const SIZE = 128;

if (fs.existsSync(FONT_PATH) && !GlobalFonts.has(FONT_FAMILY)) {
  GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY);
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

function createBase(bg1, bg2) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  gradient.addColorStop(0, bg1);
  gradient.addColorStop(1, bg2);
  ctx.shadowColor = 'rgba(15,23,42,0.24)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, 8, 8, 112, 112, 24);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.stroke();
  return { canvas, ctx };
}

function saveIcon(name, painter) {
  const { canvas, ctx } = createBase(painter.bg1, painter.bg2);
  painter.draw(ctx);
  fs.writeFileSync(path.join(OUT_DIR, `${name}.png`), canvas.toBuffer('image/png'));
}

function drawCamera(ctx) {
  ctx.fillStyle = '#e2e8f0';
  roundRect(ctx, 28, 42, 72, 44, 12);
  ctx.fill();
  ctx.fillRect(42, 32, 20, 12);
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(64, 64, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#60a5fa';
  ctx.beginPath();
  ctx.arc(64, 64, 9, 0, Math.PI * 2);
  ctx.fill();
}

function drawLock(ctx, shield = false) {
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(64, 48, 18, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, 34, 50, 60, 42, 12);
  ctx.fill();
  if (shield) {
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.moveTo(64, 42);
    ctx.lineTo(82, 50);
    ctx.lineTo(78, 72);
    ctx.lineTo(64, 86);
    ctx.lineTo(50, 72);
    ctx.lineTo(46, 50);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(64, 68, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(61, 68, 6, 12);
  }
}

function drawPick(ctx) {
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(36, 86);
  ctx.lineTo(88, 34);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(34, 82);
  ctx.lineTo(48, 96);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(86, 36);
  ctx.lineTo(98, 24);
  ctx.lineTo(106, 32);
  ctx.lineTo(94, 44);
  ctx.stroke();
}

function drawStone(ctx, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(64, 24);
  ctx.lineTo(94, 44);
  ctx.lineTo(84, 88);
  ctx.lineTo(44, 98);
  ctx.lineTo(26, 56);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.38)';
  ctx.beginPath();
  ctx.moveTo(52, 46);
  ctx.lineTo(72, 36);
  ctx.lineTo(82, 52);
  ctx.stroke();
}

function drawArmor(ctx) {
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(46, 28);
  ctx.lineTo(82, 28);
  ctx.lineTo(96, 44);
  ctx.lineTo(88, 96);
  ctx.lineTo(40, 96);
  ctx.lineTo(32, 44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(58, 34, 12, 56);
}

function drawGloves(ctx) {
  ctx.fillStyle = '#e2e8f0';
  roundRect(ctx, 30, 50, 26, 44, 10);
  ctx.fill();
  roundRect(ctx, 72, 38, 26, 56, 10);
  ctx.fill();
  ctx.fillRect(36, 40, 14, 12);
  ctx.fillRect(78, 28, 14, 12);
}

function drawBox(ctx) {
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 5;
  roundRect(ctx, 30, 40, 68, 52, 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(30, 52);
  ctx.lineTo(64, 72);
  ctx.lineTo(98, 52);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(64, 72);
  ctx.lineTo(64, 92);
  ctx.stroke();
}

fs.mkdirSync(OUT_DIR, { recursive: true });

saveIcon('camera', { bg1: '#1d4ed8', bg2: '#0f172a', draw: drawCamera });
saveIcon('lock-basic', { bg1: '#475569', bg2: '#0f172a', draw: (ctx) => drawLock(ctx, false) });
saveIcon('lock-smart', { bg1: '#0891b2', bg2: '#0f172a', draw: (ctx) => drawLock(ctx, true) });
saveIcon('lockpick', { bg1: '#7c3aed', bg2: '#1e1b4b', draw: drawPick });
saveIcon('stone-common', { bg1: '#64748b', bg2: '#1e293b', draw: (ctx) => drawStone(ctx, '#cbd5e1') });
saveIcon('stone-rare', { bg1: '#2563eb', bg2: '#172554', draw: (ctx) => drawStone(ctx, '#7dd3fc') });
saveIcon('stone-epic', { bg1: '#7c3aed', bg2: '#3b0764', draw: (ctx) => drawStone(ctx, '#d8b4fe') });
saveIcon('stone-legendary', { bg1: '#ca8a04', bg2: '#78350f', draw: (ctx) => drawStone(ctx, '#fde68a') });
saveIcon('armor-generic', { bg1: '#475569', bg2: '#111827', draw: drawArmor });
saveIcon('gloves-generic', { bg1: '#0f766e', bg2: '#134e4a', draw: drawGloves });
saveIcon('box-generic', { bg1: '#334155', bg2: '#0f172a', draw: drawBox });
