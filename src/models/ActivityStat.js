const { Schema, model } = require('mongoose');

const activityStatSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    voiceSeconds: {
      type: Number,
      default: 0,
    },
    channelMessages: {
      type: Map,
      of: Number,
      default: {},
    },
    voiceChannelSeconds: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

activityStatSchema.index({ guildId: 1, userId: 1, dateKey: 1 }, { unique: true });

module.exports = model('ActivityStat', activityStatSchema);
