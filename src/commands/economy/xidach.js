const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ApplicationCommandOptionType,
} = require('discord.js');
const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fetch = require('node-fetch');

const User = require('../../models/User');
const { addMissionProgress } = require('../../utils/dailyMissions');
const { ensureCanvasFont } = require('../../utils/canvasFont');
const {
  CARD_BACKS,
  PLAYING_CARDS,
  getCardMeta,
  getPlayingCardUrl,
} = require('../../utils/playingCards');

const MIN_BET = 50;
const MAX_BET = 1000000;
const HIT_BUTTON_ID = 'xidach_hit';
const STAND_BUTTON_ID = 'xidach_stand';
const ACTIVE_GAMES = new Set();
const IMAGE_CACHE = new Map();
const CANVAS_FONT_FAMILY = ensureCanvasFont();

function shuffle(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function createDeck() {
  return shuffle(Object.keys(PLAYING_CARDS));
}

function drawCard(deck) {
  return deck.shift() || null;
}

function getCardValue(cardCode) {
  const meta = getCardMeta(cardCode);
  if (!meta) return 0;

  if (meta.rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(meta.rank)) return 10;

  return Number(meta.rank) || 0;
}

function calculateHandValue(cards) {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    const value = getCardValue(card);
    total += value;
    if (value === 11) aces += 1;
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

function isBlackjack(cards) {
  return cards.length === 2 && calculateHandValue(cards) === 21;
}

function formatCardLabel(cardCode) {
  const meta = getCardMeta(cardCode);
  if (!meta) return cardCode;

  return `${meta.rank}${meta.suitLabel}`;
}

function getCardImageUrl(cardCode, hidden = false) {
  if (hidden) return CARD_BACKS.black;
  return getPlayingCardUrl(cardCode) || null;
}

function getResult(state) {
  const playerTotal = calculateHandValue(state.playerCards);
  const dealerTotal = calculateHandValue(state.dealerCards);
  const playerBlackjack = isBlackjack(state.playerCards);
  const dealerBlackjack = isBlackjack(state.dealerCards);

  if (playerTotal > 21) {
    return {
      key: 'lose',
      title: 'Bạn quắc rồi',
      reward: 0,
      color: 'Red',
      summary: `Bạn vượt quá 21 điểm nên thua **${state.bet.toLocaleString('vi-VN')} Wcoin**.`,
    };
  }

  if (dealerTotal > 21) {
    const reward = state.bet * 2;
    return {
      key: 'win',
      title: 'Nhà cái quắc',
      reward,
      color: 'Green',
      summary: `Máy vượt quá 21 điểm. Bạn thắng **${(reward - state.bet).toLocaleString('vi-VN')} Wcoin**.`,
    };
  }

  if (playerBlackjack && !dealerBlackjack) {
    const reward = Math.floor(state.bet * 2.5);
    return {
      key: 'blackjack',
      title: 'Xì dách',
      reward,
      color: 'Gold',
      summary: `Bạn có xì dách ngay từ đầu và ăn **${(reward - state.bet).toLocaleString('vi-VN')} Wcoin**.`,
    };
  }

  if (dealerBlackjack && !playerBlackjack) {
    return {
      key: 'lose',
      title: 'Máy xì dách',
      reward: 0,
      color: 'Red',
      summary: `Nhà cái có xì dách. Bạn thua **${state.bet.toLocaleString('vi-VN')} Wcoin**.`,
    };
  }

  if (playerTotal > dealerTotal) {
    const reward = state.bet * 2;
    return {
      key: 'win',
      title: 'Bạn thắng',
      reward,
      color: 'Green',
      summary: `Bạn cao điểm hơn máy và lời **${(reward - state.bet).toLocaleString('vi-VN')} Wcoin**.`,
    };
  }

  if (playerTotal < dealerTotal) {
    return {
      key: 'lose',
      title: 'Máy thắng',
      reward: 0,
      color: 'Red',
      summary: `Máy cao điểm hơn. Bạn thua **${state.bet.toLocaleString('vi-VN')} Wcoin**.`,
    };
  }

  return {
    key: 'push',
    title: 'Hòa tiền',
    reward: state.bet,
    color: 'Blue',
    summary: `Hai bên bằng điểm, bạn được hoàn lại **${state.bet.toLocaleString('vi-VN')} Wcoin**.`,
  };
}

function buildButtons(disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(HIT_BUTTON_ID)
        .setLabel('Rút thêm')
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(STAND_BUTTON_ID)
        .setLabel('Dằn bài')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled)
    ),
  ];
}

async function loadCardImage(url) {
  if (!url) return null;

  if (!IMAGE_CACHE.has(url)) {
    IMAGE_CACHE.set(
      url,
      (async () => {
        if (!/^https?:/i.test(url)) {
          return loadImage(path.resolve(url));
        }

        const response = await fetch(url, { timeout: 8000 });
        if (!response.ok) {
          throw new Error(`Không tải được ảnh lá bài: ${response.status}`);
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

function drawCardFallback(ctx, x, y, width, height, label, hidden = false) {
  roundRect(ctx, x, y, width, height, 12);
  ctx.fillStyle = hidden ? '#334155' : '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = hidden ? '#94a3b8' : '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = hidden ? '#e2e8f0' : '#0f172a';
  ctx.font = `bold ${hidden ? 26 : 22}px ${CANVAS_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText(hidden ? '?' : label, x + width / 2, y + height / 2 + 8);
  ctx.textAlign = 'left';
}

async function drawHand(ctx, cards, x, y, options = {}) {
  const hideSecondCard = options.hideSecondCard || false;
  const cardWidth = 132;
  const cardHeight = 202;
  const gap = 144;

  for (let index = 0; index < cards.length; index += 1) {
    const hidden = hideSecondCard && index === 1;
    const imageUrl = getCardImageUrl(cards[index], hidden);
    const drawX = x + index * gap;

    try {
      const image = await loadCardImage(imageUrl);
      ctx.drawImage(image, drawX, y, cardWidth, cardHeight);
    } catch {
      drawCardFallback(ctx, drawX, y, cardWidth, cardHeight, formatCardLabel(cards[index]), hidden);
    }
  }
}

async function renderBoard(state, revealDealer = false) {
  const width = 980;
  const height = 760;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#050505');
  bg.addColorStop(1, '#111111');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 10; i += 1) {
    ctx.beginPath();
    ctx.arc(50 + i * 75, 30 + (i % 3) * 95, 2 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }

  roundRect(ctx, 18, 18, width - 36, height - 36, 18);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const dealerShownCards = revealDealer ? state.dealerCards : [state.dealerCards[0]];
  const dealerScore = revealDealer
    ? calculateHandValue(state.dealerCards)
    : `${calculateHandValue(dealerShownCards)}+`;
  const playerScore = calculateHandValue(state.playerCards);

  ctx.fillStyle = '#f8fafc';
  ctx.font = `bold 46px ${CANVAS_FONT_FAMILY}`;
  ctx.fillText('Xi dach', 28, 64);
  ctx.font = `30px ${CANVAS_FONT_FAMILY}`;
  ctx.fillText(`Cuoc: ${state.bet.toLocaleString('vi-VN')} Wcoin`, 28, 110);

  ctx.fillStyle = '#fde68a';
  ctx.font = `bold 36px ${CANVAS_FONT_FAMILY}`;
  ctx.fillText(`May (${dealerScore} diem)`, 28, 172);
  await drawHand(ctx, state.dealerCards, 28, 216, { hideSecondCard: !revealDealer });

  ctx.fillStyle = '#bfdbfe';
  ctx.font = `bold 36px ${CANVAS_FONT_FAMILY}`;
  ctx.fillText(`${state.username} (${playerScore} diem)`, 28, 492);
  await drawHand(ctx, state.playerCards, 28, 536);

  return canvas.toBuffer('image/png');
}

async function createGameReply(state, options = {}) {
  const revealDealer = options.revealDealer || false;
  const result = options.result || null;
  const note = options.note || null;
  const board = await renderBoard(state, revealDealer);
  const attachment = new AttachmentBuilder(board, { name: 'xidach-board.png' });

  const embed = new EmbedBuilder()
    .setTitle(result ? `Xì dách: ${result.title}` : 'Xì dách với máy')
    .setColor(result?.color || 'DarkGreen')
    .setDescription(
      result
        ? `${result.summary}\nSố dư hiện tại: **${state.user.balance.toLocaleString('vi-VN')} Wcoin**.${note ? `\n${note}` : ''}`
        : `Bấm **Rút thêm** để rút thêm hoặc **Dằn bài** để dừng ở điểm hiện tại.${note ? `\n${note}` : ''}`
    )
    .setImage('attachment://xidach-board.png');

  return {
    embeds: [embed],
    files: [attachment],
    components: result ? buildButtons(true) : buildButtons(false),
  };
}

async function settleGame(interaction, state, reasonNote = '') {
  while (calculateHandValue(state.dealerCards) < 17) {
    const nextCard = drawCard(state.deck);
    if (!nextCard) break;
    state.dealerCards.push(nextCard);
  }

  const result = getResult(state);
  state.user.balance += result.reward;
  await state.user.save();

  if (result.key === 'win' || result.key === 'blackjack') {
    await addMissionProgress(state.user.userId, state.user.guildId, 'win_game', 1);
  }

  await interaction.editReply(
    await createGameReply(state, {
      revealDealer: true,
      result,
      note: reasonNote,
    })
  );
}

module.exports = {
  name: 'xidach',
  description: 'Chơi xì dách với máy bằng bộ bài',
  options: [
    {
      name: 'cuoc',
      description: `Số Wcoin muốn cược (${MIN_BET}-${MAX_BET})`,
      type: ApplicationCommandOptionType.Integer,
      required: false,
      minValue: MIN_BET,
      maxValue: MAX_BET,
    },
  ],

  callback: async (client, interaction) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: 'Chỉ dùng trong server!',
        ephemeral: true,
      });
    }

    const gameKey = `${interaction.guild.id}:${interaction.user.id}`;
    if (ACTIVE_GAMES.has(gameKey)) {
      return interaction.reply({
        content: 'Bạn đang có một ván xì dách chưa kết thúc.',
        ephemeral: true,
      });
    }

    ACTIVE_GAMES.add(gameKey);

    let collector = null;
    let shouldCleanupNow = true;

    try {
      await interaction.deferReply();

      const bet = interaction.options.getInteger('cuoc') || 100;
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      let user = await User.findOne({ userId, guildId });
      if (!user) {
        user = new User({ userId, guildId, balance: 0 });
      }

      if ((user.balance || 0) < bet) {
        return interaction.editReply(
          `Bạn cần ít nhất **${bet.toLocaleString('vi-VN')} Wcoin** để chơi ván này.`
        );
      }

      user.balance -= bet;
      await user.save();
      await addMissionProgress(userId, guildId, 'play_game', 1);

      const deck = createDeck();
      const state = {
        bet,
        deck,
        user,
        username: interaction.user.username,
        playerCards: [drawCard(deck), drawCard(deck)],
        dealerCards: [drawCard(deck), drawCard(deck)],
      };

      const playerBlackjack = isBlackjack(state.playerCards);
      const dealerBlackjack = isBlackjack(state.dealerCards);

      if (playerBlackjack || dealerBlackjack) {
        await settleGame(interaction, state);
        return;
      }

      await interaction.editReply(
        await createGameReply(state, {
          revealDealer: false,
          note: 'Máy đang úp 1 lá bài.',
        })
      );

      const message = await interaction.fetchReply();
      collector = message.createMessageComponentCollector({
        time: 60000,
        filter: (buttonInteraction) =>
          buttonInteraction.user.id === interaction.user.id
          && [HIT_BUTTON_ID, STAND_BUTTON_ID].includes(buttonInteraction.customId),
      });

      shouldCleanupNow = false;

      collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.customId === HIT_BUTTON_ID) {
          const nextCard = drawCard(state.deck);
          if (nextCard) {
            state.playerCards.push(nextCard);
          }

          const playerTotal = calculateHandValue(state.playerCards);

          if (playerTotal >= 21) {
            collector.stop(playerTotal > 21 ? 'bust' : 'stand');
            await buttonInteraction.deferUpdate();
            await settleGame(interaction, state);
            return;
          }

          await buttonInteraction.update(
            await createGameReply(state, {
              revealDealer: false,
              note: `Bạn vừa rút thêm 1 lá. Điểm hiện tại: **${playerTotal}**.`,
            })
          );
          return;
        }

        collector.stop('stand');
        await buttonInteraction.deferUpdate();
        await settleGame(interaction, state);
      });

      collector.on('end', async (_, reason) => {
        try {
          if (['stand', 'bust'].includes(reason)) {
            return;
          }

          if (reason === 'time') {
            await settleGame(interaction, state, 'Hết 60 giây nên hệ thống tự dằn bài.');
            return;
          }

          await interaction.editReply({
            components: buildButtons(true),
          });
        } finally {
          ACTIVE_GAMES.delete(gameKey);
        }
      });
    } catch (error) {
      console.log(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('Đã xảy ra lỗi khi chạy game xì dách.');
      } else {
        await interaction.reply({
          content: 'Đã xảy ra lỗi khi chạy game xì dách.',
          ephemeral: true,
        });
      }
    } finally {
      if (shouldCleanupNow && !collector) {
        ACTIVE_GAMES.delete(gameKey);
      }
    }
  },
};
