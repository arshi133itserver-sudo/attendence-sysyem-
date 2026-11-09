const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendanceRequestController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Staff: Submit selfie request
router.post('/selfie', verifyToken, controller.submitSelfieRequest);

// Staff: Get my submitted selfie requests
router.get('/my-requests', verifyToken, controller.getMyRequests);

// Admin: Get pending selfie requests
router.get('/pending', verifyToken, requireAdmin, controller.getPendingRequests);

// Admin: Get all selfie requests with filters
router.get('/', verifyToken, requireAdmin, controller.getAllRequests);

// Admin: Approve a selfie attendance request
router.post('/:id/approve', verifyToken, requireAdmin, controller.approveRequest);

// Admin: Reject a selfie attendance request
router.post('/:id/reject', verifyToken, requireAdmin, controller.rejectRequest);

module.exports = router;
