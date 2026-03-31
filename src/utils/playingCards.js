const path = require('node:path');

const SUITS = {
  hearts: {
    key: 'hearts',
    symbol: 'H',
    name: 'co',
    label: 'co',
  },
  clubs: {
    key: 'clubs',
    symbol: 'C',
    name: 'chuon',
    label: 'chu?n',
  },
  diamonds: {
    key: 'diamonds',
    symbol: 'D',
    name: 'ro',
    label: 'rô',
  },
  spades: {
    key: 'spades',
    symbol: 'S',
    name: 'bich',
    label: 'bích',
  },
};

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const CARD_IMAGE_DIR = path.join(__dirname, '../game/icon/cards');

const PLAYING_CARDS = Object.fromEntries(
  RANKS.flatMap((rank) => ['H', 'C', 'D', 'S'].map((suit) => {
    const code = `${rank}${suit}`;
    return [code, path.join(CARD_IMAGE_DIR, `${code}.png`)];
  }))
);

const CARD_BACKS = {
  black: path.join(CARD_IMAGE_DIR, 'back-blue.png'),
  red: path.join(CARD_IMAGE_DIR, 'back-blue.png'),
};

function normalizeCardCode(input) {
  if (!input) return null;

  const normalized = String(input).trim().toUpperCase().replace(/\s+/g, '');
  return PLAYING_CARDS[normalized] ? normalized : null;
}

function getPlayingCardUrl(cardCode) {
  const normalizedCode = normalizeCardCode(cardCode);
  return normalizedCode ? PLAYING_CARDS[normalizedCode] : null;
}

function getCardMeta(cardCode) {
  const normalizedCode = normalizeCardCode(cardCode);
  if (!normalizedCode) return null;

  const rank = normalizedCode.slice(0, -1);
  const suitSymbol = normalizedCode.slice(-1);
  const suit = Object.values(SUITS).find((item) => item.symbol === suitSymbol);

  if (!suit) return null;

  return {
    code: normalizedCode,
    rank,
    suit: suit.key,
    suitSymbol: suit.symbol,
    suitName: suit.name,
    suitLabel: suit.label,
    url: PLAYING_CARDS[normalizedCode],
  };
}

module.exports = {
  CARD_BACKS,
  PLAYING_CARDS,
  RANKS,
  SUITS,
  getCardMeta,
  getPlayingCardUrl,
  normalizeCardCode,
};
