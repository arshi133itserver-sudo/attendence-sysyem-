const mongoose = require('mongoose');

const RawScanLogSchema = new mongoose.Schema({
  cardUid: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  deviceId: {
    type: String,
    default: 'ESP32_MAIN'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  scanType: {
    type: String,
    enum: ['IN', 'OUT', 'REJECTED'],
    required: true
  },
  status: {
    type: String,
    enum: [
      'SUCCESS',
      'DUPLICATE_DEBOUNCED',
      'UNKNOWN_CARD',
      'INACTIVE_CARD',
      'UNAUTHORIZED_DEVICE',
      'SELFIE_PENDING',
      'SELFIE_APPROVED',
      'ERROR'
    ],
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  isOfflineSync: {
    type: Boolean,
    default: false
  },
  rawPayload: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('RawScanLog', RawScanLogSchema);
