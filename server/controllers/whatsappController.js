const whatsappService = require('../services/whatsappService');
const Setting = require('../models/Setting');

// Get WhatsApp Connection Status & QR Code
exports.getStatus = async (req, res) => {
  try {
    const status = whatsappService.getStatus();
    const setting = await Setting.findOne();

    return res.status(200).json({
      success: true,
      data: {
        ...status,
        configuredGroupId: setting?.whatsappGroupId || '',
        configuredGroupName: setting?.whatsappGroupName || '',
        configuredAdminPhone: setting?.whatsappAdminPhone || '',
        notificationsEnabled: setting?.whatsappNotificationsEnabled ?? true,
        apiGatewayUrl: setting?.whatsappApiGatewayUrl || ''
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get List of Participating WhatsApp Groups
exports.getGroups = async (req, res) => {
  try {
    const groups = await whatsappService.getGroups();
    return res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update WhatsApp Notification Settings (Selected Group, Phone, Enabled)
exports.updateConfig = async (req, res) => {
  try {
    const {
      whatsappGroupId,
      whatsappGroupName,
      whatsappAdminPhone,
      whatsappNotificationsEnabled,
      whatsappApiGatewayUrl,
      whatsappApiGatewayToken
    } = req.body;

    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting();
    }

    if (whatsappGroupId !== undefined) setting.whatsappGroupId = String(whatsappGroupId).trim();
    if (whatsappGroupName !== undefined) setting.whatsappGroupName = String(whatsappGroupName).trim();
    if (whatsappAdminPhone !== undefined) setting.whatsappAdminPhone = String(whatsappAdminPhone).trim();
    if (whatsappNotificationsEnabled !== undefined) setting.whatsappNotificationsEnabled = !!whatsappNotificationsEnabled;
    if (whatsappApiGatewayUrl !== undefined) setting.whatsappApiGatewayUrl = String(whatsappApiGatewayUrl).trim();
    if (whatsappApiGatewayToken !== undefined) setting.whatsappApiGatewayToken = String(whatsappApiGatewayToken).trim();

    await setting.save();

    return res.status(200).json({
      success: true,
      message: 'WhatsApp notification configuration updated successfully.',
      data: setting
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Send Test Message
exports.sendTest = async (req, res) => {
  try {
    const { targetJid } = req.body;
    let target = targetJid;

    if (!target) {
      const setting = await Setting.findOne();
      target = setting?.whatsappGroupId || setting?.whatsappAdminPhone;
    }

    if (!target) {
      return res.status(400).json({
        success: false,
        message: 'No WhatsApp Group or Admin Phone number configured to send test message to.'
      });
    }

    const result = await whatsappService.sendTestMessage(target);
    return res.status(200).json({
      success: true,
      message: `Test alert sent successfully to ${result.target}! Check your WhatsApp.`,
      result
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Logout / Unlink current WhatsApp device
exports.logout = async (req, res) => {
  try {
    const result = await whatsappService.logout();
    return res.status(200).json({
      success: true,
      message: 'WhatsApp unlinked successfully. A new QR code is ready to scan.',
      result
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Reconnect / Restart
exports.restart = async (req, res) => {
  try {
    await whatsappService.init();
    return res.status(200).json({
      success: true,
      message: 'WhatsApp service restarted.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
