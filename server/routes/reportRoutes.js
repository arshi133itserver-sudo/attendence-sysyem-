const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken } = require('../middleware/auth');

router.get('/date-wise', verifyToken, reportController.getDateWiseReport);
router.get('/monthly', verifyToken, reportController.getEmployeeMonthlyReport);

module.exports = router;
