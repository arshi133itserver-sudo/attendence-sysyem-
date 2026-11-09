/**
 * Clear all employees, attendance, RFID cards and scan logs.
 * Keeps: Admin user, Settings, Departments, Holidays.
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const Employee = require('../models/Employee');
const RfidCard = require('../models/RfidCard');
const Attendance = require('../models/Attendance');
const RawScanLog = require('../models/RawScanLog');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/arshi_attendance';

async function clearEmployees() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Delete all employees
    const empResult = await Employee.deleteMany({});
    console.log(`Deleted ${empResult.deletedCount} employees.`);

    // Delete all RFID cards
    const rfidResult = await RfidCard.deleteMany({});
    console.log(`Deleted ${rfidResult.deletedCount} RFID cards.`);

    // Delete all attendance records
    const attResult = await Attendance.deleteMany({});
    console.log(`Deleted ${attResult.deletedCount} attendance records.`);

    // Delete all raw scan logs
    const scanResult = await RawScanLog.deleteMany({});
    console.log(`Deleted ${scanResult.deletedCount} raw scan logs.`);

    // Delete all audit logs
    const auditResult = await AuditLog.deleteMany({});
    console.log(`Deleted ${auditResult.deletedCount} audit logs.`);

    // Remove staff users (keep admin only)
    const staffResult = await User.deleteMany({ role: 'staff' });
    console.log(`Deleted ${staffResult.deletedCount} staff user accounts.`);

    // Verify admin still exists
    const admin = await User.findOne({ role: 'admin' });
    console.log(`\nAdmin account intact: ${admin ? admin.email : 'NOT FOUND'}`);

    console.log('\n==============================================');
    console.log('✅ System cleared! No employees remain.');
    console.log('   Settings, Departments, Holidays preserved.');
    console.log('   Admin login: admin@arshi.com / adminpassword123');
    console.log('==============================================');
    console.log('\nAb naye employees add karo RFID Card UID ke saath.');
    console.log('Card punch → IN, dubara punch → OUT. Simple!');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

clearEmployees();
