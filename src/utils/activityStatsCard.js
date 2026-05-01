const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fetch = require('node-fetch');
const { ensureCanvasFont } = require('./canvasFont');

const FONT_FAMILY = ensureCanvasFont();
const WIDTH = 1280;
const HEIGHT = 706;
const SCALE = 1;
const IMAGE_NAME = 'activity-stats.png';

async function loadImageSafe(src) {
  if (!src) return null;

  try {
    const response = await fetch(src, { timeout: 8000 });
    if (!response.ok) return null;
    return await loadImage(await response.buffer());
  } catch {
    return null;
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillPanel(ctx, x, y, width, height, fill = '#30343a', radius = 18) {
  roundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 6;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function drawText(ctx, text, x, y, options = {}) {
  const {
    size = 28,
    color = '#d7d9dd',
    weight = '700',
    style = '',
    align = 'left',
    maxWidth = null,
  } = options;

  ctx.font = `${style} ${weight} ${size}px ${FONT_FAMILY}`.trim();
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';

  let output = String(text ?? '');
  if (maxWidth) {
    while (ctx.measureText(output).width > maxWidth && output.length > 1) {
      output = output.slice(0, -2);
    }
    if (output !== String(text ?? '')) output += '.';
  }

  ctx.fillText(output, x, y);
}

function drawJoinedValueUnit(ctx, value, unit, x, y, options = {}) {
  const {
    valueSize = 28,
    unitSize = 23,
    color = '#dfe2e6',
    gap = 8,
    maxWidth = 220,
  } = options;
  const valueText = String(value ?? '');
  const unitText = String(unit ?? '');

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.font = `500 ${valueSize}px ${FONT_FAMILY}`;
  ctx.fillText(valueText, x, y);

  const unitX = x + Math.min(ctx.measureText(valueText).width + gap, maxWidth);
  ctx.font = `italic 400 ${unitSize}px ${FONT_FAMILY}`;
  ctx.fillText(unitText, unitX, y + Math.max(0, valueSize - unitSize - 1));
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function formatHours(seconds) {
  const hours = Math.max(0, Number(seconds || 0)) / 3600;
  if (hours < 10) return hours.toFixed(2).replace(/\.?0+$/, '');
  return hours.toFixed(1).replace(/\.0$/, '');
}

function formatDate(date) {
  if (!date) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function drawHeaderBox(ctx, x, y, title, value, width = 160) {
  fillPanel(ctx, x, y + 28, width, 62, '#2f3339', 8);
  fillPanel(ctx, x + 10, y, width - 20, 40, '#59606b', 8);
  drawText(ctx, title, x + width / 2, y + 8, {
    size: 24,
    color: '#eceef2',
    weight: '800',
    align: 'center',
  });
  drawText(ctx, value, x + 20, y + 50, {
    size: 26,
    color: '#d9dadd',
    weight: '500',
    maxWidth: width - 40,
  });
}

function drawStatRow(ctx, x, y, label, value, unit) {
  fillPanel(ctx, x, y, 370, 48, '#1f2226', 7);
  fillPanel(ctx, x, y, 96, 48, '#181b1e', 7);
  drawText(ctx, label, x + 48, y + 7, {
    size: 30,
    color: '#dfe2e6',
    weight: '800',
    align: 'center',
  });
  drawJoinedValueUnit(ctx, value, unit, x + 116, y + 8, {
    valueSize: 28,
    unitSize: 23,
    maxWidth: 210,
  });
}

function drawRankRow(ctx, x, y, label, value) {
  fillPanel(ctx, x, y, 370, 74, '#202327', 7);
  fillPanel(ctx, x, y, 178, 74, '#191c20', 7);
  drawText(ctx, label, x + 89, y + 18, {
    size: 30,
    color: '#e1e3e7',
    weight: '800',
    align: 'center',
  });
  drawText(ctx, value ? `#${value}` : 'N/A', x + 286, y + 18, {
    size: 30,
    color: '#d7d9dd',
    weight: '600',
    align: 'center',
  });
}

function drawChannelRow(ctx, x, y, icon, label, value, unit) {
  return;
  drawText(ctx, icon, x, y + 8, {
    size: 36,
    color: '#d7d9dd',
    weight: '800',
    align: 'center',
  });
  fillPanel(ctx, x + 70, y, 515, 50, '#1f2226', 7);
  fillPanel(ctx, x + 70, y, 260, 50, '#181b1e', 7);
  drawText(ctx, label || 'No data', x + 95, y + 10, {
    size: 24,
    color: '#e5e7eb',
    weight: '800',
    maxWidth: 210,
  });
  drawText(ctx, value, x + 345, y + 10, {
    size: 26,
    color: '#dfe2e6',
    weight: '500',
    maxWidth: 108,
  });
  drawText(ctx, unit, x + 455, y + 15, {
    size: 21,
    color: '#dfe2e6',
    weight: '400',
    style: 'italic',
    maxWidth: 110,
  });
}

function drawCompactInfoRow(ctx, x, y, label, value) {
  fillPanel(ctx, x, y, 270, 43, '#1f2226', 7);
  fillPanel(ctx, x, y, 118, 43, '#181b1e', 7);
  drawText(ctx, label, x + 14, y + 10, {
    size: 18,
    color: '#dfe2e6',
    weight: '800',
    maxWidth: 94,
  });
  drawText(ctx, value, x + 132, y + 10, {
    size: 18,
    color: '#dfe2e6',
    weight: '600',
    maxWidth: 122,
  });
}

function drawTopChannelIcon(ctx, icon, x, y) {
  ctx.save();
  ctx.strokeStyle = '#d7d9dd';
  ctx.fillStyle = '#d7d9dd';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (icon === 'voice') {
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 7);
    ctx.lineTo(x - 5, y - 7);
    ctx.lineTo(x + 3, y - 15);
    ctx.lineTo(x + 3, y + 15);
    ctx.lineTo(x - 5, y + 7);
    ctx.lineTo(x - 12, y + 7);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + 8, y, 11, -0.75, 0.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 12, y, 18, -0.7, 0.7);
    ctx.stroke();
  } else if (icon === 'app') {
    roundRect(ctx, x - 15, y - 8, 30, 16, 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 8);
    ctx.lineTo(x - 2, y - 14);
    ctx.moveTo(x + 5, y - 8);
    ctx.lineTo(x + 8, y - 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - 7, y, 2.5, 0, Math.PI * 2);
    ctx.arc(x + 7, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 15, y + 4);
    ctx.lineTo(x - 22, y + 8);
    ctx.moveTo(x + 15, y + 4);
    ctx.lineTo(x + 22, y + 8);
    ctx.stroke();
  } else {
    drawText(ctx, '#', x, y - 18, {
      size: 32,
      color: '#d7d9dd',
      weight: '800',
      align: 'center',
    });
  }

  ctx.restore();
}

function drawTopChannelStyleRow(ctx, x, y, icon, label, value, unit) {
  drawTopChannelIcon(ctx, icon, x, y + 25);
  const rowX = x + 44;
  fillPanel(ctx, rowX, y, 500, 50, '#1f2226', 7);
  fillPanel(ctx, rowX, y, 290, 50, '#181b1e', 7);
  drawText(ctx, label || 'N/A', rowX + 20, y + 11, {
    size: 22,
    color: '#e5e7eb',
    weight: '800',
    maxWidth: 245,
  });
  drawJoinedValueUnit(ctx, value, unit, rowX + 312, y + 12, {
    valueSize: 26,
    unitSize: 20,
    maxWidth: 160,
  });
}

function drawLine(ctx, chart, x, y, width, height, field, color) {
  const maxValue = Math.max(...chart.map((entry) => entry[field] || 0), 1);
  const step = width / Math.max(chart.length - 1, 1);
  const points = chart.map((entry, index) => ({
    x: x + index * step,
    y: y + height - ((entry[field] || 0) / maxValue) * height,
  }));

  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();

  if (points.length === 1) {
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[0].x + 1, points[0].y);
  } else {
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i += 1) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    const last = points[points.length - 1];
    const beforeLast = points[points.length - 2];
    ctx.quadraticCurveTo(beforeLast.x, beforeLast.y, last.x, last.y);
  }

  ctx.stroke();
}

function drawChart(ctx, x, y, width, height, chart) {
  fillPanel(ctx, x, y, width, height, '#30343a', 16);
  drawText(ctx, 'Charts', x + 16, y + 14, { size: 30, color: '#d7d9dd', weight: '800' });

  ctx.beginPath();
  ctx.arc(x + width - 300, y + 26, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#35c75a';
  ctx.fill();
  drawText(ctx, 'Message', x + width - 276, y + 12, { size: 27, color: '#d7d9dd', weight: '800' });

  ctx.beginPath();
  ctx.arc(x + width - 132, y + 26, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#df5897';
  ctx.fill();
  drawText(ctx, 'Voice', x + width - 108, y + 12, { size: 27, color: '#d7d9dd', weight: '800' });

  drawLine(ctx, chart, x + 20, y + 82, width - 40, height - 92, 'messages', '#35c75a');
  drawLine(ctx, chart, x + 20, y + 82, width - 40, height - 92, 'voiceSeconds', '#df5897');
}

async function renderActivityStatsCard(user, data) {
  const canvas = createCanvas(WIDTH * SCALE, HEIGHT * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = '#222528';
  roundRect(ctx, 0, 0, WIDTH, HEIGHT, 34);
  ctx.fill();

  const avatar = await loadImageSafe(user.displayAvatarURL({ extension: 'png', size: 128 }));
  if (avatar) {
    ctx.save();
    roundRect(ctx, 20, 20, 90, 90, 24);
    ctx.clip();
    ctx.drawImage(avatar, 20, 20, 90, 90);
    ctx.restore();
  }

  drawText(ctx, data.displayName, 124, 24, {
    size: 36,
    color: '#f1f3f5',
    weight: '800',
    maxWidth: 270,
  });
  drawText(ctx, user.username, 390, 32, {
    size: 26,
    color: '#c8cbd0',
    weight: '500',
    maxWidth: 200,
  });
  drawText(ctx, data.guildName, 124, 70, {
    size: 32,
    color: '#cfd2d7',
    weight: '800',
    style: 'italic',
    maxWidth: 360,
  });

  drawHeaderBox(ctx, 652, 20, 'Created On', formatDate(user.createdAt), 330);
  drawHeaderBox(ctx, 1000, 20, 'Joined On', formatDate(data.joinedAt), 260);

  fillPanel(ctx, 20, 130, 400, 244, '#30343a', 18);
  drawText(ctx, 'Server Ranks', 36, 144, { size: 30, color: '#d7d9dd', weight: '800' });
  drawText(ctx, '🏆', 372, 142, { size: 32, color: '#d7d9dd', weight: '800', align: 'center' });
  drawRankRow(ctx, 35, 193, 'Message', data.ranks.message);
  drawRankRow(ctx, 35, 282, 'Voice', data.ranks.voice);

  fillPanel(ctx, 440, 130, 400, 244, '#30343a', 18);
  drawText(ctx, 'Messages', 456, 144, { size: 30, color: '#d7d9dd', weight: '800' });
  drawText(ctx, '#', 808, 139, { size: 46, color: '#d7d9dd', weight: '500', align: 'center' });
  drawStatRow(ctx, 455, 187, '1d', formatNumber(data.messages.day), 'messages');
  drawStatRow(ctx, 455, 247, '7d', formatNumber(data.messages.week), 'messages');
  drawStatRow(ctx, 455, 307, '14d', formatNumber(data.messages.fourteenDays), 'messages');

  fillPanel(ctx, 860, 130, 400, 244, '#30343a', 18);
  drawText(ctx, 'Voice Activity', 876, 144, { size: 30, color: '#d7d9dd', weight: '800' });
  drawText(ctx, '🔊', 1220, 141, { size: 32, color: '#d7d9dd', weight: '800', align: 'center' });
  drawStatRow(ctx, 875, 187, '1d', formatHours(data.voice.daySeconds), 'hours');
  drawStatRow(ctx, 875, 247, '7d', formatHours(data.voice.weekSeconds), 'hours');
  drawStatRow(ctx, 875, 307, '14d', formatHours(data.voice.fourteenDaySeconds), 'hours');

  fillPanel(ctx, 20, 394, 610, 242, '#30343a', 18);
  drawText(ctx, 'Top Channels & Totals', 36, 408, { size: 30, color: '#d7d9dd', weight: '800' });
  drawText(ctx, '↗', 588, 404, { size: 42, color: '#d7d9dd', weight: '500', align: 'center' });
  drawChannelRow(
    ctx,
    56,
    511,
    '🔊',
    data.topChannels.voice?.name || 'No voice data',
    formatHours(data.topChannels.voice?.value || 0),
    'hours'
  );
  drawChannelRow(
    ctx,
    56,
    571,
    '+',
    ' ',
    '',
    ''
  );

  fillPanel(ctx, 34, 444, 578, 178, '#30343a', 8);
  drawTopChannelStyleRow(
    ctx,
    52,
    452,
    'message',
    data.topChannels.messages?.name || 'N/A',
    formatNumber(data.topChannels.messages?.value || 0),
    'messages'
  );
  drawTopChannelStyleRow(
    ctx,
    52,
    510,
    'voice',
    data.topChannels.voice?.name || 'N/A',
    formatHours(data.topChannels.voice?.value || 0),
    'hours'
  );
  drawTopChannelStyleRow(
    ctx,
    52,
    568,
    'app',
    'Total',
    formatNumber(data.messages.total),
    `msg | ${formatHours(data.voice.totalSeconds)}h`
  );

  drawChart(ctx, 650, 394, 610, 242, data.chart);

  drawText(ctx, 'Server Lookback: Last 14 days - Timezone: Asia/Ho_Chi_Minh', 26, 660, {
    size: 24,
    color: '#d7d9dd',
    weight: '700',
  });
  drawText(ctx, 'By Saitato', 1116, 658, {
    size: 24,
    color: '#d7d9dd',
    weight: '500',
  });

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: IMAGE_NAME });
}

module.exports = {
  IMAGE_NAME,
  renderActivityStatsCard,
};
