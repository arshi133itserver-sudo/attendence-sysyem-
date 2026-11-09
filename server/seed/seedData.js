const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const User = require('../models/User');
const Employee = require('../models/Employee');
const RfidCard = require('../models/RfidCard');
const Attendance = require('../models/Attendance');
const RawScanLog = require('../models/RawScanLog');
const Setting = require('../models/Setting');
const Department = require('../models/Department');
const Holiday = require('../models/Holiday');
const AuditLog = require('../models/AuditLog');
const { recalculateAttendance } = require('../services/attendanceCalculator');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/arshi_attendance';

function getLocalDateString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function seed() {
  try {
    console.log('Connecting to MongoDB at:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected! Clearing existing data...');

    await Promise.all([
      User.deleteMany({}),
      Employee.deleteMany({}),
      RfidCard.deleteMany({}),
      Attendance.deleteMany({}),
      RawScanLog.deleteMany({}),
      Setting.deleteMany({}),
      Department.deleteMany({}),
      Holiday.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    // 1. Seed Settings
    console.log('Seeding Attendance Settings...');
    const setting = await Setting.create({
      companyName: 'Arshi Enterprises',
      officeStartTime: '09:00',
      officeEndTime: '18:00',
      gracePeriodMinutes: 15,
      expectedWorkingHours: 8,
      halfDayThresholdHours: 4,
      overtimeThresholdHours: 8.5,
      weeklyHolidays: [0], // Sunday
      scanCooldownSeconds: 60,
      breakDurationMinutes: 60,
      rfidApiKey: process.env.RFID_API_KEY || 'ARSHI_RFID_SECRET_KEY_2026'
    });

    // 2. Seed Departments
    console.log('Seeding Departments...');
    await Department.create([
      { name: 'Engineering', code: 'ENG', description: 'Software and Hardware Development' },
      { name: 'Operations', code: 'OPS', description: 'Office and Logistics Operations' },
      { name: 'Human Resources', code: 'HR', description: 'Personnel, Hiring and Culture' },
      { name: 'Marketing & Sales', code: 'MKT', description: 'Brand Growth and Client Acquisition' },
      { name: 'Accounts & Finance', code: 'FIN', description: 'Billing, Payroll, and Accounting' }
    ]);

    // 3. Seed Holidays
    console.log('Seeding Holidays...');
    const currentYear = new Date().getFullYear();
    await Holiday.create([
      { name: 'Republic Day', date: `${currentYear}-01-26`, type: 'National', description: 'Indian Republic Day' },
      { name: 'Independence Day', date: `${currentYear}-08-15`, type: 'National', description: 'Indian Independence Day' },
      { name: 'Gandhi Jayanti', date: `${currentYear}-10-02`, type: 'National', description: 'Mahatma Gandhi Birthday' },
      { name: 'Diwali Festival', date: `${currentYear}-11-01`, type: 'Festival', description: 'Festival of Lights' },
      { name: 'Arshi Foundation Day', date: `${currentYear}-04-10`, type: 'Company', description: 'Annual Corporate Foundation Day' }
    ]);

    // 4. Seed Employees
    console.log('Seeding Employees...');
    const employeeData = [
      {
        employeeId: 'ARS-001',
        fullName: 'Rahul Sharma',
        email: 'rahul@arshi.com',
        mobileNumber: '+91 98765 43210',
        department: 'Engineering',
        designation: 'Lead Embedded & Software Engineer',
        joiningDate: new Date('2023-01-15'),
        salary: 85000,
        rfidCardUid: '73A2B19F',
        status: 'Active',
        profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      },
      {
        employeeId: 'ARS-002',
        fullName: 'Priya Patel',
        email: 'priya@arshi.com',
        mobileNumber: '+91 98234 56789',
        department: 'Human Resources',
        designation: 'HR & Talent Manager',
        joiningDate: new Date('2023-03-01'),
        salary: 70000,
        rfidCardUid: '84C3D20A',
        status: 'Active',
        profilePhoto: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
      },
      {
        employeeId: 'ARS-003',
        fullName: 'Mohammad Arshi',
        email: 'director@arshi.com',
        mobileNumber: '+91 98111 22233',
        department: 'Operations',
        designation: 'Managing Director',
        joiningDate: new Date('2022-01-01'),
        salary: 150000,
        rfidCardUid: '95E4F31B',
        status: 'Active',
        profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
      },
      {
        employeeId: 'ARS-004',
        fullName: 'Sneha Gupta',
        email: 'sneha@arshi.com',
        mobileNumber: '+91 97654 32109',
        department: 'Marketing & Sales',
        designation: 'Digital Marketing Strategist',
        joiningDate: new Date('2023-06-10'),
        salary: 55000,
        rfidCardUid: 'A6F5042C',
        status: 'Active',
        profilePhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
      },
      {
        employeeId: 'ARS-005',
        fullName: 'Vikram Malhotra',
        email: 'vikram@arshi.com',
        mobileNumber: '+91 96543 21098',
        department: 'Operations',
        designation: 'Senior Operations Executive',
        joiningDate: new Date('2023-09-01'),
        salary: 60000,
        rfidCardUid: 'B706153D',
        status: 'Active',
        profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
      },
      {
        employeeId: 'ARS-006',
        fullName: 'Ananya Roy',
        email: 'ananya@arshi.com',
        mobileNumber: '+91 95432 10987',
        department: 'Engineering',
        designation: 'Frontend UI/UX Developer',
        joiningDate: new Date('2024-02-15'),
        salary: 65000,
        rfidCardUid: 'C817264E',
        status: 'Active',
        profilePhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
      },
      {
        employeeId: 'ARS-007',
        fullName: 'Amit Verma',
        email: 'amit@arshi.com',
        mobileNumber: '+91 94321 09876',
        department: 'Accounts & Finance',
        designation: 'Financial Auditor & Accountant',
        joiningDate: new Date('2023-11-01'),
        salary: 58000,
        rfidCardUid: 'D928375F',
        status: 'Active',
        profilePhoto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
      },
      {
        employeeId: 'ARS-008',
        fullName: 'Neha Singh',
        email: 'neha@arshi.com',
        mobileNumber: '+91 93210 98765',
        department: 'Engineering',
        designation: 'QA Automation Engineer',
        joiningDate: new Date('2024-04-01'),
        salary: 52000,
        rfidCardUid: 'EA394860',
        status: 'Active',
        profilePhoto: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80'
      }
    ];

    const createdEmployees = await Employee.create(employeeData);

    // 5. Seed RFID Cards
    console.log('Seeding RFID Cards...');
    for (const emp of createdEmployees) {
      await RfidCard.create({
        cardUid: emp.rfidCardUid,
        employee: emp._id,
        status: 'Active',
        remarks: `Primary card for ${emp.fullName}`
      });
    }

    // 6. Seed Users (Admin & Staff)
    console.log('Seeding Users...');
    const adminPasswordHash = await bcrypt.hash('adminpassword123', 10);
    const staffPasswordHash = await bcrypt.hash('staffpassword123', 10);

    const adminUser = await User.create({
      name: 'System Administrator',
      email: 'admin@arshi.com',
      password: adminPasswordHash,
      role: 'admin',
      isActive: true
    });

    const staffUser = await User.create({
      name: createdEmployees[0].fullName,
      email: 'rahul@arshi.com',
      password: staffPasswordHash,
      role: 'staff',
      employee: createdEmployees[0]._id,
      isActive: true
    });

    // 7. Seed Past 14 Days Attendance Records & Today
    console.log('Generating realistic 14-day attendance history...');
    const now = new Date();

    for (let dayOffset = 14; dayOffset >= 0; dayOffset--) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() - dayOffset);
      const dateStr = getLocalDateString(targetDate);
      const dayOfWeek = targetDate.getDay();

      if (dayOfWeek === 0) {
        // Sunday - Weekend off
        continue;
      }

      for (let i = 0; i < createdEmployees.length; i++) {
        const emp = createdEmployees[i];

        // Today's special logic: some already clocked in, some checked out, some absent
        if (dayOffset === 0) {
          if (i === 0) {
            // Rahul: clocked in at 08:55 AM, took lunch, clocked in again at 02:00 PM, currently working!
            const [y, m, d] = dateStr.split('-').map(Number);
            const in1 = new Date(y, m - 1, d, 8, 55, 0);
            const out1 = new Date(y, m - 1, d, 13, 0, 0);
            const in2 = new Date(y, m - 1, d, 14, 0, 0);

            const att = new Attendance({
              employee: emp._id,
              date: dateStr,
              sessions: [
                { inTime: in1, outTime: out1, inDeviceId: 'ESP32_GATE_01', outDeviceId: 'ESP32_GATE_01' },
                { inTime: in2, outTime: null, inDeviceId: 'ESP32_GATE_01' }
              ]
            });
            recalculateAttendance(att, setting);
            await att.save();
          } else if (i === 1) {
            // Priya: Clocked in at 09:25 AM (Late), currently working!
            const [y, m, d] = dateStr.split('-').map(Number);
            const in1 = new Date(y, m - 1, d, 9, 25, 0);

            const att = new Attendance({
              employee: emp._id,
              date: dateStr,
              sessions: [{ inTime: in1, outTime: null, inDeviceId: 'ESP32_GATE_01' }]
            });
            recalculateAttendance(att, setting);
            await att.save();
          } else if (i === 2) {
            // Mohammad Arshi: IN at 09:05 AM, OUT at 01:30 PM (Completed half-day)
            const [y, m, d] = dateStr.split('-').map(Number);
            const in1 = new Date(y, m - 1, d, 9, 5, 0);
            const out1 = new Date(y, m - 1, d, 13, 30, 0);

            const att = new Attendance({
              employee: emp._id,
              date: dateStr,
              sessions: [{ inTime: in1, outTime: out1, inDeviceId: 'ESP32_GATE_01', outDeviceId: 'ESP32_GATE_01' }]
            });
            recalculateAttendance(att, setting);
            await att.save();
          } else if (i === 3) {
            // Sneha: IN at 08:50 AM, currently working!
            const [y, m, d] = dateStr.split('-').map(Number);
            const in1 = new Date(y, m - 1, d, 8, 50, 0);

            const att = new Attendance({
              employee: emp._id,
              date: dateStr,
              sessions: [{ inTime: in1, outTime: null, inDeviceId: 'ESP32_GATE_01' }]
            });
            recalculateAttendance(att, setting);
            await att.save();
          } else if (i === 4) {
            // Vikram: IN at 09:00 AM, OUT at 14:00 PM
            const [y, m, d] = dateStr.split('-').map(Number);
            const in1 = new Date(y, m - 1, d, 9, 0, 0);
            const out1 = new Date(y, m - 1, d, 14, 0, 0);

            const att = new Attendance({
              employee: emp._id,
              date: dateStr,
              sessions: [{ inTime: in1, outTime: out1, inDeviceId: 'ESP32_GATE_01', outDeviceId: 'ESP32_GATE_01' }]
            });
            recalculateAttendance(att, setting);
            await att.save();
          } else if (i === 5) {
            // Ananya: IN at 09:10 AM, currently working!
            const [y, m, d] = dateStr.split('-').map(Number);
            const in1 = new Date(y, m - 1, d, 9, 10, 0);

            const att = new Attendance({
              employee: emp._id,
              date: dateStr,
              sessions: [{ inTime: in1, outTime: null, inDeviceId: 'ESP32_GATE_01' }]
            });
            recalculateAttendance(att, setting);
            await att.save();
          }
          // Employee 6 and 7 are absent today for realistic metrics
          continue;
        }

        // Random attendance chance (85% present)
        const isPresent = Math.random() < 0.88;
        if (!isPresent) continue;

        const [y, m, d] = dateStr.split('-').map(Number);
        // Vary start times around 08:45 - 09:30
        const isLate = Math.random() < 0.25;
        const startMin = isLate ? Math.floor(Math.random() * 25) + 16 : Math.floor(Math.random() * 15);
        const inTime1 = new Date(y, m - 1, d, 9, startMin, 0);

        // Session 1 OUT for lunch: 13:00 - 13:15
        const outTime1 = new Date(y, m - 1, d, 13, Math.floor(Math.random() * 15), 0);

        // Session 2 IN after lunch: 14:00 - 14:15
        const inTime2 = new Date(y, m - 1, d, 14, Math.floor(Math.random() * 15), 0);

        // Session 2 OUT end of day: 18:00 - 19:30 (overtime possible)
        const endHour = Math.random() < 0.3 ? 19 : 18;
        const endMin = Math.floor(Math.random() * 30);
        const outTime2 = new Date(y, m - 1, d, endHour, endMin, 0);

        const att = new Attendance({
          employee: emp._id,
          date: dateStr,
          sessions: [
            { inTime: inTime1, outTime: outTime1, inDeviceId: 'ESP32_GATE_01', outDeviceId: 'ESP32_GATE_01' },
            { inTime: inTime2, outTime: outTime2, inDeviceId: 'ESP32_GATE_01', outDeviceId: 'ESP32_GATE_01' }
          ]
        });

        recalculateAttendance(att, setting);
        await att.save();
      }
    }

    // 8. Seed sample RawScanLogs
    console.log('Seeding Raw Scan Logs...');
    await RawScanLog.create([
      {
        cardUid: '73A2B19F',
        employee: createdEmployees[0]._id,
        deviceId: 'ESP32_GATE_01',
        scanType: 'IN',
        status: 'SUCCESS',
        message: 'IN recorded for Rahul Sharma',
        timestamp: new Date()
      },
      {
        cardUid: '73A2B19F',
        employee: createdEmployees[0]._id,
        deviceId: 'ESP32_GATE_01',
        scanType: 'REJECTED',
        status: 'DUPLICATE_DEBOUNCED',
        message: 'Card scanned too quickly. Debounce cooldown active.',
        timestamp: new Date(Date.now() + 5000)
      },
      {
        cardUid: 'DEADBEEF',
        deviceId: 'ESP32_GATE_01',
        scanType: 'REJECTED',
        status: 'UNKNOWN_CARD',
        message: 'Card UID DEADBEEF not assigned to any employee.',
        timestamp: new Date(Date.now() - 3600000)
      }
    ]);

    console.log('=======================================================');
    console.log('🎉 Database Seeding Completed Successfully!');
    console.log('Admin Account: admin@arshi.com / adminpassword123');
    console.log('Staff Account: rahul@arshi.com / staffpassword123');
    console.log('Total Employees Created:', createdEmployees.length);
    console.log('RFID API Key:', setting.rfidApiKey);
    console.log('=======================================================');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding Error:', err);
    process.exit(1);
  }
}

seed();
