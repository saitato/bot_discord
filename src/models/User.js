const { Schema, model } = require('mongoose');

const clampBalance = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, value);
};

const userSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
    min: 0,
    set: clampBalance,
  },
  streak: {
    type: Number,
    default: 0,
  },
  lastDaily: {
    type: Date,
    reqired: true,
  },
});

userSchema.pre('save', function (next) {
  this.balance = clampBalance(this.balance);
  next();
});

const sanitizeBalanceUpdate = (update) => {
  if (!update) return update;

  if (typeof update.balance === 'number') {
    update.balance = clampBalance(update.balance);
  }

  if (update.$set && typeof update.$set.balance === 'number') {
    update.$set.balance = clampBalance(update.$set.balance);
  }

  return update;
};

userSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function (next) {
  const update = this.getUpdate();
  sanitizeBalanceUpdate(update);
  this.setUpdate(update);
  next();
});

module.exports = model('User', userSchema);
