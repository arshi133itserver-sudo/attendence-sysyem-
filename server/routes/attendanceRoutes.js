const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/today', verifyToken, attendanceController.getTodayAttendance);
router.get('/date', verifyToken, attendanceController.getAttendanceByDate);
router.get('/date/:date', verifyToken, (req, res, next) => {
  req.query.date = req.params.date;
  attendanceController.getAttendanceByDate(req, res, next);
});
router.post('/manual', verifyToken, requireAdmin, attendanceController.manualAttendanceEntry);
router.post('/correct', verifyToken, requireAdmin, attendanceController.correctAttendance);

module.exports = router;
