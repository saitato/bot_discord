const { Schema, model } = require('mongoose');

const setChannelWordsSchema = new Schema({
  guildId: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true
  },
  dataWord: {
    type: String,
    default: "",
  }
});

module.exports = model('SetChannelWords', setChannelWordsSchema);