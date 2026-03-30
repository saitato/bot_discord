const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');

const User = require('../../models/User');
const Item = require('../../models/Item');
const Bag = require('../../models/Bag');
const Level = require('../../models/Level');
const {
  getBossLootPool,
  getBossItemLevel,
  getInventorySlots,
} = require('../../utils/economyItems');
const { createEquipmentIconAttachment } = require('../../utils/equipmentIconAttachment');

const cooldowns = new Set();

function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedPick(entries = []) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;

  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.value;
  }

  return entries[0]?.value ?? null;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function createEmbed(text, thumbnailUrl = null) {
  const embed = new EmbedBuilder().setColor(0xf59e0b).setDescription(text);
  if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
  return embed;
}

const stories = [
  {
    text: (money) => `\u{1F468}\u200D\u{1F9B3} M\u1ED9t \u00F4ng l\u00E3o l\u00E0m r\u01A1i t\u00FAi v\u1EA3i b\u00EAn v\u1EC7 \u0111\u01B0\u1EDDng.\nB\u00EAn trong c\u00F3 v\u00E0i \u0111\u1ED3 l\u1EB7t v\u1EB7t v\u00E0 kho\u1EA3ng **${formatNumber(money)} Wcoin**.`,
    take: (username) => `\u{1F4B8} ${username} nhanh tay gi\u1EA5u m\u00F3n \u0111\u1ED3 nh\u1EB7t \u0111\u01B0\u1EE3c tr\u01B0\u1EDBc khi ch\u1EE7 nh\u00E2n quay l\u1EA1i.`,
    return: (username) => `\u{1F64F} ${username} g\u1ECDi \u00F4ng l\u00E3o l\u1EA1i v\u00E0 trao tr\u1EA3 t\u00FAi v\u1EA3i.`,
  },
  {
    text: (money) => `\u{1F45D} M\u1ED9t chi\u1EBFc v\u00ED c\u0169 n\u1EB1m c\u1EA1nh gh\u1EBF \u0111\u00E1.\nB\u00EAn trong c\u00F2n **${formatNumber(money)} Wcoin** v\u00E0 m\u1ED9t m\u1EA9u gi\u1EA5y ghi ch\u00FA b\u1ECB x\u00E9 d\u1EDF.`,
    take: (username) => `\u{1F440} ${username} nh\u00ECn quanh m\u1ED9t l\u01B0\u1EE3t r\u1ED3i b\u1ECF chi\u1EBFc v\u00ED v\u00E0o t\u00FAi.`,
    return: (username) => `\u2764\uFE0F ${username} \u0111\u1EE9ng ch\u1EDD \u00EDt ph\u00FAt \u0111\u1EC3 tr\u1EA3 l\u1EA1i chi\u1EBFc v\u00ED cho ng\u01B0\u1EDDi \u0111ang t\u00ECm.`,
  },
  {
    text: (money) => `\u{1F4E6} M\u1ED9t g\u00F3i h\u00E0ng b\u1ECB b\u1ECF qu\u00EAn ngay ng\u00F5 nh\u1ECF.\nTi\u1EBFng kim lo\u1EA1i ch\u1EA1m nhau vang l\u00EAn, b\u00EAn trong c\u00F3 kho\u1EA3ng **${formatNumber(money)} Wcoin**.`,
    take: (username) => `\u{1F525} ${username} m\u1EDF g\u00F3i h\u00E0ng ra xem v\u00E0 gi\u1EEF l\u1EA1i nh\u1EEFng g\u00EC c\u00F3 th\u1EC3 d\u00F9ng.`,
    return: (username) => `\u{1F914} ${username} \u0111em g\u00F3i h\u00E0ng giao cho ng\u01B0\u1EDDi v\u1EEBa \u0111\u00E1nh r\u01A1i n\u00F3.`,
  },
  {
    text: (money) => `\u{1F392} M\u1ED9t h\u1ECDc sinh \u0111ang cu\u1ED1ng cu\u1ED3ng t\u00ECm \u0111\u1ED3 tr\u00EAn v\u1EC9a h\u00E8.\nC\u1EA1nh ch\u00E2n b\u1EA1n \u1EA5y c\u00F3 **${formatNumber(money)} Wcoin** v\u00E0 m\u1ED9t chi\u1EBFc h\u1ED9p nh\u1ECF b\u1ECB r\u01A1i ra.`,
    take: (username) => `\u{1F608} ${username} l\u1EB7ng l\u1EBD nh\u1EB7t \u0111\u1ED3 l\u00EAn tr\u01B0\u1EDBc khi ng\u01B0\u1EDDi kia k\u1ECBp ngo\u1EA3nh l\u1EA1i.`,
    return: (username) => `\u{1F97A} ${username} nh\u1EB7t gi\u00FAp v\u00E0 tr\u1EA3 l\u1EA1i to\u00E0n b\u1ED9 cho h\u1ECDc sinh.`,
  },
  {
    text: (money) => `\u{1F575}\uFE0F M\u1ED9t t\u00FAi \u0111\u1ED3 \u0111\u00E1ng ng\u1EDD n\u1EB1m gi\u1EEFa con h\u1EBBm t\u1ED1i.\nB\u00EAn c\u1EA1nh l\u00E0 m\u1EA5y \u0111\u1ED3 v\u1EADt l\u1EA1 v\u00E0 **${formatNumber(money)} Wcoin** bu\u1ED9c d\u00E2y s\u01A1 s\u00E0i.`,
    take: (username) => `\u{1F6A8} ${username} v\u1EEBa ch\u1EA1m v\u00E0o t\u00FAi \u0111\u1ED3 th\u00EC c\u1EA3m gi\u00E1c c\u00F3 ng\u01B0\u1EDDi \u0111ang theo d\u00F5i.`,
    return: (username) => `\u{1F607} ${username} ch\u1ECDn c\u00E1ch tr\u00E1nh r\u1EAFc r\u1ED1i v\u00E0 tr\u1EA3 l\u1EA1i cho \u0111\u00FAng ng\u01B0\u1EDDi.`,
  },
];

function rollMoney(money, minPercent, maxPercent) {
  return Math.floor((money * getRandom(minPercent, maxPercent)) / 100);
}

function rollStoryOutcome(action, money) {
  const takeOutcome = weightedPick([
    { value: { money: rollMoney(money, 35, 80) }, weight: 10 },
    { value: { money: -rollMoney(money, 25, 70) }, weight: 12 },
    { value: { itemRarity: 'common' }, weight: 28 },
    { value: { itemRarity: 'rare' }, weight: 8 },
    { value: { money: 0 }, weight: 42 },
  ]);

  const returnOutcome = weightedPick([
    { value: { money: rollMoney(money, 30, 65) }, weight: 8 },
    { value: { money: -rollMoney(money, 15, 35) }, weight: 4 },
    { value: { itemRarity: 'common' }, weight: 32 },
    { value: { itemRarity: 'rare' }, weight: 14 },
    { value: { money: 0 }, weight: 42 },
  ]);

  return action === 'take' ? takeOutcome : returnOutcome;
}

async function grantStoryEquipment({ userId, guildId, level, rarity }) {
  const lootPool = getBossLootPool(rarity);
  const loot = lootPool[Math.floor(Math.random() * lootPool.length)];
  if (!loot) return { granted: false, blocked: false, loot: null };

  const itemLevel = getBossItemLevel(level || 1);
  let existingItem = await Item.findOne({
    userId,
    guildId,
    type: loot.type,
    itemLevel,
  });

  if (existingItem) {
    existingItem.quantity += 1;
    await existingItem.save();
    return { granted: true, blocked: false, loot, itemLevel, rarity };
  }

  const bag = await Bag.findOne({ userId, guildId });
  const totalSlots = getInventorySlots(bag?.level || 1);
  const usedSlots = await Item.countDocuments({
    userId,
    guildId,
    $or: [{ expiresAt: 0 }, { expiresAt: { $gt: Date.now() } }],
  });

  if (usedSlots >= totalSlots) {
    return { granted: false, blocked: true, loot, itemLevel, rarity };
  }

  await Item.create({
    userId,
    guildId,
    type: loot.type,
    itemLevel,
    quantity: 1,
    expiresAt: 0,
  });

  return { granted: true, blocked: false, loot, itemLevel, rarity };
}

function buildResultText(baseMessage, outcome, equipmentResult) {
  const lines = [baseMessage, ''];

  if (typeof outcome.money === 'number') {
    if (outcome.money > 0) {
      lines.push(`\u{1F389} B\u1EA1n nh\u1EADn \u0111\u01B0\u1EE3c **+${formatNumber(outcome.money)} Wcoin**.`);
    } else if (outcome.money < 0) {
      lines.push(`\u{1F480} B\u1EA1n m\u1EA5t **${formatNumber(Math.abs(outcome.money))} Wcoin**.`);
    }
  }

  if (equipmentResult?.granted) {
    lines.push(
      `\u{1F381} B\u1EA1n nh\u1EB7n \u0111\u01B0\u1EE3c **${equipmentResult.loot.name}** Lv ${equipmentResult.itemLevel}.`
    );
  } else if (equipmentResult?.blocked) {
    lines.push(
      `\u{1F4E6} Balo \u0111\u00E3 \u0111\u1EA7y, b\u1EA1n su\u00FDt nh\u1EB7n \u0111\u01B0\u1EE3c **${equipmentResult.loot.name}** Lv ${equipmentResult.itemLevel} nh\u01B0ng kh\u00F4ng c\u00F2n ch\u1ED7 tr\u1ED1ng.`
    );
  }

  if (
    (!('money' in outcome) || outcome.money === 0)
    && (!equipmentResult || (!equipmentResult.granted && !equipmentResult.blocked))
  ) {
    lines.push(`\u{1F610} Kh\u00F4ng c\u00F3 g\u00EC x\u1EA3y ra.`);
  }

  return lines.join('\n');
}

module.exports = async (client, message) => {
  if (!message.inGuild() || message.author.bot) return;

  if (getRandom(1, 1000) > 5) return;

  if (cooldowns.has(message.guild.id)) return;
  cooldowns.add(message.guild.id);
  setTimeout(() => cooldowns.delete(message.guild.id), 20000);

  const money = getRandom(100, 500);
  const story = stories[getRandom(0, stories.length - 1)];

  const msg = await message.channel.send({
    embeds: [createEmbed(story.text(money))],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('take')
          .setLabel('Nh\u1EB7t lu\u00F4n')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('return')
          .setLabel('Tr\u1EA3 l\u1EA1i')
          .setStyle(ButtonStyle.Success)
      ),
    ],
  });

  const collector = msg.createMessageComponentCollector({
    time: 15000,
    max: 1,
  });

  collector.on('collect', async (i) => {
    let user = await User.findOne({
      userId: i.user.id,
      guildId: message.guild.id,
    });

    if (!user) {
      user = new User({
        userId: i.user.id,
        guildId: message.guild.id,
        balance: 0,
      });
    }

    const action = i.customId === 'take' ? 'take' : 'return';
    const outcome = rollStoryOutcome(action, money);
    const levelData = outcome.itemRarity
      ? await Level.findOne({ userId: i.user.id, guildId: message.guild.id })
      : null;

    let equipmentResult = null;
    if (outcome.itemRarity) {
      equipmentResult = await grantStoryEquipment({
        userId: i.user.id,
        guildId: message.guild.id,
        level: levelData?.level || 1,
        rarity: outcome.itemRarity,
      });
    }

    if (typeof outcome.money === 'number' && outcome.money !== 0) {
      user.balance += outcome.money;
      await user.save();
    } else if (user.isNew) {
      await user.save();
    }

    const baseMessage = action === 'take'
      ? story.take(i.user.username)
      : story.return(i.user.username);

    const icon = equipmentResult?.loot ? createEquipmentIconAttachment(equipmentResult.loot) : null;

    await i.update({
      embeds: [createEmbed(buildResultText(baseMessage, outcome, equipmentResult), icon?.url || null)],
      files: icon ? [icon.attachment] : [],
      components: [],
    });
  });

  collector.on('end', (collected) => {
    if (collected.size === 0) {
      msg.edit({
        embeds: [
          createEmbed('\u{1F622} Kh\u00F4ng ai ph\u1EA3n \u1EE9ng. Ng\u01B0\u1EDDi \u0111\u00E1nh r\u01A1i \u0111\u1ED3 \u0111\u00E3 quay l\u1EA1i v\u00E0 mang n\u00F3 \u0111i.'),
        ],
        components: [],
      }).catch(() => null);
    }
  });
};
