const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', verifyToken, settingsController.getSettings);
router.put('/', verifyToken, requireAdmin, settingsController.updateSettings);

router.post('/holidays', verifyToken, requireAdmin, settingsController.addHoliday);
router.delete('/holidays/:id', verifyToken, requireAdmin, settingsController.deleteHoliday);

router.post('/departments', verifyToken, requireAdmin, settingsController.addDepartment);
router.delete('/departments/:id', verifyToken, requireAdmin, settingsController.deleteDepartment);

module.exports = router;
