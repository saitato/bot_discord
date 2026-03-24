const { Schema, model } = require('mongoose');

const wordSchema = new Schema({
  word: {
    type: String,
    required: true,
    unique: true,
  },
  firstWord: {
    type: String,
    required: true,
    unique: true,
  },
});

module.exports = model('Word', wordSchema);