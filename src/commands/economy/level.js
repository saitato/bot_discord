const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  AttachmentBuilder,
} = require('discord.js');
const canvacord = require('canvacord');
const calculateLevelXp = require('../../utils/calculateLevelXp');
const Level = require('../../models/Level');

module.exports = {
  name: 'level',
  description: 'Xem level người dùng',
  options: [
    {
      name: 'target-user',
      description: 'Xem level của ai?',
      type: ApplicationCommandOptionType.User,
    },
  ],

  callback: async (client, interaction) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: '❌ Chỉ có thể chạy lệnh trong server!',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    // Lấy user target
    const targetUserId = interaction.options.getUser('target-user')?.id || interaction.user.id;
    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(targetUserId);
    } catch {
      return interaction.editReply('Không thể fetch user này!');
    }

    // Lấy level user
    const query = { userId: targetUserId, guildId: interaction.guild.id };
    const fetchedLevel = await Level.findOne(query);

    if (!fetchedLevel) {
      return interaction.editReply(
        targetUserId === interaction.user.id
          ? 'Bạn chưa có cấp độ nào. Chat nhiều hơn để tăng level nhé!'
          : `${targetMember.user.tag} chưa có cấp độ nào.`
      );
    }

    // Tính rank
    const allLevels = await Level.find({ guildId: interaction.guild.id }).select('-_id userId level xp');
    allLevels.sort((a, b) => (b.level === a.level ? b.xp - a.xp : b.level - a.level));
    const currentRank = allLevels.findIndex(lvl => lvl.userId === targetUserId) + 1;

    // Tạo rank card
    const rank = new canvacord.Rank()
      .setAvatar(targetMember.user.displayAvatarURL({ size: 256, extension: 'png' }))
      .setCurrentXP(fetchedLevel.xp)
      .setRequiredXP(calculateLevelXp(fetchedLevel.level))
      .setLevel(fetchedLevel.level)
      .setRank(currentRank)
      .setStatus(targetMember.presence?.status || 'offline')
      .setUsername(targetMember.user.username)
      .setDiscriminator(targetMember.user.discriminator)
      .setProgressBar('#FFC300', 'COLOR');

    const buffer = await rank.build();
    const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });
    interaction.editReply({ files: [attachment] });
  },
};