const fs = require('node:fs');
const path = require('node:path');
const { createCanvas } = require('@napi-rs/canvas');
const { ensureCanvasFont } = require('../src/utils/canvasFont');

const FONT_FAMILY = ensureCanvasFont();
const OUTPUT_DIR = path.join(__dirname, '..', 'preview-output');
const WIDTH = 1100;
const HEIGHT = 420;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
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

function drawAvatar(ctx, centerX, centerY, radius, palette) {
  const gradient = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
  gradient.addColorStop(0, palette.avatarStart);
  gradient.addColorStop(1, palette.avatarEnd);

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(centerX, centerY - 22, radius * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX, centerY + 38, radius * 0.42, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 6, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBadge(ctx, x, y, text, palette) {
  ctx.font = `bold 24px ${FONT_FAMILY}`;
  const width = ctx.measureText(text).width + 34;
  roundRect(ctx, x, y, width, 42, 20);
  ctx.fillStyle = palette.badgeBg;
  ctx.fill();
  ctx.fillStyle = palette.badgeText;
  ctx.fillText(text, x + 17, y + 28);
}

function drawInfoLines(ctx, lines, startX, startY, palette) {
  ctx.font = `24px ${FONT_FAMILY}`;
  lines.forEach((line, index) => {
    ctx.fillStyle = palette.infoColor;
    ctx.fillText(line, startX, startY + index * 34);
  });
}

function drawStyleA(ctx, mode) {
  const palette = mode === 'welcome'
    ? {
        bg1: '#081528',
        bg2: '#163f68',
        glow: 'rgba(101, 203, 255, 0.24)',
        card: 'rgba(10, 25, 42, 0.78)',
        border: 'rgba(166, 225, 255, 0.34)',
        title: '#f8fdff',
        subtitle: '#a7dbff',
        infoColor: '#d8eeff',
        accent: '#6ee7ff',
        badgeBg: 'rgba(110, 231, 255, 0.15)',
        badgeText: '#8cecff',
        avatarStart: '#61dafb',
        avatarEnd: '#2563eb',
      }
    : {
        bg1: '#18080d',
        bg2: '#51223b',
        glow: 'rgba(255, 132, 165, 0.22)',
        card: 'rgba(44, 12, 23, 0.8)',
        border: 'rgba(255, 180, 202, 0.28)',
        title: '#fff8fb',
        subtitle: '#ffc7da',
        infoColor: '#ffe3ed',
        accent: '#ff86ad',
        badgeBg: 'rgba(255, 134, 173, 0.15)',
        badgeText: '#ff9abd',
        avatarStart: '#fb7185',
        avatarEnd: '#be185d',
      };

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, palette.bg1);
  bg.addColorStop(1, palette.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = palette.glow;
  ctx.beginPath();
  ctx.arc(180, 90, 180, 0, Math.PI * 2);
  ctx.arc(900, 340, 220, 0, Math.PI * 2);
  ctx.fill();

  roundRect(ctx, 28, 28, WIDTH - 56, HEIGHT - 56, 28);
  ctx.fillStyle = palette.card;
  ctx.fill();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  drawAvatar(ctx, 190, 210, 88, palette);

  ctx.fillStyle = palette.title;
  ctx.font = `bold 54px ${FONT_FAMILY}`;
  ctx.fillText(mode === 'welcome' ? 'Hello, MinhAn' : 'Tạm biệt, MinhAn', 320, 126);

  ctx.fillStyle = palette.subtitle;
  ctx.font = `28px ${FONT_FAMILY}`;
  ctx.fillText(
    mode === 'welcome'
      ? 'Chúc bạn có buổi trò chuyện thật vui tại Discordhost'
      : 'Hẹn gặp lại bạn trong những lần ghé server tiếp theo',
    320,
    172
  );

  drawBadge(ctx, 320, 206, mode === 'welcome' ? 'THÀNH VIÊN MỚI' : 'RỜI KHỎI SERVER', palette);

  drawInfoLines(
    ctx,
    mode === 'welcome'
      ? ['ID: 1029384756', 'Đã tham gia: 28/03/2026', 'Kênh bắt đầu: #gioi-thieu']
      : ['ID: 1029384756', 'Thời gian ở server: 214 ngày', 'Tạm biệt và chúc một ngày tốt lành'],
    320,
    286,
    palette
  );

  ctx.fillStyle = palette.accent;
  ctx.fillRect(320, 342, 420, 6);
}

function drawStyleB(ctx, mode) {
  const palette = mode === 'welcome'
    ? {
        bg1: '#1f4d3f',
        bg2: '#88c057',
        panel: '#f4f1e8',
        title: '#18392b',
        subtitle: '#345244',
        infoColor: '#2b4638',
        badgeBg: '#d7f0bd',
        badgeText: '#25543f',
        deco: '#fff5cf',
        avatarStart: '#facc15',
        avatarEnd: '#16a34a',
      }
    : {
        bg1: '#4b1d1b',
        bg2: '#d97745',
        panel: '#fff2e8',
        title: '#57231f',
        subtitle: '#7b3a2f',
        infoColor: '#6b3028',
        badgeBg: '#ffd9c7',
        badgeText: '#8b3d29',
        deco: '#ffe6b7',
        avatarStart: '#fb923c',
        avatarEnd: '#dc2626',
      };

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, palette.bg1);
  bg.addColorStop(1, palette.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let i = 0; i < 14; i += 1) {
    ctx.fillStyle = palette.deco;
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.arc(80 + i * 84, 38 + (i % 4) * 96, 10 + (i % 3) * 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  roundRect(ctx, 40, 40, WIDTH - 80, HEIGHT - 80, 34);
  ctx.fillStyle = palette.panel;
  ctx.fill();

  drawAvatar(ctx, 172, 210, 82, palette);

  ctx.fillStyle = palette.title;
  ctx.font = `bold 58px ${FONT_FAMILY}`;
  ctx.fillText(mode === 'welcome' ? 'Chào mừng bạn tới server' : 'Hẹn gặp lại bạn nhé', 290, 126);

  ctx.fillStyle = palette.subtitle;
  ctx.font = `26px ${FONT_FAMILY}`;
  ctx.fillText(
    mode === 'welcome'
      ? 'Server đã sẵn sàng, chỉ còn thiếu câu chào của bạn'
      : 'Cảm ơn vì khoảng thời gian bạn đã đồng hành cùng mọi người',
    290,
    170
  );

  drawBadge(ctx, 290, 205, mode === 'welcome' ? 'STYLE ẤM ÁP' : 'STYLE TẠM BIỆT ẤM ÁP', {
    badgeBg: palette.badgeBg,
    badgeText: palette.badgeText,
  });

  drawInfoLines(
    ctx,
    mode === 'welcome'
      ? ['• Đọc luật tại #rules', '• Nhận role tại #role', '• Chat cùng mọi người ở #general']
      : ['• Đã lưu dấu 214 ngày hoạt động', '• Hẹn bạn quay lại khi rảnh', '• Server vẫn mở cửa chờ bạn'],
    290,
    285,
    palette
  );
}

function drawStyleC(ctx, mode) {
  const palette = mode === 'welcome'
    ? {
        bg: '#0b1020',
        stripe: '#1d4ed8',
        stripe2: '#22d3ee',
        panel: '#0f172a',
        border: '#334155',
        title: '#e2e8f0',
        subtitle: '#94a3b8',
        infoColor: '#cbd5e1',
        badgeBg: '#1e293b',
        badgeText: '#7dd3fc',
        avatarStart: '#38bdf8',
        avatarEnd: '#0ea5e9',
      }
    : {
        bg: '#17111d',
        stripe: '#be123c',
        stripe2: '#fb7185',
        panel: '#1f1726',
        border: '#4a334f',
        title: '#f5eaf0',
        subtitle: '#d8b4c4',
        infoColor: '#f3d8e3',
        badgeBg: '#332030',
        badgeText: '#fda4af',
        avatarStart: '#fb7185',
        avatarEnd: '#e11d48',
      };

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = palette.stripe;
  ctx.fillRect(0, 0, 24, HEIGHT);
  ctx.fillStyle = palette.stripe2;
  ctx.fillRect(24, 0, 12, HEIGHT);

  roundRect(ctx, 68, 44, WIDTH - 112, HEIGHT - 88, 22);
  ctx.fillStyle = palette.panel;
  ctx.fill();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  drawAvatar(ctx, 176, 210, 78, palette);

  ctx.fillStyle = palette.title;
  ctx.font = `bold 50px ${FONT_FAMILY}`;
  ctx.fillText(mode === 'welcome' ? 'HELLO / WELCOME' : 'BYEBEY / TẠM BIỆT', 290, 126);

  ctx.fillStyle = palette.subtitle;
  ctx.font = `25px ${FONT_FAMILY}`;
  ctx.fillText(
    mode === 'welcome'
      ? 'Mẫu gọn, rõ, hợp server muốn nhìn hiện đại'
      : 'Mẫu gọn, rõ, thiên về cảm giác chia tay nhẹ nhàng',
    290,
    166
  );

  drawBadge(ctx, 290, 204, mode === 'welcome' ? 'STYLE TỐI GIẢN' : 'STYLE TỐI GIẢN', {
    badgeBg: palette.badgeBg,
    badgeText: palette.badgeText,
  });

  drawInfoLines(
    ctx,
    mode === 'welcome'
      ? ['User: MinhAn', 'Room thông báo: #welcome', 'Nội dung có thể tự chỉnh bằng lệnh set']
      : ['User: MinhAn', 'Room thông báo: #goodbye', 'Nội dung có thể tự chỉnh bằng lệnh set'],
    290,
    286,
    palette
  );
}

function renderCard(style, mode) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  if (style === 'style-a') drawStyleA(ctx, mode);
  if (style === 'style-b') drawStyleB(ctx, mode);
  if (style === 'style-c') drawStyleC(ctx, mode);

  return canvas.toBuffer('image/png');
}

function main() {
  ensureDir(OUTPUT_DIR);

  const jobs = [
    ['style-a', 'welcome'],
    ['style-a', 'goodbye'],
    ['style-b', 'welcome'],
    ['style-b', 'goodbye'],
    ['style-c', 'welcome'],
    ['style-c', 'goodbye'],
  ];

  jobs.forEach(([style, mode]) => {
    const fileName = `${style}-${mode}.png`;
    const outputPath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(outputPath, renderCard(style, mode));
    console.log(`Generated ${outputPath}`);
  });
}

main();
