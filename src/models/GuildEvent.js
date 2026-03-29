const { Schema, model } = require('mongoose');

const missionTemplateSchema = new Schema({
  missionId: { type: String, required: true },
  type: { type: String, required: true },
  label: { type: String, required: true },
  target: { type: Number, required: true },
}, { _id: false });

const rewardSchema = new Schema({
  type: { type: String, required: true },
  label: { type: String, required: true },
}, { _id: false });

const guildEventSchema = new Schema({
  guildId: { type: String, required: true },
  eventId: { type: String, required: true },
  eventIndex: { type: Number, required: true },
  dateKey: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  createdBy: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  missions: { type: [missionTemplateSchema], default: [] },
  reward: { type: rewardSchema, required: true },
}, { timestamps: true });

guildEventSchema.index({ guildId: 1, dateKey: 1 }, { unique: true });

module.exports = model('GuildEvent', guildEventSchema);
