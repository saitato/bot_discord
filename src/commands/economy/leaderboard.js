const { Client, Interaction, AttachmentBuilder } = require('discord.js');
const User = require('../../models/User');
const { createCanvas, loadImage } = require('@napi-rs/canvas'); // ✅ đổi ở đây

module.exports = {
    name: 'leaderboard',
    description: 'Leaderboard Wcoin (avatar + màu + mini animation)',

    /**
     * @param {Client} client
     * @param {Interaction} interaction
     */
    callback: async (client, interaction) => {
        if (!interaction.inGuild()) {
            return interaction.reply({
                content: '❌ Chỉ dùng trong server!',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const topUsers = await User.find({ guildId: interaction.guild.id })
                .sort({ balance: -1 })
                .limit(10);

            if (!topUsers.length) return interaction.editReply('Chưa có dữ liệu!');

            // Canvas setup
            const width = 800;
            const height = 600;
            const canvas = createCanvas(width, height); // ✅ đổi
            const ctx = canvas.getContext('2d');

            // Background
            ctx.fillStyle = '#2c2f33';
            ctx.fillRect(0, 0, width, height);

            // Title
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText('🏆 BẢNG XẾP HẠNG Wcoin', 20, 50);

            // Vẽ từng top
            for (let i = 0; i < topUsers.length; i++) {
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

                // Màu nền
                if (i === 0) ctx.fillStyle = '#FFD700';
                else if (i === 1) ctx.fillStyle = '#C0C0C0';
                else if (i === 2) ctx.fillStyle = '#CD7F32';
                else ctx.fillStyle = '#7289da';

                ctx.fillRect(20, 80 + i * 50, width - 40, 45);

                // Avatar
                if (avatarURL) {
                    const avatar = await loadImage(avatarURL); // ✅ đổi
                    ctx.drawImage(avatar, 30, 85 + i * 50, 40, 40);
                }

                // Text
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 20px sans-serif';
                ctx.fillText(
                    `#${i + 1} ${username} : ${userData.balance} Wcoin`,
                    80,
                    115 + i * 50
                );
            }

            const buffer = canvas.toBuffer('image/png'); // ✅ thêm mime type (khuyên dùng)

            const attachment = new AttachmentBuilder(buffer, {
                name: 'leaderboard.png',
            });

            await interaction.editReply({ files: [attachment] });

        } catch (err) {
            console.log(err);
            interaction.editReply('Có lỗi xảy ra!');
        }
    },
};