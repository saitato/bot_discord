const { Client, Interaction, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const User = require('../../models/User');
const { ensureCanvasFont } = require('../../utils/canvasFont');

const CANVAS_FONT_FAMILY = ensureCanvasFont();

module.exports = {
  name: 'leaderboard',
  description: 'Leaderboard Wcoin (avatar + \u006d\u00e0u + mini animation)',

  /**
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: '❌ Ch\u1ec9 d\u00f9ng trong server!',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const topUsers = await User.find({ guildId: interaction.guild.id })
        .sort({ balance: -1 })
        .limit(10);

      if (!topUsers.length) {
        return interaction.editReply('Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u!');
      }

      const width = 800;
      const height = 600;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#2c2f33';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 36px ${CANVAS_FONT_FAMILY}`;
      ctx.fillText('\ud83c\udfc6 B\u1ea2NG X\u1ebeP H\u1ea0NG Wcoin', 20, 50);

      for (let i = 0; i < topUsers.length; i += 1) {
        const userData = topUsers[i];
        let member;

        try {
          member = await interaction.guild.members.fetch(userData.userId);
        } catch {
          member = null;
        }

        const username = member ? member.user.username : `User ${userData.userId}`;
        const avatarURL = member
          ? member.user.displayAvatarURL({ extension: 'png', size: 64 })
          : null;

        if (i === 0) ctx.fillStyle = '#FFD700';
        else if (i === 1) ctx.fillStyle = '#C0C0C0';
        else if (i === 2) ctx.fillStyle = '#CD7F32';
        else ctx.fillStyle = '#7289da';

        ctx.fillRect(20, 80 + i * 50, width - 40, 45);

        if (avatarURL) {
          const avatar = await loadImage(avatarURL);
          ctx.drawImage(avatar, 30, 85 + i * 50, 40, 40);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 20px ${CANVAS_FONT_FAMILY}`;
        ctx.fillText(
          `#${i + 1} ${username} : ${userData.balance} Wcoin`,
          80,
          115 + i * 50
        );
      }

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, {
        name: 'leaderboard.png',
      });

      await interaction.editReply({ files: [attachment] });
    } catch (err) {
      console.log(err);
      await interaction.editReply('C\u00f3 l\u1ed7i x\u1ea3y ra!');
    }
  },
};
