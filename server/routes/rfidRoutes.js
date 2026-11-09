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

// UI Simulator & Tablet Kiosk Endpoint - Allows testing scan directly from web dashboard or Gate Tablet Kiosk
router.post('/simulate-scan', (req, res, next) => {
  req.body.deviceId = req.body.deviceId || 'TABLET_KIOSK_READER';
  return rfidController.handleScan(req, res);
});

// Admin Raw Logs
router.get('/raw-logs', verifyToken, requireAdmin, rfidController.getRawScanLogs);

module.exports = router;
