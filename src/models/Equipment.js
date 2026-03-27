const { Schema, model } = require('mongoose');

const equipmentSlotSchema = new Schema(
  {
    itemId: { type: String, default: null },
    type: { type: String, default: null },
    itemLevel: { type: Number, default: 0 },
  },
  { _id: false }
);

const equipmentSchema = new Schema(
  {
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    weapon: { type: equipmentSlotSchema, default: () => ({}) },
    armor: { type: equipmentSlotSchema, default: () => ({}) },
    gloves: { type: equipmentSlotSchema, default: () => ({}) },
    helmet: { type: equipmentSlotSchema, default: () => ({}) },
    boots: { type: equipmentSlotSchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = model('Equipment', equipmentSchema);
