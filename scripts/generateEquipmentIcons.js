const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');

const SIZE = 72;
const OUT_DIR = path.join(__dirname, '..', 'src', 'game', 'icon', 'trang-bi');
const SET_KEYS = ['destroyer', 'arcanist', 'chrono', 'phantom', 'guardian', 'sanguine', 'piercer'];

const palette = {
  stroke: '#1f2430',
  metal: '#d9e2f2',
  steel: '#9fb4d9',
  gold: '#f1c24f',
  goldDark: '#bd8730',
  leather: '#7e5131',
  leatherDark: '#5d3a23',
  cloth: '#5677c7',
  clothDark: '#314784',
  ruby: '#d84a5c',
  emerald: '#47b57c',
  shadow: 'rgba(0, 0, 0, 0.18)',
};

const setThemes = {
  destroyer: {
    primary: '#dce5f7',
    secondary: '#b83b3b',
    accent: '#ff6b6b',
    dark: '#4a1d1d',
    aura: 'rgba(216, 74, 92, 0.24)',
    notch: true,
  },
  arcanist: {
    primary: '#89d2ff',
    secondary: '#4b6cb7',
    accent: '#7ef9ff',
    dark: '#273c75',
    aura: 'rgba(76, 201, 240, 0.22)',
    crystal: true,
  },
  chrono: {
    primary: '#b8fff9',
    secondary: '#d4af37',
    accent: '#58c4dd',
    dark: '#355070',
    aura: 'rgba(88, 196, 221, 0.2)',
    ring: true,
  },
  phantom: {
    primary: '#d6c2ff',
    secondary: '#6a00f4',
    accent: '#c77dff',
    dark: '#240046',
    aura: 'rgba(155, 93, 229, 0.24)',
    curved: true,
  },
  guardian: {
    primary: '#eef4ff',
    secondary: '#d9b44a',
    accent: '#9ad1ff',
    dark: '#5c4b1f',
    aura: 'rgba(241, 194, 79, 0.18)',
    broad: true,
  },
  sanguine: {
    primary: '#ff9aa2',
    secondary: '#8b0000',
    accent: '#ff4d6d',
    dark: '#4a0d18',
    aura: 'rgba(184, 15, 47, 0.24)',
    blood: true,
  },
  piercer: {
    primary: '#d8dee9',
    secondary: '#6c757d',
    accent: '#f1c24f',
    dark: '#2b2d42',
    aura: 'rgba(159, 180, 217, 0.18)',
    rapier: true,
  },
};

function ensureOutputDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function setupCanvas() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return { canvas, ctx };
}

function addShadow(ctx, color = palette.shadow, blur = 6, offsetY = 3) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = offsetY;
}

function clearShadow(ctx) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function strokeFill(ctx, fill, stroke = palette.stroke, width = 3) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.fill();
  ctx.stroke();
}

function drawAura(ctx, color) {
  if (!color) return;
  ctx.save();
  addShadow(ctx, color, 16, 0);
  ctx.beginPath();
  ctx.arc(36, 36, 12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.01)';
  ctx.fill();
  clearShadow(ctx);
  ctx.restore();
}

function getSlotTheme(setKey, fallback) {
  if (!setKey) return fallback;
  const theme = setThemes[setKey];
  if (!theme) return fallback;
  return {
    blade: theme.primary,
    edge: '#ffffff',
    guard: theme.secondary,
    hilt: theme.dark,
    gem: theme.accent,
    metal: theme.primary,
    trim: theme.secondary,
    cloth: theme.secondary,
    clothDark: theme.dark,
    aura: theme.aura,
    notch: theme.notch,
    crystal: theme.crystal,
    ring: theme.ring,
    curved: theme.curved,
    broad: theme.broad,
    blood: theme.blood,
    rapier: theme.rapier,
  };
}

function drawSwordBase(ctx, theme) {
  drawAura(ctx, theme.aura);
  addShadow(ctx);
  ctx.save();
  ctx.translate(36, 37);
  ctx.rotate(-0.55);

  const bladeWidth = theme.rapier ? 5 : theme.broad ? 10 : theme.curved ? 7 : 8;
  const halfBlade = bladeWidth / 2;

  ctx.beginPath();
  if (theme.curved) {
    ctx.moveTo(-halfBlade, 4);
    ctx.quadraticCurveTo(-9, -8, -5, -24);
    ctx.lineTo(0, -31);
    ctx.lineTo(6, -24);
    ctx.quadraticCurveTo(9, -7, halfBlade, 6);
    ctx.closePath();
  } else {
    ctx.roundRect(-halfBlade, -24, bladeWidth, 30, 4);
  }
  strokeFill(ctx, theme.blade, palette.stroke, 3);

  ctx.beginPath();
  ctx.moveTo(0, -31);
  ctx.lineTo(halfBlade + 3, -22);
  ctx.lineTo(-(halfBlade + 3), -22);
  ctx.closePath();
  strokeFill(ctx, theme.edge, palette.stroke, 2.5);

  if (theme.notch) {
    ctx.beginPath();
    ctx.moveTo(-halfBlade, -6);
    ctx.lineTo(-(halfBlade + 4), -1);
    ctx.lineTo(-halfBlade, 2);
    ctx.closePath();
    strokeFill(ctx, theme.guard, palette.stroke, 2);
  }

  if (theme.crystal) {
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(4, -12);
    ctx.lineTo(0, -8);
    ctx.lineTo(-4, -12);
    ctx.closePath();
    strokeFill(ctx, theme.gem, palette.stroke, 2);
  }

  ctx.beginPath();
  if (theme.ring) {
    ctx.arc(0, 7, 6, 0, Math.PI * 2);
    strokeFill(ctx, 'transparent', theme.guard, 3);
  } else {
    ctx.roundRect(-14, 4, 28, 6, 3);
    strokeFill(ctx, theme.guard);
  }

  ctx.beginPath();
  ctx.roundRect(-3.5, 10, 7, 15, 3);
  strokeFill(ctx, theme.hilt);

  ctx.beginPath();
  ctx.arc(0, 26, theme.rapier ? 3 : 4, 0, Math.PI * 2);
  strokeFill(ctx, theme.gem, palette.stroke, theme.rapier ? 2.5 : 3);

  if (theme.blood) {
    ctx.beginPath();
    ctx.moveTo(halfBlade, -1);
    ctx.lineTo(halfBlade + 2, 6);
    ctx.lineTo(halfBlade - 1, 9);
    ctx.closePath();
    strokeFill(ctx, theme.guard, theme.dark, 1.5);
  }

  ctx.restore();
  clearShadow(ctx);
}

function drawGlovesBase(ctx, theme) {
  drawAura(ctx, theme.aura);
  addShadow(ctx);
  const drawSingle = (x, flip = 1) => {
    ctx.save();
    ctx.translate(x, 39);
    ctx.scale(flip, 1);

    ctx.beginPath();
    ctx.moveTo(-8, -11);
    ctx.lineTo(2, -14);
    ctx.lineTo(9, -7);
    ctx.lineTo(10, 8);
    ctx.lineTo(3, 15);
    ctx.lineTo(-8, 11);
    ctx.closePath();
    strokeFill(ctx, theme.metal || palette.leather);

    ctx.beginPath();
    ctx.roundRect(-9, 10, 10, 7, 3);
    strokeFill(ctx, theme.cloth || palette.cloth);

    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(5, -19);
    ctx.lineTo(8, -18);
    ctx.lineTo(5, -9);
    ctx.closePath();
    strokeFill(ctx, theme.gem || palette.leatherDark, palette.stroke, 2);

    ctx.restore();
  };

  drawSingle(25, 1);
  drawSingle(47, -1);
  clearShadow(ctx);
}

function drawHelmetBase(ctx, theme) {
  drawAura(ctx, theme.aura);
  addShadow(ctx);
  ctx.beginPath();
  ctx.moveTo(16, 38);
  ctx.quadraticCurveTo(17, 18, 36, 14);
  ctx.quadraticCurveTo(55, 18, 56, 38);
  ctx.lineTo(48, 49);
  ctx.lineTo(24, 49);
  ctx.closePath();
  strokeFill(ctx, theme.metal || palette.steel);

  ctx.beginPath();
  ctx.moveTo(24, 38);
  ctx.quadraticCurveTo(36, 30, 48, 38);
  ctx.lineTo(45, 43);
  ctx.lineTo(27, 43);
  ctx.closePath();
  strokeFill(ctx, theme.dark || palette.stroke, palette.stroke, 2);

  ctx.beginPath();
  ctx.moveTo(36, 13);
  ctx.lineTo(42, 4);
  ctx.lineTo(47, 15);
  ctx.closePath();
  strokeFill(ctx, theme.gem || palette.ruby);

  ctx.beginPath();
  ctx.roundRect(19, 49, 8, 7, 3);
  strokeFill(ctx, theme.trim || palette.goldDark);
  ctx.beginPath();
  ctx.roundRect(45, 49, 8, 7, 3);
  strokeFill(ctx, theme.trim || palette.goldDark);
  clearShadow(ctx);
}

function drawBootsBase(ctx, theme) {
  drawAura(ctx, theme.aura);
  addShadow(ctx);
  const drawSingle = (x, flip = 1) => {
    ctx.save();
    ctx.translate(x, 42);
    ctx.scale(flip, 1);

    ctx.beginPath();
    ctx.moveTo(-7, -14);
    ctx.lineTo(6, -14);
    ctx.lineTo(8, 2);
    ctx.lineTo(14, 6);
    ctx.lineTo(13, 12);
    ctx.lineTo(-10, 12);
    ctx.lineTo(-12, 4);
    ctx.lineTo(-7, 1);
    ctx.closePath();
    strokeFill(ctx, theme.metal || palette.leather);

    ctx.beginPath();
    ctx.roundRect(-8, -17, 12, 6, 2);
    strokeFill(ctx, theme.cloth || palette.cloth);

    ctx.beginPath();
    ctx.roundRect(6, 7, 7, 4, 2);
    strokeFill(ctx, theme.gem || palette.goldDark, palette.stroke, 2);

    ctx.restore();
  };

  drawSingle(25, 1);
  drawSingle(48, -1);
  clearShadow(ctx);
}

function drawArmorBase(ctx, theme) {
  drawAura(ctx, theme.aura);
  addShadow(ctx);
  ctx.beginPath();
  ctx.moveTo(24, 17);
  ctx.lineTo(31, 11);
  ctx.lineTo(41, 11);
  ctx.lineTo(48, 17);
  ctx.lineTo(57, 21);
  ctx.lineTo(53, 32);
  ctx.lineTo(48, 30);
  ctx.lineTo(48, 55);
  ctx.lineTo(24, 55);
  ctx.lineTo(24, 30);
  ctx.lineTo(19, 32);
  ctx.lineTo(15, 21);
  ctx.closePath();
  strokeFill(ctx, theme.metal || palette.steel);

  ctx.beginPath();
  ctx.moveTo(31, 11);
  ctx.lineTo(36, 20);
  ctx.lineTo(41, 11);
  strokeFill(ctx, theme.trim || palette.gold, palette.stroke, 2);

  ctx.beginPath();
  ctx.roundRect(29, 25, 14, 19, 3);
  strokeFill(ctx, theme.dark || palette.clothDark);

  ctx.beginPath();
  ctx.arc(36, 35, 4, 0, Math.PI * 2);
  strokeFill(ctx, theme.gem || palette.gold);
  clearShadow(ctx);
}

function drawRingBase(ctx, theme) {
  drawAura(ctx, theme.aura);
  addShadow(ctx);
  ctx.beginPath();
  ctx.arc(36, 40, 15, 0, Math.PI * 2);
  strokeFill(ctx, theme.trim || palette.gold);

  ctx.beginPath();
  ctx.arc(36, 40, 7, 0, Math.PI * 2);
  strokeFill(ctx, 'transparent', theme.secondary || palette.goldDark, 3);

  ctx.beginPath();
  ctx.moveTo(36, 12);
  ctx.lineTo(45, 22);
  ctx.lineTo(36, 28);
  ctx.lineTo(27, 22);
  ctx.closePath();
  strokeFill(ctx, theme.gem || palette.emerald);
  clearShadow(ctx);
}

const defaultThemes = {
  weapon: {
    blade: palette.metal,
    edge: '#eef4ff',
    guard: palette.goldDark,
    hilt: palette.leather,
    gem: palette.gold,
  },
  gloves: {
    metal: palette.leather,
    cloth: palette.cloth,
    gem: palette.leatherDark,
  },
  helmet: {
    metal: palette.steel,
    dark: palette.stroke,
    trim: palette.goldDark,
    gem: palette.ruby,
  },
  boots: {
    metal: palette.leather,
    cloth: palette.cloth,
    gem: palette.goldDark,
  },
  armor: {
    metal: palette.steel,
    dark: palette.clothDark,
    trim: palette.gold,
    gem: palette.gold,
  },
  ring: {
    trim: palette.gold,
    secondary: palette.goldDark,
    gem: palette.emerald,
  },
};

const slotDrawers = {
  weapon: drawSwordBase,
  gloves: drawGlovesBase,
  helmet: drawHelmetBase,
  boots: drawBootsBase,
  armor: drawArmorBase,
  ring: drawRingBase,
};

function drawSlot(slot, setKey = null) {
  return (ctx) => {
    const theme = setKey ? getSlotTheme(setKey, defaultThemes[slot]) : defaultThemes[slot];
    slotDrawers[slot](ctx, theme);
  };
}

const icons = [
  ['weapon.png', drawSlot('weapon')],
  ['gloves.png', drawSlot('gloves')],
  ['helmet.png', drawSlot('helmet')],
  ['boots.png', drawSlot('boots')],
  ['armor.png', drawSlot('armor')],
  ['ring.png', drawSlot('ring')],
  ...SET_KEYS.flatMap((setKey) => [
    [`weapon-${setKey}.png`, drawSlot('weapon', setKey)],
    [`gloves-${setKey}.png`, drawSlot('gloves', setKey)],
    [`helmet-${setKey}.png`, drawSlot('helmet', setKey)],
    [`boots-${setKey}.png`, drawSlot('boots', setKey)],
    [`armor-${setKey}.png`, drawSlot('armor', setKey)],
    [`ring-${setKey}.png`, drawSlot('ring', setKey)],
  ]),
];

function writeIcon(fileName, drawFn) {
  const { canvas, ctx } = setupCanvas();
  drawFn(ctx);
  fs.writeFileSync(path.join(OUT_DIR, fileName), canvas.toBuffer('image/png'));
}

function main() {
  ensureOutputDir();
  icons.forEach(([fileName, drawFn]) => writeIcon(fileName, drawFn));
  console.log(`Generated ${icons.length} equipment icons in ${OUT_DIR}`);
}

main();
