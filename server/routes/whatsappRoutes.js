const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// WhatsApp Status & QR code
router.get('/status', verifyToken, requireAdmin, whatsappController.getStatus);

// Fetch joined WhatsApp groups
router.get('/groups', verifyToken, requireAdmin, whatsappController.getGroups);

// Update configuration (Group ID, Admin Phone, Enabled flag)
router.post('/config', verifyToken, requireAdmin, whatsappController.updateConfig);

// Send test notification message
router.post('/test', verifyToken, requireAdmin, whatsappController.sendTest);

// Logout / Reset WhatsApp session
router.post('/logout', verifyToken, requireAdmin, whatsappController.logout);

// Restart socket
router.post('/restart', verifyToken, requireAdmin, whatsappController.restart);

module.exports = router;
