const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fetch = require('node-fetch');
const { ensureCanvasFont } = require('./canvasFont');

const WIDTH = 1100;
const HEIGHT = 420;
const FONT_FAMILY = ensureCanvasFont();
const IMAGE_CACHE = new Map();

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

async function loadRemoteImage(url) {
  if (!url) return null;

  if (!IMAGE_CACHE.has(url)) {
    IMAGE_CACHE.set(
      url,
      (async () => {
        const response = await fetch(url, { timeout: 12000 });
        if (!response.ok) {
          throw new Error(`Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c \u1ea3nh: ${response.status}`);
        }

        const buffer = await response.buffer();
        return loadImage(buffer);
      })().catch((error) => {
        IMAGE_CACHE.delete(url);
        throw error;
      })
    );
  }

  return IMAGE_CACHE.get(url);
}

function clampText(text = '', maxLength = 120) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function fitText(ctx, text, maxWidth, baseSize, weight = 'bold') {
  let fontSize = baseSize;

  while (fontSize > 18) {
    ctx.font = `${weight} ${fontSize}px ${FONT_FAMILY}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 2;
  }
}

function drawCoverImage(ctx, image, targetWidth, targetHeight) {
  const imageWidth = image.width || targetWidth;
  const imageHeight = image.height || targetHeight;
  const scale = Math.max(targetWidth / imageWidth, targetHeight / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const offsetX = (targetWidth - drawWidth) / 2;
  const offsetY = (targetHeight - drawHeight) / 2;

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function normalizeTemplate(template = '') {
  return template.replace(/\/n/g, '\n');
}

function formatTemplate(template, values) {
  return normalizeTemplate(template)
    .replace(/\{user\}/gi, values.user)
    .replace(/\{guild\}/gi, values.guild)
    .replace(/\{server\}/gi, values.server)
    .replace(/\{count\}/gi, values.count)
    .replace(/\{tag\}/gi, values.tag);
}

function formatRichText(template, values) {
  return formatTemplate(template, values).replace(/\bid:(\d{5,})\b/gi, '<#$1>');
}

async function buildWelcomeCard(options) {
  const {
    mode,
    username,
    userTag,
    avatarUrl,
    guildName,
    memberCount,
    backgroundImageUrl,
  } = options;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const title = mode === 'hello'
    ? `Hello, ${username}`
    : `T\u1ea1m bi\u1ec7t, ${username}`;
  const accent = mode === 'hello' ? '#64f1df' : '#fb7185';

  try {
    const background = await loadRemoteImage(backgroundImageUrl);
    drawCoverImage(ctx, background, WIDTH, HEIGHT);
  } catch {
    const fallback = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    if (mode === 'hello') {
      fallback.addColorStop(0, '#0f172a');
      fallback.addColorStop(1, '#164e63');
    } else {
      fallback.addColorStop(0, '#1f172a');
      fallback.addColorStop(1, '#4c1d95');
    }
    ctx.fillStyle = fallback;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  roundRect(ctx, 30, 30, WIDTH - 60, HEIGHT - 60, 28);
  ctx.fillStyle = 'rgba(21, 25, 34, 0.76)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.arc(145, 108, 160, 0, Math.PI * 2);
  ctx.arc(910, 310, 180, 0, Math.PI * 2);
  ctx.fill();

  try {
    const avatar = await loadRemoteImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(180, 210, 86, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 94, 124, 172, 172);
    ctx.restore();
  } catch {
    const avatarGradient = ctx.createLinearGradient(94, 124, 266, 296);
    avatarGradient.addColorStop(0, accent);
    avatarGradient.addColorStop(1, '#ffffff');
    ctx.beginPath();
    ctx.arc(180, 210, 86, 0, Math.PI * 2);
    ctx.fillStyle = avatarGradient;
    ctx.fill();
  }

  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
  ctx.beginPath();
  ctx.arc(180, 210, 90, 0, Math.PI * 2);
  ctx.stroke();

  const contentAreaX = 350;
  const contentAreaWidth = 640;
  const textBlockWidth = 430;
  const textLeftX = contentAreaX + ((contentAreaWidth - textBlockWidth) / 2);
  const badgeWidth = mode === 'hello' ? 210 : 185;

  ctx.textAlign = 'left';
  fitText(ctx, title, textBlockWidth, 54, 'bold');
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(title, textLeftX, 126);

  roundRect(ctx, textLeftX, 150, badgeWidth, 42, 20);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.font = `bold 24px ${FONT_FAMILY}`;
  ctx.fillText(
    mode === 'hello' ? 'TH\u00c0NH VI\u00caN M\u1edaI' : 'T\u1ea0M BI\u1ec6T',
    textLeftX + 18,
    178
  );

  ctx.fillStyle = '#f8fafc';
  ctx.font = `24px ${FONT_FAMILY}`;
  ctx.fillText(`Tag: ${userTag}`, textLeftX, 250);
  ctx.fillText(`Guild: ${clampText(guildName, 34)}`, textLeftX, 295);
  ctx.fillText(`Th\u00e0nh vi\u00ean th\u1ee9: ${memberCount}`, textLeftX, 340);

  const fileName = mode === 'hello' ? 'hello-card.png' : 'byebye-card.png';
  return new AttachmentBuilder(canvas.toBuffer('image/png'), {
    name: fileName,
  });
}

module.exports = {
  buildWelcomeCard,
  formatTemplate,
  formatRichText,
  normalizeTemplate,
  createWelcomeEmbed(mode, description, imageFileName) {
    return new EmbedBuilder()
      .setColor(0xf29adf)
      .setDescription(description)
      .setImage(`attachment://${imageFileName}`);
  },
};
