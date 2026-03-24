const { Client, Interaction, AttachmentBuilder } = require('discord.js');
const User = require('../../models/User');
const Canvas = require('canvas');
const fetch = require('node-fetch'); // npm install node-fetch@2

// Cài đặt fetch global cho canvas
globalThis.fetch = fetch;

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
            const canvas = Canvas.createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            // Background
            ctx.fillStyle = '#2c2f33';
            ctx.fillRect(0, 0, width, height);

            // Title
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px Sans';
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
                const avatarURL = member ? member.user.displayAvatarURL({ extension: 'png', size: 64 }) : null;

                // Màu nền cho top 3
                if (i === 0) ctx.fillStyle = '#FFD700'; // vàng
                else if (i === 1) ctx.fillStyle = '#C0C0C0'; // bạc
                else if (i === 2) ctx.fillStyle = '#CD7F32'; // đồng
                else ctx.fillStyle = '#7289da'; // xanh khác

                ctx.fillRect(20, 80 + i * 50, width - 40, 45);

                // Vẽ avatar nếu có
                if (avatarURL) {
                    const avatar = await Canvas.loadImage(avatarURL);
                    ctx.drawImage(avatar, 30, 85 + i * 50, 40, 40);
                }

                // Vẽ tên + Wcoin
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 20px Sans';
                ctx.fillText(`#${i + 1} ${username} : ${userData.balance} Wcoin`, 80, 115 + i * 50);
            }

            const attachment = new AttachmentBuilder(await canvas.toBuffer(), { name: 'leaderboard.png' });

            await interaction.editReply({ files: [attachment] });

        } catch (err) {
            console.log(err);
            interaction.editReply('Có lỗi xảy ra!');
        }
    },
};