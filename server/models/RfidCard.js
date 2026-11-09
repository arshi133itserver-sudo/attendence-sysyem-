const mongoose = require('mongoose');

const RfidCardSchema = new mongoose.Schema({
  cardUid: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  status: {
    type: String,
    enum: ['Active', 'Deactivated', 'Lost'],
    default: 'Active'
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  deactivatedAt: {
    type: Date,
    default: null
  },
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('RfidCard', RfidCardSchema);
