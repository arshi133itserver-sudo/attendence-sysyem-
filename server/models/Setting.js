const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  companyName: {
    type: String,
    default: 'Arshi Enterprises'
  },
  officeStartTime: {
    type: String,
    default: '09:00' // HH:mm
  },
  officeEndTime: {
    type: String,
    default: '18:00' // HH:mm
  },
  gracePeriodMinutes: {
    type: Number,
    default: 15
  },
  expectedWorkingHours: {
    type: Number,
    default: 8
  },
  halfDayThresholdHours: {
    type: Number,
    default: 4
  },
  overtimeThresholdHours: {
    type: Number,
    default: 8.5
  },
  // Male Specific Duty Hours & Shift Rules
  maleExpectedWorkingHours: {
    type: Number,
    default: 8
  },
  maleOfficeStartTime: {
    type: String,
    default: '09:00'
  },
  maleOfficeEndTime: {
    type: String,
    default: '18:00'
  },
  maleHalfDayThresholdHours: {
    type: Number,
    default: 4
  },
  maleOvertimeThresholdHours: {
    type: Number,
    default: 8.5
  },
  // Female Specific Duty Hours & Shift Rules
  femaleExpectedWorkingHours: {
    type: Number,
    default: 7
  },
  femaleOfficeStartTime: {
    type: String,
    default: '09:30'
  },
  femaleOfficeEndTime: {
    type: String,
    default: '17:30'
  },
  femaleHalfDayThresholdHours: {
    type: Number,
    default: 3.5
  },
  femaleOvertimeThresholdHours: {
    type: Number,
    default: 7.5
  },
  weeklyHolidays: {
    type: [Number], // 0 = Sunday, 6 = Saturday
    default: [0]
  },
  scanCooldownSeconds: {
    type: Number,
    default: 60
  },
  breakDurationMinutes: {
    type: Number,
    default: 60
  },
  rfidApiKey: {
    type: String,
    default: 'ARSHI_RFID_SECRET_KEY_2026'
  },
  // ZKTeco MB360 Biometric Device Configuration
  zktecoIp: {
    type: String,
    default: '192.168.1.201'
  },
  zktecoPort: {
    type: Number,
    default: 4370
  },
  zktecoCommKey: {
    type: Number,
    default: 0
  },
  zktecoAutoSync: {
    type: Boolean,
    default: false
  },
  zktecoLastSyncTime: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Setting', SettingSchema);
