const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fetch = require('node-fetch');
const { ensureCanvasFont } = require('./canvasFont');
const {
  EQUIPMENT_SLOTS,
  getCombatStatLabel,
  getEquipmentIconPath,
  getEquipmentSlotDisplay,
  getSetLabel,
} = require('./economyItems');

const FONT_FAMILY = ensureCanvasFont();
const WIDTH = 1440;
const HEIGHT = 980;
const SCALE = 2;
const PADDING = 38;
const IMAGE_NAME = 'equipment-board.png';

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
  const {
    size = 24,
    color = '#f3f4f6',
    weight = '400',
    align = 'left',
  } = options;

  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(String(text || ''), x, y);
}

function drawWrappedText(ctx, text, x, y, maxWidth, options = {}) {
  const {
    size = 22,
    color = '#d1d5db',
    weight = '400',
    lineHeight = size + 8,
    maxLines = 3,
  } = options;

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
      continue;
    }

    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines - 1) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (!lines.length) lines.push('');

  lines.forEach((line, index) => {
    const output = index === maxLines - 1 && words.join(' ').length > lines.join(' ').length
      ? `${line.slice(0, Math.max(0, line.length - 2))}..`
      : line;
    ctx.fillText(output, x, y + (index * lineHeight));
  });
}

function getSlotEntries(profile) {
  return EQUIPMENT_SLOTS.map((slot) => ({
    slot,
    entry: profile.equippedItems[slot] || null,
  }));
}

function formatSetBonuses(profile) {
  if (!profile.activeSetBonuses.length) return 'Chưa kích hoạt set';

  return profile.activeSetBonuses
    .map((bonus) => {
      const stats = Object.entries(bonus.stats)
        .map(([stat, value]) => `${getCombatStatLabel(stat)} +${value}`)
        .join(' | ');
      return `${getSetLabel(bonus.setKey)} (${bonus.pieces}): ${stats}`;
    })
    .join(' | ');
}

async function renderEquipmentBoard(user, profile) {
  const canvas = createCanvas(WIDTH * SCALE, HEIGHT * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.scale(SCALE, SCALE);

  const avatar = await loadImageSafe(user.displayAvatarURL({ extension: 'png', size: 256 }));
  const slotEntries = getSlotEntries(profile);

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, '#0b1220');
  gradient.addColorStop(1, '#111827');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  fillPanel(ctx, PADDING, PADDING, 404, HEIGHT - (PADDING * 2), '#121826', '#3a4559', 28);
  fillPanel(ctx, 470, PADDING, WIDTH - 508, HEIGHT - (PADDING * 2), '#101722', '#354155', 28);

  drawText(ctx, user.username, 72, 56, { size: 48, weight: '700' });
  drawText(ctx, `LV ${profile.level}`, 74, 118, { size: 28, color: '#fbbf24', weight: '700' });

  if (avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(176, 254, 102, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 74, 152, 204, 204);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(176, 254, 108, 0, Math.PI * 2);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();
  }

  const statLines = [
    `Sát thương: ${profile.stats.totalMin} - ${profile.stats.totalMax}`,
    `Crit: ${profile.stats.crit}% | Crit DMG: ${profile.stats.critDamagePercent}%`,
    `HP: ${profile.stats.hp} | DEF: ${profile.stats.def}`,
    `ATK: +${profile.stats.atk} | ATK%: ${profile.stats.atkPercent}%`,
    `Tốc đánh: ${profile.stats.attackSpeed}% | Hồi chiêu: ${profile.stats.cooldownReduction}%`,
    `Né tránh: ${profile.stats.dodge}% | Hút máu: ${profile.stats.lifesteal}%`,
    `Xuyên giáp: ${profile.stats.armorPen}% | ST kỹ năng: ${profile.stats.skillDamage}%`,
  ];

  drawText(ctx, 'Chỉ số', 66, 394, { size: 32, weight: '700', color: '#f8fafc' });
  statLines.forEach((line, index) => {
    drawWrappedText(ctx, line, 66, 444 + (index * 52), 306, {
      size: 22,
      color: '#e2e8f0',
      lineHeight: 26,
      maxLines: 2,
    });
  });

  drawText(ctx, 'Set đang kích hoạt', 66, 824, { size: 26, weight: '700', color: '#f8fafc' });
  drawWrappedText(ctx, formatSetBonuses(profile), 66, 868, 310, {
    size: 19,
    color: '#bfdbfe',
    lineHeight: 24,
    maxLines: 3,
  });

  drawText(ctx, 'Bảng trang bị', 512, 56, { size: 42, weight: '700' });
  drawText(ctx, 'Icon từng món đổi theo set đang mặc', 514, 114, {
    size: 23,
    color: '#cbd5e1',
  });

  const startX = 510;
  const startY = 176;
  const cardWidth = 402;
  const cardHeight = 214;
  const gapX = 34;
  const gapY = 30;

  for (const [index, slotInfo] of slotEntries.entries()) {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = startX + (col * (cardWidth + gapX));
    const y = startY + (row * (cardHeight + gapY));
    const entry = slotInfo.entry;

    fillPanel(ctx, x, y, cardWidth, cardHeight, '#172132', '#41506a', 24);
    drawText(ctx, getEquipmentSlotDisplay(slotInfo.slot), x + 30, y + 22, {
      size: 25,
      weight: '700',
      color: '#f8fafc',
    });

    if (!entry) {
      drawText(ctx, 'Trống', x + 30, y + 92, { size: 36, weight: '700', color: '#7c8ea8' });
      drawText(ctx, 'Chưa mặc trang bị', x + 30, y + 142, { size: 22, color: '#b6c2d1' });
      continue;
    }

    const iconPath = getEquipmentIconPath(entry.meta.slot, entry.meta.set);
    const icon = await loadImageSafe(iconPath);
    if (icon) {
      fillPanel(ctx, x + 26, y + 72, 114, 114, '#0b1220', '#54627c', 22);
      ctx.drawImage(icon, x + 39, y + 85, 88, 88);
    }

    drawWrappedText(ctx, entry.meta.name.replace(/^\S+\s/, ''), x + 158, y + 74, 214, {
      size: 25,
      weight: '700',
      color: '#f8fafc',
      lineHeight: 30,
      maxLines: 2,
    });

    drawText(ctx, `Lv ${entry.itemLevel}  +${entry.upgradeLevel || 0}`, x + 158, y + 136, {
      size: 22,
      color: '#fbbf24',
      weight: '700',
    });

    drawText(ctx, getSetLabel(entry.meta.set), x + 158, y + 168, {
      size: 20,
      color: '#bfdbfe',
      weight: '700',
    });

    const statText = `${getCombatStatLabel(entry.meta.stat)} +${entry.statValue}`;
    drawWrappedText(ctx, statText, x + 26, y + 188, cardWidth - 52, {
      size: 20,
      color: '#e2e8f0',
      lineHeight: 24,
      maxLines: 1,
    });
  }

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: IMAGE_NAME });
}

module.exports = {
  IMAGE_NAME,
  renderEquipmentBoard,
};
