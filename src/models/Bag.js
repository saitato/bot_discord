const { Schema, model } = require('mongoose');

const bagSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 10,
  },
}, { timestamps: true });

module.exports = model('Bag', bagSchema);
