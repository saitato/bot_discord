const { Schema, model } = require('mongoose');

const missionSchema = new Schema({
  missionId: { type: String, required: true },
  type: { type: String, required: true },
  difficulty: { type: String, required: true },
  label: { type: String, required: true },
  target: { type: Number, required: true },
  progress: { type: Number, default: 0 },
  reward: { type: Number, required: true },
  completed: { type: Boolean, default: false },
  claimed: { type: Boolean, default: false },
}, { _id: false });

const dailyMissionSchema = new Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  dateKey: { type: String, required: true },
  lastMessageProgressAt: { type: Date, default: null },
  missions: { type: [missionSchema], default: [] },
}, { timestamps: true });

dailyMissionSchema.index({ userId: 1, guildId: 1, dateKey: 1 }, { unique: true });

module.exports = model('DailyMission', dailyMissionSchema);
