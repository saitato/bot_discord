const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fetch = require('node-fetch');
const { ensureCanvasFont } = require('./canvasFont');
const {
  getCombatStatLabel,
  getEquipmentIconPath,
  getEquipmentSlotDisplay,
  getSetLabel,
  formatDuration,
  getItemByType,
} = require('./economyItems');

const FONT_FAMILY = ensureCanvasFont();
const WIDTH = 1440;
const HEIGHT = 980;
const SCALE = 2;
const MAX_VISIBLE_ITEMS = 6;
const IMAGE_NAME = 'inventory-board.png';

async function loadImageSafe(src) {
  if (!src) return null;

  try {
    if (/^https?:/i.test(src)) {
      const response = await fetch(src, { timeout: 8000 });
      if (!response.ok) return null;
      const buffer = await response.buffer();
      return await loadImage(buffer);
    }
    return await loadImage(src);
  } catch {
    return null;
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

function fillPanel(ctx, x, y, width, height, fill = '#161922', stroke = '#2a3140', radius = 22) {
  roundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function drawText(ctx, text, x, y, options = {}) {
  const { size = 24, color = '#f8fafc', weight = '400', align = 'left' } = options;
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(String(text || ''), x, y);
}

function drawWrappedText(ctx, text, x, y, maxWidth, options = {}) {
  const { size = 20, color = '#d1d5db', weight = '400', lineHeight = size + 6, maxLines = 2 } = options;
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;

  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (!lines.length) lines.push('');

  lines.slice(0, maxLines).forEach((line, index) => {
    ctx.fillText(line, x, y + (index * lineHeight));
  });
}

function getItemAccent(meta) {
  if (meta?.rarity === 'legendary') return '#ef4444';
  if (meta?.rarity === 'epic') return '#a855f7';
  if (meta?.rarity === 'rare') return '#3b82f6';
  if (meta?.rarity === 'common') return '#94a3b8';
  if (meta?.type === 'guard') return '#f59e0b';
  return '#64748b';
}

function buildItemSubtitle(item, meta) {
  if (meta?.slot && meta?.stat) {
    return [
      `${getEquipmentSlotDisplay(meta.slot)} | ${getSetLabel(meta.set)}`,
      `${getCombatStatLabel(meta.stat)} | Lv ${item.itemLevel || 1} | +${item.upgradeLevel || 0}`,
    ].join(' | ');
  }

  const duration = item.expiresAt > 0 ? formatDuration(item.expiresAt - Date.now()) : 'Vinh vien';
  return `SL ${item.quantity || 0} | ${duration}`;
}

async function renderInventoryBoard(user, items, options = {}) {
  const {
    bagLevel = 1,
    usedSlots = items.length,
    totalSlots = items.length,
  } = options;

  const canvas = createCanvas(WIDTH * SCALE, HEIGHT * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.scale(SCALE, SCALE);

  const avatar = await loadImageSafe(user.displayAvatarURL({ extension: 'png', size: 256 }));

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, '#111827');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  fillPanel(ctx, 36, 36, 330, HEIGHT - 72, '#121826', '#3a4559', 28);
  fillPanel(ctx, 398, 36, WIDTH - 434, HEIGHT - 72, '#101722', '#354155', 28);

  drawText(ctx, user.username, 64, 54, { size: 44, weight: '700' });
  drawText(ctx, 'Ba lô vật phẩm', 66, 112, { size: 28, color: '#f59e0b', weight: '700' });

  if (avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(170, 236, 92, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 78, 144, 184, 184);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(170, 236, 98, 0, Math.PI * 2);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();
  }

  drawText(ctx, `Cấp ba lô: Lv ${bagLevel}`, 66, 364, { size: 28, color: '#f8fafc', weight: '700' });
  drawText(ctx, `Ô đã dùng: ${usedSlots}/${totalSlots}`, 66, 414, { size: 27, color: '#e2e8f0' });
  drawText(ctx, `Còn trống: ${Math.max(totalSlots - usedSlots, 0)}`, 66, 464, { size: 27, color: '#bfdbfe' });
  drawWrappedText(ctx, 'Trang bị boss hiển thị icon theo từng set. Item thường hiển thị ở khung chung để dễ phân biệt.', 66, 546, 250, {
    size: 20,
    color: '#cbd5e1',
    lineHeight: 26,
    maxLines: 4,
  });

  drawText(ctx, 'Vật phẩm trong ba lô', 428, 54, { size: 42, weight: '700' });
  drawText(ctx, `Đang hiển thị tối đa ${MAX_VISIBLE_ITEMS} item đầu để chữ và icon to hơn`, 430, 114, {
    size: 23,
    color: '#cbd5e1',
  });

  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
  const cardWidth = 470;
  const cardHeight = 208;
  const gapX = 30;
  const gapY = 26;
  const startX = 430;
  const startY = 166;

  for (const [index, item] of visibleItems.entries()) {
    const meta = getItemByType(item.type);
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = startX + (col * (cardWidth + gapX));
    const y = startY + (row * (cardHeight + gapY));
    const accent = getItemAccent(meta);

    fillPanel(ctx, x, y, cardWidth, cardHeight, '#172132', '#41506a', 24);
    ctx.fillStyle = accent;
    roundRect(ctx, x + 18, y + 22, 9, 154, 4);
    ctx.fill();

    const iconPath = meta?.slot ? getEquipmentIconPath(meta.slot, meta.set) : null;
    const icon = await loadImageSafe(iconPath);

    fillPanel(ctx, x + 44, y + 34, 118, 118, '#0b1220', '#54627c', 22);
    if (icon) {
      ctx.drawImage(icon, x + 59, y + 49, 88, 88);
    } else {
      drawText(ctx, meta?.slot ? '?' : '📦', x + 103, y + 70, {
        size: 44,
        align: 'center',
        weight: '700',
        color: '#94a3b8',
      });
    }

    drawWrappedText(ctx, meta?.name || item.type, x + 184, y + 34, 250, {
      size: 25,
      weight: '700',
      color: '#f8fafc',
      lineHeight: 30,
      maxLines: 2,
    });

    drawWrappedText(ctx, buildItemSubtitle(item, meta), x + 184, y + 104, 250, {
      size: 19,
      color: '#e2e8f0',
      lineHeight: 24,
      maxLines: 2,
    });

    drawText(ctx, `SL ${item.quantity || 0}`, x + 184, y + 168, {
      size: 22,
      color: '#fbbf24',
      weight: '700',
    });
  }

  if (!visibleItems.length) {
    drawText(ctx, 'Ba lô đang trống', 920, 400, { size: 48, weight: '700', align: 'center' });
    drawText(ctx, 'Hãy vào /shop hoặc đánh boss để kiếm đồ', 920, 468, {
      size: 26,
      color: '#cbd5e1',
      align: 'center',
    });
  }

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: IMAGE_NAME });
}

module.exports = {
  IMAGE_NAME,
  MAX_VISIBLE_ITEMS,
  renderInventoryBoard,
};
