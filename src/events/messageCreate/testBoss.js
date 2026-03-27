const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const User = require('../../models/User');
const Item = require('../../models/Item');
const Bag = require('../../models/Bag');
const {
  getBossItemLevel,
  getBossLootPool,
  getBossItemStatValue,
  getEquipmentSlotLabel,
  getInventorySlots,
} = require('../../utils/economyItems');
const { getEquippedCombatProfile } = require('../../utils/equipmentStats');

const PREFIX = '.testboss';
const ACTIVE_BOSSES = new Map();
const BOSS_DURATION_MS = 5 * 60 * 1000;
const ATTACK_COOLDOWN_MS = 1800;
const LOOT_DAMAGE_THRESHOLD = 0.1;

function parseIdList(value) {
  return value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) || [];
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function createBossState(message) {
  const bossHp = 10000;

  return {
    guildId: message.guild.id,
    channelId: message.channel.id,
    ownerId: message.author.id,
    ownerName: message.author.username,
    bossName: 'Boss Test Khổng Lồ',
    maxHp: bossHp,
    hp: bossHp,
    startedAt: Date.now(),
    expiresAt: Date.now() + BOSS_DURATION_MS,
    messageId: null,
    participants: new Map(),
    cooldowns: new Map(),
    locked: false,
    defeated: false,
  };
}

function pickLootRarity() {
  const roll = Math.random() * 100;

  if (roll < 55) return 'common';
  if (roll < 80) return 'rare';
  if (roll < 95) return 'epic';
  return 'legendary';
}

function getRarityLabel(rarity) {
  if (rarity === 'legendary') return 'Huyền thoại';
  if (rarity === 'epic') return 'Sử thi';
  if (rarity === 'rare') return 'Hiếm';
  return 'Thường';
}

function getStatLabel(stat) {
  if (stat === 'crit') return 'Crit';
  if (stat === 'armor_pen') return 'Xuyên giáp';
  return 'ATK';
}

function createHpBar(current, max, size = 16) {
  const safeMax = Math.max(max, 1);
  const ratio = Math.max(0, Math.min(current / safeMax, 1));
  const filled = Math.round(ratio * size);
  return `${'█'.repeat(filled)}${'░'.repeat(size - filled)}`;
}

function getTopDamagers(state, limit = 5) {
  return [...state.participants.values()]
    .sort((a, b) => b.damage - a.damage)
    .slice(0, limit);
}

function buildBossEmbed(state, description) {
  const hpPercent = Math.max(0, Math.round((state.hp / state.maxHp) * 100));
  const topDamagers = getTopDamagers(state);
  const ranking = topDamagers.length
    ? topDamagers
        .map(
          (entry, index) =>
            `**${index + 1}.** ${entry.username} - ${formatNumber(entry.damage)} sát thương`
        )
        .join('\n')
    : 'Chưa có ai ra đòn.';

  return new EmbedBuilder()
    .setColor(state.defeated ? 0x22c55e : 0xef4444)
    .setTitle(`${state.bossName} đã xuất hiện`)
    .setDescription(
      [
        description || 'Cả server có thể cùng bấm nút bên dưới để đánh boss.',
        '',
        `**Máu boss:** ${formatNumber(state.hp)}/${formatNumber(state.maxHp)} HP`,
        `\`${createHpBar(state.hp, state.maxHp)}\` **${hpPercent}%**`,
      ].join('\n')
    )
    .addFields(
      {
        name: 'Người triệu hồi',
        value: `<@${state.ownerId}>`,
        inline: true,
      },
      {
        name: 'Thời gian',
        value: state.defeated ? '`Đã bị hạ gục`' : '`Tối đa 5 phút`',
        inline: true,
      },
      {
        name: 'Chiến báo',
        value: ranking,
      }
    )
    .setFooter({
      text: state.defeated
        ? 'Boss test đã bị tiêu diệt'
        : 'Nhấn "Đánh boss" để gây sát thương',
    })
    .setTimestamp();
}

function buildBossButtons(disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('testboss_attack')
        .setLabel('Đánh boss')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('testboss_status')
        .setLabel('Xem boss')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    ),
  ];
}

async function rewardParticipants(state) {
  const ranking = [...state.participants.values()].sort((a, b) => b.damage - a.damage);
  const damageThreshold = Math.floor(state.maxHp * LOOT_DAMAGE_THRESHOLD);

  for (let index = 0; index < ranking.length; index++) {
    const participant = ranking[index];
    let reward = 150 + Math.floor(participant.damage / 8);

    if (index === 0) reward += 600;
    else if (index === 1) reward += 350;
    else if (index === 2) reward += 200;

    let user = await User.findOne({
      userId: participant.userId,
      guildId: state.guildId,
    });

    if (!user) {
      user = new User({
        userId: participant.userId,
        guildId: state.guildId,
        balance: 0,
      });
    }

    user.balance += reward;
    await user.save();
    participant.reward = reward;

    if (participant.damage > damageThreshold) {
      const rarity = pickLootRarity();
          const lootPool = getBossLootPool(rarity);
          const loot = lootPool[Math.floor(Math.random() * lootPool.length)];
          const lootLevel = getBossItemLevel(participant.level || 0);

          if (loot) {
            const bag = await Bag.findOne({
          userId: participant.userId,
          guildId: state.guildId,
        });
        const totalSlots = getInventorySlots(bag?.level || 1);
        const usedSlots = await Item.countDocuments({
          userId: participant.userId,
          guildId: state.guildId,
          $or: [{ expiresAt: 0 }, { expiresAt: { $gt: Date.now() } }],
        });

        let existingItem = await Item.findOne({
          userId: participant.userId,
          guildId: state.guildId,
          type: loot.type,
          itemLevel: lootLevel,
        });

        if (existingItem) {
          existingItem.quantity += 1;
          await existingItem.save();
          participant.loot = {
            ...loot,
            itemLevel: lootLevel,
            scaledStatValue: getBossItemStatValue(loot, lootLevel),
          };
        } else if (usedSlots < totalSlots) {
          existingItem = new Item({
            userId: participant.userId,
            guildId: state.guildId,
            type: loot.type,
            itemLevel: lootLevel,
            quantity: 1,
            expiresAt: 0,
          });
          await existingItem.save();
          participant.loot = {
            ...loot,
            itemLevel: lootLevel,
            scaledStatValue: getBossItemStatValue(loot, lootLevel),
          };
        } else {
          participant.lootBlocked = true;
        }
      }
    }
  }
}

function buildVictorySummary(state) {
  const ranking = getTopDamagers(state, 10);

  return ranking.length
    ? ranking
        .map((entry, index) => {
          const rewardText = entry.reward ? ` | +${formatNumber(entry.reward)} Wcoin` : '';
          const lootText = entry.loot
            ? ` | Nhận: ${entry.loot.name} Lv ${entry.loot.itemLevel} (${getEquipmentSlotLabel(entry.loot.slot)} - ${getRarityLabel(entry.loot.rarity)} - ${getStatLabel(entry.loot.stat)} +${entry.loot.scaledStatValue})`
            : entry.lootBlocked
              ? ' | Balo đầy nên không nhận được đồ'
              : '';
          return `**${index + 1}.** ${entry.username} - ${formatNumber(entry.damage)} sát thương${rewardText}${lootText}`;
        })
        .join('\n')
    : 'Không có ai gây sát thương.';
}

module.exports = async (client, message) => {
  if (!message.inGuild() || message.author.bot) return;
  if (!message.content.toLowerCase().startsWith(PREFIX)) return;

  const devIds = parseIdList(process.env.DEVS);
  if (!devIds.includes(message.author.id)) {
    return message.reply('Chỉ DEVS mới được dùng lệnh `.testboss`.');
  }

  const guildId = message.guild.id;
  const activeBoss = ACTIVE_BOSSES.get(guildId);

  if (activeBoss && !activeBoss.defeated && Date.now() < activeBoss.expiresAt) {
    return message.reply('Server này đang có boss test rồi. Mọi người vào đánh tiếp đi.');
  }

  const state = createBossState(message);
  ACTIVE_BOSSES.set(guildId, state);

  const bossMessage = await message.channel.send({
    embeds: [buildBossEmbed(state)],
    components: buildBossButtons(false),
  });

  state.messageId = bossMessage.id;

  const collector = bossMessage.createMessageComponentCollector({
    time: BOSS_DURATION_MS,
  });

  collector.on('collect', async (interaction) => {
    if (interaction.customId === 'testboss_status') {
      return interaction.reply({
        embeds: [buildBossEmbed(state, 'Boss vẫn đang chờ những đòn đánh mới.')],
        ephemeral: true,
      });
    }

    if (interaction.customId !== 'testboss_attack') return;

    if (state.defeated || state.hp <= 0) {
      return interaction.reply({
        content: 'Boss này đã bị hạ rồi.',
        ephemeral: true,
      });
    }

    const now = Date.now();
    const cooldownUntil = state.cooldowns.get(interaction.user.id) || 0;
    if (cooldownUntil > now) {
      const waitSeconds = ((cooldownUntil - now) / 1000).toFixed(1);
      return interaction.reply({
        content: `Bạn vừa ra đòn rồi, chờ thêm ${waitSeconds} giây nữa nhé.`,
        ephemeral: true,
      });
    }

    if (state.locked) {
      return interaction.reply({
        content: 'Đòn đánh đang được xử lý, thử lại ngay sau đó nhé.',
        ephemeral: true,
      });
    }

    state.locked = true;

    try {
      const profile = await getEquippedCombatProfile(
        interaction.user.id,
        state.guildId
      );
      const playerLevel = profile.level;
      const rolledDamage = 100 + Math.floor(Math.random() * 51);
      const baseDamage = rolledDamage + (playerLevel * 5);
      const bonusAttack = profile.stats.atk;
      const armorPenBonus = profile.stats.armorPen;
      const rawDamage = baseDamage + bonusAttack + armorPenBonus;
      const critChance = profile.stats.crit;
      const isCritical = Math.random() * 100 < critChance;
      const damage = isCritical
        ? Math.floor(rawDamage * profile.stats.critMultiplier)
        : rawDamage;
      const finalDamage = Math.min(state.hp, damage);

      state.hp -= finalDamage;
      state.cooldowns.set(interaction.user.id, now + ATTACK_COOLDOWN_MS);

      const existing = state.participants.get(interaction.user.id) || {
        userId: interaction.user.id,
        username: interaction.user.username,
        damage: 0,
        hits: 0,
      };

      existing.username = interaction.user.username;
      existing.level = playerLevel;
      existing.damage += finalDamage;
      existing.hits += 1;
      state.participants.set(interaction.user.id, existing);

      const attackText = [
        `Bạn gây **${formatNumber(finalDamage)}** sát thương lên boss.`,
        `Roll gốc: **${formatNumber(rolledDamage)}**`,
        `Level ${playerLevel}: **+${formatNumber(playerLevel * 5)}**`,
        `ATK: **+${formatNumber(bonusAttack)}**`,
        `Xuyên giáp: **+${formatNumber(armorPenBonus)}**`,
        isCritical ? `Chí mạng: **x${profile.stats.critMultiplier}**` : `Crit hiện tại: **${formatNumber(critChance)}%**`,
      ].join(' ');

      if (state.hp <= 0) {
        state.hp = 0;
        state.defeated = true;

        await rewardParticipants(state);

        await interaction.update({
          embeds: [
            buildBossEmbed(
              state,
              `${interaction.user} đã tung đòn kết liễu boss test.`
            ).setFields(
              {
                name: 'Người triệu hồi',
                value: `<@${state.ownerId}>`,
                inline: true,
              },
              {
                name: 'Kết quả',
                value: `Boss đã bị tiêu diệt bởi <@${interaction.user.id}>`,
                inline: true,
              },
              {
                name: 'Bảng thưởng',
                value: buildVictorySummary(state),
              }
            ),
          ],
          components: buildBossButtons(true),
        });

        ACTIVE_BOSSES.delete(guildId);
        collector.stop('defeated');
        return;
      }

      await interaction.update({
        embeds: [
          buildBossEmbed(
            state,
            `${interaction.user} vừa tấn công boss. ${attackText}`
          ),
        ],
        components: buildBossButtons(false),
      });
    } catch (error) {
      console.log(error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'Có lỗi xảy ra khi xử lý đòn đánh.',
          ephemeral: true,
        });
      }
    } finally {
      state.locked = false;
    }
  });

  collector.on('end', async (_, reason) => {
    if (reason === 'defeated') return;

    ACTIVE_BOSSES.delete(guildId);

    if (state.hp > 0) {
      try {
        await bossMessage.edit({
          embeds: [
            buildBossEmbed(state, 'Hết thời gian, boss test đã rút lui khỏi chiến trường.'),
          ],
          components: buildBossButtons(true),
        });
      } catch (error) {
        console.log(error);
      }
    }
  });
};
