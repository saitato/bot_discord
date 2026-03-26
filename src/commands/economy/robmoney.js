const {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const User = require('../../models/User');
const Item = require('../../models/Item');

const directions = ['up', 'down', 'left', 'right'];
const activeRobberies = new Map();

const arrows = {
  up: '⬆️',
  down: '⬇️',
  left: '⬅️',
  right: '➡️',
};

const reverse = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

function randDir() {
  return directions[Math.floor(Math.random() * directions.length)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRobberyKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function releaseRobbery(robberKey, targetKey) {
  activeRobberies.delete(robberKey);
  activeRobberies.delete(targetKey);
}

async function playLockpickEffect(interaction, targetName) {
  const frames = [
    `🛠️ Đang tra Lockpick vào ổ khóa của **${targetName}**...`,
    `🛠️⚙️ Đang xoay chốt khóa...`,
    `🛠️✨ Tìm thấy điểm yếu của ổ khóa...`,
  ];

  for (const frame of frames) {
    await interaction.editReply(frame);
    await sleep(700);
  }
}

module.exports = {
  name: 'robmoney',
  description: 'Cướp tiền bằng cạy khóa',

  options: [
    {
      name: 'target',
      description: 'Người bạn muốn cướp',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'amount',
      description: 'Số tiền muốn cướp',
      type: ApplicationCommandOptionType.Integer,
      required: true,
      minValue: 50,
    },
  ],

  callback: async (client, interaction) => {
    if (!interaction.inGuild()) return;

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const target = interaction.options.getUser('target');
    let money = interaction.options.getInteger('amount');

    const robberKey = getRobberyKey(guildId, userId);
    const targetKey = getRobberyKey(guildId, target.id);

    if (target.id === userId) {
      return interaction.reply({
        content: '❌ Không thể tự cướp chính mình!',
        ephemeral: true,
      });
    }

    if (activeRobberies.has(robberKey)) {
      return interaction.reply({
        content: '❌ Bạn đang thực hiện một vụ cướp khác rồi!',
        ephemeral: true,
      });
    }

    if (activeRobberies.has(targetKey)) {
      return interaction.reply({
        content: '❌ Người này đang bị nhắm tới trong một vụ cướp khác!',
        ephemeral: true,
      });
    }

    activeRobberies.set(robberKey, true);
    activeRobberies.set(targetKey, true);

    try {
      await interaction.deferReply();

      const user = await User.findOne({ userId, guildId });
      const targetUser = await User.findOne({ userId: target.id, guildId });

      if (!user || !targetUser || targetUser.balance <= 0) {
        releaseRobbery(robberKey, targetKey);
        return interaction.editReply('❌ Không thể cướp người này!');
      }

      if (money > targetUser.balance) {
        money = targetUser.balance;
      }

      const now = Date.now();

      const hasCamera = await Item.findOne({
        userId: target.id,
        guildId,
        type: 'guard',
        $or: [{ expiresAt: 0 }, { expiresAt: { $gt: now } }],
      });

      const hasLockBasic = await Item.findOne({
        userId: target.id,
        guildId,
        type: 'lock_basic',
        $or: [{ expiresAt: 0 }, { expiresAt: { $gt: now } }],
      });

      const hasLockSmart = await Item.findOne({
        userId: target.id,
        guildId,
        type: 'lock_smart',
        $or: [{ expiresAt: 0 }, { expiresAt: { $gt: now } }],
      });

      if (hasCamera) {
        const penalty = Math.floor(money * 0.5);
        user.balance -= penalty;
        targetUser.balance += penalty;

        await user.save();
        await targetUser.save();

        releaseRobbery(robberKey, targetKey);
        return interaction.editReply(
          `📹 Camera phát hiện!\n🚔 Bạn bị bắt tại trận.\n💸 Mất ${penalty.toLocaleString('vi-VN')} Wcoin`
        );
      }

      const lockpick = await Item.findOne({
        userId,
        guildId,
        type: 'lockpick',
      });

      if (!lockpick || lockpick.quantity <= 0) {
        releaseRobbery(robberKey, targetKey);
        return interaction.editReply('❌ Bạn cần có **Lockpick** để cướp!');
      }

      lockpick.quantity -= 1;

      if (lockpick.quantity <= 0) {
        await lockpick.deleteOne();
      } else {
        await lockpick.save();
      }

      await interaction.followUp({
        content: '🛠️ Đã dùng 1 Lockpick',
        ephemeral: true,
      });

      await playLockpickEffect(interaction, target.username);

      let length = Math.min(Math.max(Math.floor(money / 200), 3), 10);
      if (hasLockBasic) length *= 2;

      let code = Array.from({ length }, () => randDir());
      if (hasLockSmart) {
        code = code.map((direction) => reverse[direction]);
      }

      const info = [
        '🔐 Đang cạy khóa...',
        hasLockBasic ? '🔒 Khóa chống trộm: tăng gấp đôi độ dài mã' : null,
        hasLockSmart ? '🧠 Khóa thông minh: đảo chiều nút bấm' : null,
        !hasLockBasic && !hasLockSmart ? '❌ Mục tiêu không trang bị khóa' : null,
      ].filter(Boolean).join('\n');

      await interaction.editReply(info);
      await sleep(1000);

      await interaction.editReply(code.map((direction) => arrows[direction]).join(' '));
      await sleep(1500);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('up').setLabel('⬆️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('down').setLabel('⬇️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('left').setLabel('⬅️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('right').setLabel('➡️').setStyle(ButtonStyle.Secondary),
      );

      await interaction.editReply({
        content: `🔁 Nhập lại mã gồm **${length} bước**`,
        components: [row],
      });

      const msg = await interaction.fetchReply();
      const input = [];
      let finished = false;

      const collector = msg.createMessageComponentCollector({ time: 20000 });

      collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.user.id !== userId) {
          return buttonInteraction.reply({
            content: '❌ Đây không phải vụ cướp của bạn!',
            ephemeral: true,
          });
        }

        input.push(buttonInteraction.customId);
        await buttonInteraction.deferUpdate();

        if (input[input.length - 1] !== code[input.length - 1]) {
          finished = true;
          collector.stop('failed');

          const lost = Math.floor(money * 0.2);
          user.balance -= lost;
          await user.save();

          await interaction.editReply({
            content: `💥 Sai mã! Bạn mất ${lost.toLocaleString('vi-VN')} Wcoin`,
            components: [],
          });
          return;
        }

        if (input.length === code.length) {
          finished = true;
          collector.stop('success');

          targetUser.balance -= money;
          user.balance += money;

          await targetUser.save();
          await user.save();

          await interaction.editReply({
            content: `💰 Thành công! Bạn cướp được ${money.toLocaleString('vi-VN')} Wcoin`,
            components: [],
          });
        }
      });

      collector.on('end', async () => {
        releaseRobbery(robberKey, targetKey);

        if (!finished) {
          await interaction.editReply({
            content: '⏳ Hết giờ! Vụ cướp thất bại.',
            components: [],
          }).catch(() => null);
        }
      });
    } catch (error) {
      releaseRobbery(robberKey, targetKey);
      console.log(error);

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply('❌ Đã xảy ra lỗi khi thực hiện vụ cướp.');
      }

      return interaction.reply({
        content: '❌ Đã xảy ra lỗi khi thực hiện vụ cướp.',
        ephemeral: true,
      });
    }
  },
};
