const Setting = require('../models/Setting');

const verifyDeviceApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const configuredKey = process.env.RFID_API_KEY || 'ARSHI_RFID_SECRET_KEY_2026';

    // Also check database setting if available
    let dbKey = configuredKey;
    try {
      const setting = await Setting.findOne();
      if (setting && setting.rfidApiKey) {
        dbKey = setting.rfidApiKey;
      }
    } catch (e) {
      // fallback to env
    }

    if (!apiKey || (apiKey !== configuredKey && apiKey !== dbKey)) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized RFID hardware device. Invalid or missing X-API-KEY header.',
        status: 'UNAUTHORIZED_DEVICE'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Device authorization check failed.', error: error.message });
  }
};

module.exports = {
  verifyDeviceApiKey
};
