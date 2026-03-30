const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { getEquipmentIconPath } = require('./economyItems');

function createEquipmentIconAttachment(meta) {
  if (!meta?.slot) return null;

  const iconPath = getEquipmentIconPath(meta.slot, meta.set);
  if (!iconPath || !fs.existsSync(iconPath)) return null;

  const name = path.basename(iconPath);
  return {
    attachment: new AttachmentBuilder(iconPath, { name }),
    url: `attachment://${name}`,
  };
}

module.exports = {
  createEquipmentIconAttachment,
};
