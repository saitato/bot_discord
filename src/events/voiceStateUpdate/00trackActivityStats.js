const { trackVoiceActivity } = require('../../utils/activityStats');

module.exports = async (client, oldState, newState) => {
  try {
    await trackVoiceActivity(oldState, newState);
  } catch (error) {
    console.log('[activityStats] Voice tracking error:', error);
  }
};
