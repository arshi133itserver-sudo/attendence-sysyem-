const express = require('express');
const router = express.Router();
const zktecoController = require('../controllers/zktecoController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Protected Admin API routes
router.get('/config', verifyToken, requireAdmin, zktecoController.getConfig);
router.put('/config', verifyToken, requireAdmin, zktecoController.updateConfig);
router.post('/test', verifyToken, requireAdmin, zktecoController.testConnection);
router.post('/sync', verifyToken, requireAdmin, zktecoController.syncLogs);
router.post('/upload-log', verifyToken, requireAdmin, zktecoController.uploadLogFile);

module.exports = router;
