const {
  Client,
  Interaction,
  EmbedBuilder,
} = require('discord.js');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Bag = require('../../models/Bag');
const {
  getBagUpgradeInfo,
  getInventorySlots,
} = require('../../utils/economyItems');

const DOWNGRADE_RATE_ON_FAIL = 50;
const MAX_BAG_LEVEL = 10;
const PROGRESS_STEPS = [8, 19, 33, 48, 64, 79, 91, 100];
const PROGRESS_DELAY_MS = 650;
const FINAL_PROGRESS_DELAY_MS = 900;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function createProgressBar(progress, size = 12) {
  const safeProgress = Math.max(0, Math.min(progress, 100));
  const filled = Math.round((safeProgress / 100) * size);
  return `${'#'.repeat(filled)}${'-'.repeat(size - filled)}`;
}

function getUpgradeTheme(success, downgraded, mode = 'result') {
  if (mode === 'progress') {
    return {
      color: 0x3b82f6,
      title: 'Đang cường hóa balo',
      summary: 'Hệ thống đang nén năng lượng để thử nâng cấp.',
      badge: 'Đang xử lý',
    };
  }

  if (success) {
    return {
      color: 0x22c55e,
      title: 'Nâng cấp thành công',
      summary: 'Balo đã được tăng cấp thành công.',
      badge: 'Thành công',
    };
  }

  if (downgraded) {
    return {
      color: 0xef4444,
      title: 'Nâng cấp thất bại',
      summary: 'Cường hóa lỗi, balo bị tụt cấp.',
      badge: 'Tụt cấp',
    };
  }

  return {
    color: 0xf59e0b,
    title: 'Nâng cấp thất bại',
    summary: 'Cường hóa không thành công, cấp balo được giữ nguyên.',
    badge: 'Thất bại',
  };
}

function buildUpgradeEmbed({
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
}) {
  const theme = getUpgradeTheme(success, downgraded, mode);
  const previewLevel = Math.min(oldLevel + 1, MAX_BAG_LEVEL);
  const targetLevel = mode === 'progress' ? previewLevel : currentLevel;
  const progressBar = createProgressBar(progress);

  const statusLine = mode === 'progress'
    ? `\`${progressBar}\` **${progress}%**`
    : success
      ? `\`+${oldLevel} -> +${currentLevel}\``
      : downgraded
        ? `\`+${oldLevel} -> +${currentLevel}\``
        : `\`+${oldLevel} -> +${oldLevel}\``;

  const resultNote = mode === 'progress'
    ? 'Đang thử nâng cấp lên mức tiếp theo...'
    : success
      ? `Balo đã tăng từ **+${oldLevel}** lên **+${currentLevel}**.`
      : downgraded
        ? `Balo đã tụt từ **+${oldLevel}** xuống **+${currentLevel}**.`
        : `Balo giữ nguyên ở **+${oldLevel}**.`;

  return new EmbedBuilder()
    .setColor(theme.color)
    .setAuthor({
      name: `${user.username} | Nâng cấp balo`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setTitle(theme.title)
    .setDescription(
      [
        theme.summary,
        '',
        `**Trạng thái:** ${theme.badge}`,
        `**Cấp balo:** ${statusLine}`,
        `**Ghi chú:** ${resultNote}`,
      ].join('\n')
    )
    .addFields(
      {
        name: 'Chi phí',
        value: `\`${formatNumber(price)} Wcoin\``,
        inline: true,
      },
      {
        name: 'Số dư còn lại',
        value: `\`${formatNumber(balance)} Wcoin\``,
        inline: true,
      },
      {
        name: 'Mức hiện tại',
        value: `\`Level ${targetLevel}\``,
        inline: true,
      },
    )
    .setFooter({
      text: mode === 'progress'
        ? 'Đang xử lý nâng cấp...'
        : 'Hệ thống nâng cấp balo',
    })
    .setTimestamp();
}

async function playUpgradeEffect(interaction, embedData) {
  for (let index = 0; index < PROGRESS_STEPS.length; index++) {
    const progress = PROGRESS_STEPS[index];
    const embed = buildUpgradeEmbed({
      ...embedData,
      mode: 'progress',
      progress,
    });

    await interaction.editReply({
      content: '',
      embeds: [embed],
      files: [],
    });

    await sleep(
      index === PROGRESS_STEPS.length - 1
        ? FINAL_PROGRESS_DELAY_MS
        : PROGRESS_DELAY_MS
    );
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
        return interaction.editReply('Bạn đã đạt level balo tối đa.');
      }

      const upgradeInfo = getBagUpgradeInfo(bag.level);
      if (!upgradeInfo) {
        await session.abortTransaction();
        return interaction.editReply('Không tìm thấy dữ liệu nâng cấp cho cấp balo hiện tại.');
      }

      if ((user.balance || 0) < upgradeInfo.price) {
        await session.abortTransaction();
        return interaction.editReply(
          `Bạn cần **${formatNumber(upgradeInfo.price)} Wcoin** để nâng cấp balo.`
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

      const embedData = {
        user: interaction.user,
        oldLevel,
        currentLevel: bag.level,
        success,
        downgraded,
        successRate: upgradeInfo.successRate,
        price: upgradeInfo.price,
        balance: user.balance || 0,
      };

      await playUpgradeEffect(interaction, embedData);

      const resultEmbed = buildUpgradeEmbed({
        ...embedData,
        mode: 'result',
        progress: 100,
      });

      return interaction.editReply({
        content: '',
        embeds: [resultEmbed],
        files: [],
      });
    } catch (error) {
      if (!transactionCommitted) {
        await session.abortTransaction();
      }
      console.log(error);
      return interaction.editReply('Đã xảy ra lỗi khi nâng cấp balo.');
    } finally {
      session.endSession();
    }
  },
};
