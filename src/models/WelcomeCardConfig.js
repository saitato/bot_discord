const { Schema, model } = require('mongoose');

const welcomeCardConfigSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
    },
    hello: {
      channelId: {
        type: String,
        default: '',
      },
      backgroundImageUrl: {
        type: String,
        default: '',
      },
      message: {
        type: String,
        default: 'Chào mừng {user} đến với {guild}. Bạn là thành viên thứ {count}.',
      },
    },
    byebye: {
      channelId: {
        type: String,
        default: '',
      },
      backgroundImageUrl: {
        type: String,
        default: '',
      },
      message: {
        type: String,
        default: 'Tạm biệt {user}. Cảm ơn bạn đã đồng hành cùng {guild}.',
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model('WelcomeCardConfig', welcomeCardConfigSchema);
