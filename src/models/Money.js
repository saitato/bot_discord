const { Schema, model } = require('mongoose');

const levelSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  money: {
    type: Number,
    default: 0,
  },
});

module.exports = model('Level', levelSchema);