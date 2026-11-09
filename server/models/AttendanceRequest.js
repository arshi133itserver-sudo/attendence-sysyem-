const mongoose = require('mongoose');

const AttendanceRequestSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  requestedType: {
    type: String,
    enum: ['IN', 'OUT', 'FULL_DAY'],
    default: 'IN',
    required: true
  },
  requestTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    index: true
  },
  selfiePhoto: {
    type: String, // Base64 data URL
    required: true
  },
  remarks: {
    type: String,
    default: 'Selfie attendance request by staff'
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AttendanceRequest', AttendanceRequestSchema);
