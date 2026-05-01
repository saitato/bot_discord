const { trackMessageActivity } = require('../../utils/activityStats');

module.exports = async (client, message) => {
  try {
    await trackMessageActivity(message);
  } catch (error) {
    console.log('[activityStats] Message tracking error:', error);
  }
};
