const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  inTime: {
    type: Date,
    required: true
  },
  outTime: {
    type: Date,
    default: null
  },
  inDeviceId: {
    type: String,
    default: 'MANUAL'
  },
  outDeviceId: {
    type: String,
    default: null
  },
  durationMinutes: {
    type: Number,
    default: 0
  }
}, { _id: true });

const AttendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    index: true
  },
  sessions: [SessionSchema],
  firstInTime: {
    type: Date,
    default: null
  },
  lastOutTime: {
    type: Date,
    default: null
  },
  totalWorkingMinutes: {
    type: Number,
    default: 0
  },
  breakMinutes: {
    type: Number,
    default: 0
  },
  expectedWorkingHours: {
    type: Number,
    default: 8
  },
  employeeGender: {
    type: String,
    default: 'Male'
  },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Half-Day', 'Absent', 'Holiday', 'Weekend'],
    default: 'Present',
    index: true
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateByMinutes: {
    type: Number,
    default: 0
  },
  isEarlyExit: {
    type: Boolean,
    default: false
  },
  earlyExitMinutes: {
    type: Number,
    default: 0
  },
  isOvertime: {
    type: Boolean,
    default: false
  },
  overtimeMinutes: {
    type: Number,
    default: 0
  },
  isManualCorrection: {
    type: Boolean,
    default: false
  },
  correctionReason: {
    type: String,
    default: ''
  },
  correctedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  auditHistory: [{
    modifiedAt: { type: Date, default: Date.now },
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: String,
    reason: String,
    snapshot: Object
  }]
}, {
  timestamps: true
});

// Composite index to ensure one attendance record per employee per day
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
