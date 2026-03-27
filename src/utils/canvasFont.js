const path = require('node:path');
const { GlobalFonts } = require('@napi-rs/canvas');

const ARIAL_FONT_ALIAS = 'Discordhost Arial';
const ARIAL_FONT_PATH = path.join(__dirname, '../../font/Font-Arial/SVN-Arial Regular.ttf');
const CANVAS_FONT_FAMILY = `"${ARIAL_FONT_ALIAS}", Arial, sans-serif`;

let fontReady = false;

function ensureCanvasFont() {
  if (fontReady) {
    return CANVAS_FONT_FAMILY;
  }

  try {
    if (!GlobalFonts.has(ARIAL_FONT_ALIAS)) {
      GlobalFonts.registerFromPath(ARIAL_FONT_PATH, ARIAL_FONT_ALIAS);
    }
    fontReady = true;
  } catch (error) {
    console.warn(`[canvasFont] Khong the dang ky font Arial tu ${ARIAL_FONT_PATH}:`, error.message);
  }

  return CANVAS_FONT_FAMILY;
}

module.exports = {
  CANVAS_FONT_FAMILY,
  ensureCanvasFont,
};
