const SUITS = {
  hearts: {
    key: 'hearts',
    symbol: 'H',
    name: 'co',
    label: 'cơ',
  },
  clubs: {
    key: 'clubs',
    symbol: 'C',
    name: 'chuon',
    label: 'chuồn',
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

const PLAYING_CARDS = {
  '2H': 'https://media.discordapp.net/attachments/1480800407889510470/1486921141212942476/ebe434953cb5c82ec5c8e38b8e735489.jpg?ex=69c742b9&is=69c5f139&hm=f38fdee30a695869c74b59cdf015ea3856adcf52e6685a3abc728ab29fd3dda9&=&format=webp',
  '3H': 'https://media.discordapp.net/attachments/1480800407889510470/1486921141510602782/7278d51dda50bd4b8c8cadb7fe349953.jpg?ex=69c742b9&is=69c5f139&hm=5c401a13bbc7bf2f6e6530d01f206308cbd5db61ecdc0de69384c30c0287c8a4&=&format=webp',
  '4H': 'https://media.discordapp.net/attachments/1480800407889510470/1486921141787431002/6695f1d514765572dfe7e5dd0863dfce.jpg?ex=69c742b9&is=69c5f139&hm=663ba29d88d95b1712c43ca456c5fa9d8281d38986389c9ceb90c05d763dd7a7&=&format=webp',
  '5H': 'https://media.discordapp.net/attachments/1480800407889510470/1486921142123106304/5457f189cabc0476511c7ed1421b419d.jpg?ex=69c742b9&is=69c5f139&hm=84b433ee26b3fe3596cc6237515d1cd1c6c2eac05366a90ec3c3a99d05789d55&=&format=webp&width=358&height=548',
  '6H': 'https://media.discordapp.net/attachments/1480800407889510470/1486921142408183808/84564e31bf0a0e8bcd5fdd3d4aa12cc3.jpg?ex=69c742ba&is=69c5f13a&hm=4f3d8550544580a56118909d10909197437a1d92c9b0dd170c1bfee6d4ff10ae&=&format=webp&width=358&height=548',
  '7H': 'https://media.discordapp.net/attachments/1480800407889510470/1486921211878572042/c8475b530ea9f0970ff829c97f3e7abf.jpg?ex=69c742ca&is=69c5f14a&hm=6f398c6d829e709776565a0d492d2f2d5aea0a03efdbbe062617d4c10a3f5bf1&=&format=webp&width=358&height=548',
  '8H': 'https://media.discordapp.net/attachments/1480800407889510470/1486921212503392327/1e9e59b0d6f684908f3ad7d2fe942a42.jpg?ex=69c742ca&is=69c5f14a&hm=788fa09388fb61f4576257fd0880ca003b27170b63f6f1e1ec4e641582c39eb1&=&format=webp&width=358&height=548',
  '9H': 'https://media.discordapp.net/attachments/1480800407889510470/1486921213258502334/33ab7891b4259ea8d8823a352ef38cdf.jpg?ex=69c742ca&is=69c5f14a&hm=c61aacb8b04a6dd98cf1cbe29cab53bac107d920dfb71c88978b8ea4ca844384&=&format=webp&width=358&height=548',
  '10H': 'https://media.discordapp.net/attachments/1480800407889510470/1486921213749100614/60ab387c8c1c50dd3a75255500218b94.jpg?ex=69c742cb&is=69c5f14b&hm=3203be37458f8580927ca5a9cb7781b6962827bdaedd58b3cffad68b21b3f253&=&format=webp&width=358&height=548',
  JH: 'https://media.discordapp.net/attachments/1480800407889510470/1486921214479044678/fdf4ffc434ac567c6b77905cb1b11c8a.jpg?ex=69c742cb&is=69c5f14b&hm=14585d3f3489d318ce01ea02a387e26ccc8025001c26ca9313daa3e9f5b101fc&=&format=webp&width=358&height=548',
  QH: 'https://media.discordapp.net/attachments/1480800407889510470/1486921214940156005/63afa62b47efa84b8b87d3e39ef42bc1.jpg?ex=69c742cb&is=69c5f14b&hm=461f68616a2701740431c5fe425b52084b6900d67e51d2dd24c08554382f9d01&=&format=webp&width=358&height=548',
  KH: 'https://media.discordapp.net/attachments/1480800407889510470/1486921215770890390/3b48ae8207b07a1f9477d7e6135ca211.jpg?ex=69c742cb&is=69c5f14b&hm=315a422fea5c7b0994dd96e8d5a0b02a99445459d0b2965df23d81d7d96333fb&=&format=webp&width=356&height=548',
  AH: 'https://media.discordapp.net/attachments/1480800407889510470/1486921216265814200/a762540d55018bcf43ffba8b6343c9c9.jpg?ex=69c742cb&is=69c5f14b&hm=c892b6a84ea0b4bb9995df265505076c277a17c063212d899c2f88306f50ed60&=&format=webp&width=358&height=548',
  '2C': 'https://media.discordapp.net/attachments/1480800407889510470/1486921268891615333/136dab439961d61f4b9c1f939e07828d.jpg?ex=69c742d8&is=69c5f158&hm=11e4420bad2231bb7824bf9b0e9f20b72f6b222f897dd51b4369ae01fd627f4e&=&format=webp&width=358&height=548',
  '3C': 'https://media.discordapp.net/attachments/1480800407889510470/1486921269315108954/6ed5bf64f008d72e83c67f81468ab7c5.jpg?ex=69c742d8&is=69c5f158&hm=2474d412e5f567ea53c4a325152740187a62c67d1003d477e2104639449aaa00&=&format=webp&width=358&height=548',
  '4C': 'https://media.discordapp.net/attachments/1480800407889510470/1486921269638201374/23c51e0b449e342f8b7f6c8fd57e2137.jpg?ex=69c742d8&is=69c5f158&hm=af70658de269f2a1613e99e8e46b3998f0e416a60eccd0723251540ed6c60e6c&=&format=webp&width=358&height=548',
  '5C': 'https://media.discordapp.net/attachments/1480800407889510470/1486921269952643242/3ac88eddd1ac03bfc901de76424b5aba.jpg?ex=69c742d8&is=69c5f158&hm=84634e4cc36113a6c7edba05a471fdfa549faea96621e1b5206706a77a2015fd&=&format=webp&width=358&height=548',
  '6C': 'https://media.discordapp.net/attachments/1480800407889510470/1486921270355300414/5c96f40f637a6b2ed34d5e837d81ef7b.jpg?ex=69c742d8&is=69c5f158&hm=3a247e0b5ab9f664644ca1e5d5764d613f8d213dd903712de24347a4014df97a&=&format=webp&width=356&height=548',
  '7C': 'https://media.discordapp.net/attachments/1480800407889510470/1486921270816805015/4808cc416c976dbd5c3cb629a0f102a5.jpg?ex=69c742d8&is=69c5f158&hm=5e5f19f92a1efba28f8d42dc3ea00638d92967e7759166d489c7a3c43acdbd5c&=&format=webp&width=358&height=548',
  '8C': 'https://media.discordapp.net/attachments/1480800407889510470/1486921271202676806/a46a54d93ff6e543497d205db97fd460.jpg?ex=69c742d8&is=69c5f158&hm=eeb45489b72c11e0b9189c05b0a65c2854085e6429129e829d5e41dcc5fc30cf&=&format=webp&width=358&height=548',
  '9C': 'https://media.discordapp.net/attachments/1480800407889510470/1486921271689351228/4f8d0d8f2ebaeacf99e7134221d6da49.jpg?ex=69c742d8&is=69c5f158&hm=4d1ec64082ed80f4b46bc2d4f0ec1c2f7b7fa69ef3eafc5c03b1d11bde51f36a&=&format=webp&width=358&height=548',
  '10C': 'https://media.discordapp.net/attachments/1480800407889510470/1486921271961976872/1963502749c024e1590789bab3632bc9.jpg?ex=69c742d8&is=69c5f158&hm=6bdd2683f13eef8da5650362a6e966640ba97622979df9ffe0b7004c9e6fa6cf&=&format=webp&width=358&height=548',
  JC: 'https://media.discordapp.net/attachments/1480800407889510470/1486921272280485949/1595a3ea21f452c290cf26af7ae53ede.jpg?ex=69c742d8&is=69c5f158&hm=51087e06c75afa6f36d1aee9d121cbdc40adb01e6bb9dfda59f8a96a5ffbb9be&=&format=webp&width=358&height=548',
  QC: 'https://media.discordapp.net/attachments/1480800407889510470/1486921280073498755/d6296277472d7e9594d0ebee0cb82cdc.jpg?ex=69c742da&is=69c5f15a&hm=9e495e56b87e0e01bda1fb8edfcd242a5f7ac6f18da7f0c6bf19cf4d038645d0&=&format=webp&width=358&height=548',
  KC: 'https://media.discordapp.net/attachments/1480800407889510470/1486921280379945111/aa73cfd0e548d87f4af4a18a8d2c3c8f.jpg?ex=69c742da&is=69c5f15a&hm=bd92719225d4fcdd99da5b08336c5f026cec303397f33b1c3f5e4d2d0d50175c&=&format=webp&width=358&height=548',
  AC: 'https://media.discordapp.net/attachments/1480800407889510470/1486921280715362444/17ca9f77b395a41c6d45cbff350573bb.jpg?ex=69c742da&is=69c5f15a&hm=f2e12cb648babcf68eb5bdae1461414b5e1ba1b1734d1f0d0118735578860ce5&=&format=webp&width=358&height=548',
  '2D': 'https://media.discordapp.net/attachments/1480800407889510470/1486921380338466857/1451de5d494406e395215276a2489a7c.jpg?ex=69c742f2&is=69c5f172&hm=cd5d98b74c88cc95579637ed5038f39f0e24d7fac87b2ef9003f733147fcbeae&=&format=webp&width=358&height=548',
  '3D': 'https://media.discordapp.net/attachments/1480800407889510470/1486921380707569725/690d5a477dfe9ed93261bd814c0a40d6.jpg?ex=69c742f2&is=69c5f172&hm=078782b2facead6c53394cd29201721f49daf6bf951498e0ce5af4c74e9b0104&=&format=webp&width=358&height=548',
  '4D': 'https://media.discordapp.net/attachments/1480800407889510470/1486921381051498686/89eaac32133444fe40876cb51f697f13.jpg?ex=69c742f2&is=69c5f172&hm=39ec755e123ae1467a641ab11bbd2a4c6dea178b801ab682a99f8379a7e0856c&=&format=webp&width=358&height=548',
  '5D': 'https://media.discordapp.net/attachments/1480800407889510470/1486921381370396842/24fd440cbb52affc5242a507c9dec4d1.jpg?ex=69c742f2&is=69c5f172&hm=4254276f1d7b688a9ed0b55a6e789522619173c10656c2810420cd8f1e499724&=&format=webp&width=358&height=548',
  '6D': 'https://media.discordapp.net/attachments/1480800407889510470/1486921381659541588/ff1c62992cf49b6164401d1d9f77a20c.jpg?ex=69c742f3&is=69c5f173&hm=c68919d91bf557e313483c387b8c20d42100b8775800de51b520e1e3212a2321&=&format=webp&width=358&height=548',
  '7D': 'https://media.discordapp.net/attachments/1480800407889510470/1486921382255398972/58d872f063752027e59e15af4d090123.jpg?ex=69c742f3&is=69c5f173&hm=d4d980e03a84d4bb667a8e49b391b6661c2fd191b08a0b8b268f00a84fa6a38b&=&format=webp&width=356&height=548',
  '8D': 'https://media.discordapp.net/attachments/1480800407889510470/1486921382628688043/fcafeaf2d610109aa1916208080ab711.jpg?ex=69c742f3&is=69c5f173&hm=39448b7e8e42b3464bcc96e90394c005ccfc41085607c435cd9f91ccb51d33f3&=&format=webp&width=358&height=548',
  '9D': 'https://media.discordapp.net/attachments/1480800407889510470/1486921383240794162/1d495bb1ebf632dca66a538b61bae19a.jpg?ex=69c742f3&is=69c5f173&hm=42736863069624dbf638edb55e250c267e8bc38345d43a9bcc4b90238e882d93&=&format=webp&width=358&height=548',
  '10D': 'https://media.discordapp.net/attachments/1480800407889510470/1486921383622607038/39ef422e15761450c33f8cb3ee369ebe.jpg?ex=69c742f3&is=69c5f173&hm=99d62c26742e0fc2c45095df52d205f8e50c4b58518d537e48d9269acb4f6c03&=&format=webp&width=358&height=548',
  JD: 'https://media.discordapp.net/attachments/1480800407889510470/1486921383916081285/d5682eb454510b9cdf54beb9c5a0e5f5.jpg?ex=69c742f3&is=69c5f173&hm=caa39a6856228e8d1243d25bb887d46655423012ed2c496534d39dd8bf05a7ee&=&format=webp&width=358&height=548',
  QD: 'https://media.discordapp.net/attachments/1480800407889510470/1486921394938843298/6940967da8669e3410fefd3a8a33aad9.jpg?ex=69c742f6&is=69c5f176&hm=f4e63fa96f30077549da279781db4d658dc2586fb3cc6d3fe2f271f11b02835a&=&format=webp&width=358&height=548',
  KD: 'https://media.discordapp.net/attachments/1480800407889510470/1486921395270324286/6b5b30c00309e3cfae486f543bc1809a.jpg?ex=69c742f6&is=69c5f176&hm=04aa4abc5114e53e523adcca1abc0854990e7baea75361e8dd13cbf874eef69f&=&format=webp&width=358&height=548',
  AD: 'https://media.discordapp.net/attachments/1480800407889510470/1486921395584634921/f37d608fb18056bc4f83737d633c5cf5.jpg?ex=69c742f6&is=69c5f176&hm=d6fcab290d347dfbb9ed4e25dde6a50c1ca2bbb4cac00e9a1606895f366c45b8&=&format=webp&width=358&height=548',
  '2S': 'https://media.discordapp.net/attachments/1480800407889510470/1486921448122744903/33c964ae685ff65233d2ac2c35b96072.jpg?ex=69c74302&is=69c5f182&hm=3f3ca5b6d3f20bccff2e116d3acaf18a683c18c6eeb57bf3f403427558ab956c&=&format=webp&width=358&height=548',
  '3S': 'https://media.discordapp.net/attachments/1480800407889510470/1486921448420282459/9638bf9f29919b027765992a81f6d39b.jpg?ex=69c74302&is=69c5f182&hm=ad2ed7cfb9f5cfc676f00930534f5acbb0eb70da2841b169829a4ccc2416981b&=&format=webp&width=358&height=548',
  '4S': 'https://media.discordapp.net/attachments/1480800407889510470/1486921448760283228/5156259e1f30dece1376dc5695a9a1d4.jpg?ex=69c74303&is=69c5f183&hm=40980694a8d327ba0d8d7d5a6dad36b026400764c3b4fe92ff4beb125f41dd6b&=&format=webp&width=358&height=548',
  '5S': 'https://media.discordapp.net/attachments/1480800407889510470/1486921449062011021/5ab3d8627d0c4d17c86c73d90817900b.jpg?ex=69c74303&is=69c5f183&hm=93e6def27cda88972d0fa29dd2513ab388cc5ba667e2cf9c1d82af10267b7547&=&format=webp&width=358&height=548',
  '6S': 'https://media.discordapp.net/attachments/1480800407889510470/1486921449427042334/c99b0f04000841e5f3db53d64b3f7034.jpg?ex=69c74303&is=69c5f183&hm=4a5127cadbebaee4c27c3b8dd5ff25168c6b79e716c19384ae1cd59802967fa3&=&format=webp&width=356&height=548',
  '7S': 'https://media.discordapp.net/attachments/1480800407889510470/1486921449699803317/82d62864ff67ff7b5e20150316d26872.jpg?ex=69c74303&is=69c5f183&hm=41d3fa7d06fa3258d6542fb413de18f0b3dca9b21b06f09fb270ac2b5793a7d5&=&format=webp&width=358&height=548',
  '8S': 'https://media.discordapp.net/attachments/1480800407889510470/1486921449988952238/497eed1efa7e554de5b62bc9eb2b5ae6.jpg?ex=69c74303&is=69c5f183&hm=1dc114c74521934147cf2e8c2543d8b81421d5ecb9cc74ba76194db5de1d75d6&=&format=webp&width=358&height=548',
  '9S': 'https://media.discordapp.net/attachments/1480800407889510470/1486921450299457566/50caac183ef66afe6cdda1d2e3daafda.jpg?ex=69c74303&is=69c5f183&hm=db6e34ec028cc4fcece3bf3c9a80d6d157dded497b4b84fc4922d4e919f55678&=&format=webp&width=358&height=548',
  '10S': 'https://media.discordapp.net/attachments/1480800407889510470/1486921450647715890/b208cd7f21ce87cf950936ab6fb3e717.jpg?ex=69c74303&is=69c5f183&hm=6cd07be9a464d70b8b0cd7c40992e84e5316c30d9caa38ce5b29636a08a7743e&=&format=webp&width=358&height=548',
  JS: 'https://media.discordapp.net/attachments/1480800407889510470/1486921450932670614/89d2c97e62fcaec36c80dbdd725f216f.jpg?ex=69c74303&is=69c5f183&hm=cef732b8bcd8526407244bd9f90af453bc40f3497b615de6d0b36ec04825ff78&=&format=webp&width=358&height=548',
  QS: 'https://media.discordapp.net/attachments/1480800407889510470/1486921483669475328/9026849bcbad6fd92f7c3cb8f70e3cd4.jpg?ex=69c7430b&is=69c5f18b&hm=e299e59c247b15b3f23102dd833b62e41b1c60033659fdf1bcbaa64d2084df95&=&format=webp&width=358&height=548',
  KS: 'https://media.discordapp.net/attachments/1480800407889510470/1486921484403343420/e8d1a4cfe9d8dca64733c050e65e9dfd.jpg?ex=69c7430b&is=69c5f18b&hm=cdfe8f0a38fa29a7010406bd11d3ff019028641e8f2f9def5b418228c74ce493&=&format=webp&width=358&height=548',
  AS: 'https://media.discordapp.net/attachments/1480800407889510470/1486921485087019248/e6a6d2f8a350079dcad97e814d3559e7.jpg?ex=69c7430b&is=69c5f18b&hm=b7cf85b8a7cc224cd086887ffd78cd3c568d4bf5c8420cb37d0db698a4dc138c&=&format=webp&width=358&height=548',
};

const CARD_BACKS = {
  black: 'https://media.discordapp.net/attachments/1480800407889510470/1486921688498311219/6dd336f36191dd80edc426bad6e0c546.jpg?ex=69c7433c&is=69c5f1bc&hm=26491d1980c01433d56a14c75b5ccf710ba9c7bccd18b9d88a02e949bbc19ae0&=&format=webp&width=385&height=548',
  red: 'https://media.discordapp.net/attachments/1480800407889510470/1486921688171020308/3706fe90a48251c493f8a18937544516.jpg?ex=69c7433c&is=69c5f1bc&hm=6c83a732a988134978d7feff938da55e3c36ff3c49335d9ecacc1d55fb6e968a&=&format=webp&width=385&height=548',
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
