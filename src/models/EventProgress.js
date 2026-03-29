const { Schema, model } = require('mongoose');

const missionProgressSchema = new Schema({
  missionId: { type: String, required: true },
  type: { type: String, required: true },
  label: { type: String, required: true },
  target: { type: Number, required: true },
  progress: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
}, { _id: false });

const eventRewardResultSchema = new Schema({
  claimed: { type: Boolean, default: false },
  rarity: { type: String, default: null },
  itemType: { type: String, default: null },
  itemName: { type: String, default: null },
  itemLevel: { type: Number, default: 0 },
  blockedByBag: { type: Boolean, default: false },
}, { _id: false });

const eventProgressSchema = new Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  eventId: { type: String, required: true },
  dateKey: { type: String, required: true },
  missions: { type: [missionProgressSchema], default: [] },
  reward: { type: eventRewardResultSchema, default: () => ({}) },
}, { timestamps: true });

eventProgressSchema.index({ userId: 1, guildId: 1, eventId: 1, dateKey: 1 }, { unique: true });

module.exports = model('EventProgress', eventProgressSchema);
