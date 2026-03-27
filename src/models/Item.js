const { Schema, model } = require('mongoose');

const itemSchema = new Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  type: { type: String, required: true },   // guard, lock, shield, luck, etc
  itemLevel: { type: Number, default: 0 },
  upgradeLevel: { type: Number, default: 0 },
  quantity: { type: Number, default: 1 },  // stackable
  expiresAt: { type: Number, default: 0 }, // 0 = vĩnh viễn
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = model('Item', itemSchema);
