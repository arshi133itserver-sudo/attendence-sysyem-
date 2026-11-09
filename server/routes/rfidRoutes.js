const express = require('express');
const router = express.Router();
const rfidController = require('../controllers/rfidController');
const { verifyDeviceApiKey } = require('../middleware/deviceAuth');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Hardware Endpoint - ESP32 Scans RFID card
// Supports x-api-key header for hardware authentication
router.post('/scan', verifyDeviceApiKey, rfidController.handleScan);

// Hardware Endpoint - ESP32 Syncs accumulated offline scans
router.post('/sync-offline', verifyDeviceApiKey, rfidController.syncOfflineScans);

// UI Simulator Endpoint - Allows testing scan directly from web dashboard without hardware
router.post('/simulate-scan', verifyToken, (req, res, next) => {
  // Simulator bypasses hardware API key since it uses JWT auth
  req.body.deviceId = req.body.deviceId || 'WEB_SIMULATOR';
  return rfidController.handleScan(req, res);
});

// Admin Raw Logs
router.get('/raw-logs', verifyToken, requireAdmin, rfidController.getRawScanLogs);

module.exports = router;
