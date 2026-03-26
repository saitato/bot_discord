const { Client, Interaction, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Bag = require('../../models/Bag');
const {
  getBagUpgradeInfo,
  getInventorySlots,
} = require('../../utils/economyItems');

const DOWNGRADE_RATE_ON_FAIL = 50;
const MAX_BAG_LEVEL = 10;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function getPalette(success, downgraded, phase = 0, mode = 'result') {
  const pulse = 0.2 + phase * 0.1;

  if (mode !== 'result') {
    return {
      a: '#0f172a',
      b: '#1d4ed8',
      c: '#38bdf8',
      glow: '#7dd3fc',
      text: '#e0f2fe',
      pulse,
    };
  }

  if (success) {
    return {
      a: '#052e16',
      b: '#14532d',
      c: '#22c55e',
      glow: '#86efac',
      text: '#dcfce7',
      pulse,
    };
  }

  if (downgraded) {
    return {
      a: '#431407',
      b: '#9a3412',
      c: '#f97316',
      glow: '#fdba74',
      text: '#ffedd5',
      pulse,
    };
  }

  return {
    a: '#3b2206',
    b: '#78350f',
    c: '#f59e0b',
    glow: '#fde68a',
    text: '#fffbeb',
    pulse,
  };
}

async function buildUpgradeCard({
  user,
  oldLevel,
  currentLevel,
  success,
  downgraded,
  successRate,
  price,
  balance,
  mode = 'result',
  progress = 100,
  phase = 0,
}) {
  const width = 1100;
  const height = 620;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const isResult = mode === 'result';
  const palette = getPalette(success, downgraded, phase, mode);

  const titleText = isResult
    ? success
      ? 'Nâng cấp thành công'
      : downgraded
        ? 'Nổ nâng cấp'
        : 'Nâng cấp thất bại'
    : 'Đang cường hóa balo';

  const subtitleText = isResult
    ? success
      ? 'Balo đã hấp thụ toàn bộ năng lượng cường hóa'
      : downgraded
        ? 'Nguồn lực bùng nổ khiến balo bị tụt cấp'
        : 'Cường hóa không thành công nhưng balo vẫn an toàn'
    : 'Nguồn năng lượng đang được nén và đồng bộ';

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, palette.a);
  background.addColorStop(0.55, '#0f172a');
  background.addColorStop(1, palette.b);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 22; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.02 + (i % 4) * 0.015})`;
    ctx.beginPath();
    ctx.arc(70 + i * 48, 70 + (i % 5) * 105, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  const glow = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, 280);
  glow.addColorStop(0, `${palette.glow}${Math.round((0.28 + palette.pulse) * 255).toString(16).padStart(2, '0')}`);
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  roundRect(ctx, 34, 34, width - 68, height - 68, 30);
  ctx.fillStyle = 'rgba(15,23,42,0.78)';
  ctx.fill();
  ctx.strokeStyle = `${palette.glow}d0`;
  ctx.lineWidth = isResult ? 4 : 2;
  ctx.stroke();

  if (isResult) {
    roundRect(ctx, 52, 52, width - 104, height - 104, 26);
    ctx.strokeStyle = success
      ? 'rgba(134,239,172,0.55)'
      : 'rgba(253,186,116,0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.fillStyle = palette.text;
  ctx.font = `bold ${isResult ? 56 : 46}px Arial`;
  ctx.fillText(titleText, 70, 96);

  ctx.font = '22px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillText(subtitleText, 72, 136);

  const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
  const avatarSize = 112;
  const avatarX = 82;
  const avatarY = 182;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  ctx.restore();

  ctx.strokeStyle = palette.c;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px Arial';
  ctx.fillText(user.username, 220, 228);

  ctx.font = '20px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.74)';
  ctx.fillText(`Chi phí: ${price.toLocaleString('vi-VN')} Wcoin`, 222, 274);

  roundRect(ctx, 70, 324, width - 140, 218, 28);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = '22px Arial';
  ctx.fillText(isResult ? 'CƯỜNG HÓA' : 'TIẾN TRÌNH', 88, 368);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px Arial';
  ctx.fillText(`+${oldLevel}`, 106, 452);

  ctx.fillStyle = palette.c;
  ctx.font = 'bold 58px Arial';
  ctx.fillText('>>', 338, 450);

  ctx.fillStyle = success ? '#4ade80' : downgraded ? '#f87171' : '#fbbf24';
  ctx.font = 'bold 94px Arial';
  ctx.fillText(`+${isResult ? currentLevel : Math.min(oldLevel + 1, MAX_BAG_LEVEL)}`, 438, 462);

  if (isResult) {
    roundRect(ctx, 690, 362, 280, 64, 20);
    ctx.fillStyle = success
      ? 'rgba(34,197,94,0.18)'
      : 'rgba(249,115,22,0.18)';
    ctx.fill();
    ctx.strokeStyle = success ? '#4ade80' : '#fb923c';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${isResult ? 34 : 28}px Arial`;
  ctx.fillText(
    isResult
      ? success
        ? 'THÀNH CÔNG'
        : 'THẤT BẠI'
      : 'ĐANG NÂNG CẤP',
    718,
    403
  );

  ctx.font = '22px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillText(`Số ô balo: ${getInventorySlots(isResult ? currentLevel : oldLevel)} ô`, 718, 456);
  ctx.fillText(`Wcoin còn lại: ${balance.toLocaleString('vi-VN')}`, 718, 490);

  if (!isResult) {
    roundRect(ctx, 230, 500, 640, 46, 23);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fill();

    roundRect(ctx, 230, 500, 640 * (progress / 100), 46, 23);
    ctx.fillStyle = palette.c;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`TIẾN TRÌNH ${progress}%`, 455, 532);
  } else {
  }

  return canvas.toBuffer('image/png');
}

async function playUpgradeEffect(interaction, cardData) {
  const frames = [
    { progress: 18, phase: 0 },
    { progress: 44, phase: 1 },
    { progress: 73, phase: 2 },
    { progress: 100, phase: 3 },
  ];

  for (let index = 0; index < frames.length; index++) {
    const frame = frames[index];
    const buffer = await buildUpgradeCard({
      ...cardData,
      mode: 'progress',
      progress: frame.progress,
      phase: frame.phase,
    });

    const attachment = new AttachmentBuilder(buffer, {
      name: `bag-upgrade-progress-${index + 1}.png`,
    });

    await interaction.editReply({
      content: '',
      embeds: [],
      files: [attachment],
    });

    await sleep(index === frames.length - 1 ? 260 : 360);
  }
}

module.exports = {
  name: 'nangcapbalo',
  description: 'Nâng cấp level balo để mở thêm ô chứa item',

  /**
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: 'Chỉ dùng trong server!',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const session = await mongoose.startSession();
    session.startTransaction();
    let transactionCommitted = false;

    try {
      let user = await User.findOne({ userId, guildId }).session(session);
      if (!user) user = new User({ userId, guildId, balance: 0 });

      let bag = await Bag.findOne({ userId, guildId }).session(session);
      if (!bag) bag = new Bag({ userId, guildId, level: 1 });

      if (bag.level >= MAX_BAG_LEVEL) {
        await session.abortTransaction();
        return interaction.editReply('🎉 Balo của bạn đã đạt level tối đa.');
      }

      const upgradeInfo = getBagUpgradeInfo(bag.level);
      if (!upgradeInfo) {
        await session.abortTransaction();
        return interaction.editReply('❌ Không tìm thấy dữ liệu nâng cấp cho cấp balo hiện tại.');
      }

      if ((user.balance || 0) < upgradeInfo.price) {
        await session.abortTransaction();
        return interaction.editReply(
          `❌ Bạn cần **${upgradeInfo.price.toLocaleString('vi-VN')} Wcoin** để nâng cấp balo.`
        );
      }

      user.balance -= upgradeInfo.price;

      const oldLevel = bag.level;
      const success = Math.random() * 100 < upgradeInfo.successRate;
      let downgraded = false;

      if (success) {
        bag.level += 1;
      } else if (oldLevel > 1 && Math.random() * 100 < DOWNGRADE_RATE_ON_FAIL) {
        const downgradeLevels = Math.random() < 0.5 ? 1 : 2;
        bag.level = Math.max(1, bag.level - downgradeLevels);
        downgraded = true;
      }

      await Promise.all([
        user.save({ session }),
        bag.save({ session }),
      ]);

      await session.commitTransaction();
      transactionCommitted = true;

      const cardData = {
        user: interaction.user,
        oldLevel,
        currentLevel: bag.level,
        success,
        downgraded,
        successRate: upgradeInfo.successRate,
        price: upgradeInfo.price,
        balance: user.balance || 0,
      };

      await playUpgradeEffect(interaction, cardData);

      const buffer = await buildUpgradeCard({
        ...cardData,
        mode: 'result',
        progress: 100,
        phase: 3,
      });

      const attachment = new AttachmentBuilder(buffer, { name: 'bag-upgrade.png' });

      return interaction.editReply({
        content: '',
        files: [attachment],
      });
    } catch (error) {
      if (!transactionCommitted) {
        await session.abortTransaction();
      }
      console.log(error);
      return interaction.editReply('❌ Đã xảy ra lỗi khi nâng cấp balo.');
    } finally {
      session.endSession();
    }
  },
};
