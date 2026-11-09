const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/next-id', verifyToken, requireAdmin, employeeController.getNextEmployeeId);
router.get('/', verifyToken, employeeController.getEmployees);
router.get('/:id', verifyToken, employeeController.getEmployeeById);
router.post('/', verifyToken, requireAdmin, employeeController.createEmployee);
router.post('/:id/account', verifyToken, requireAdmin, employeeController.createOrUpdateAccount);
router.put('/:id', verifyToken, requireAdmin, employeeController.updateEmployee);
router.delete('/:id', verifyToken, requireAdmin, employeeController.deleteEmployee);

module.exports = router;
