const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/arshi_attendance');
    const Attendance = require('../models/Attendance');
    const Employee = require('../models/Employee');
    const records = await Attendance.find().populate('employee', 'fullName employeeId').lean();
    console.log('--- ALL ATTENDANCE RECORDS ---');
    console.log(JSON.stringify(records, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
run();
