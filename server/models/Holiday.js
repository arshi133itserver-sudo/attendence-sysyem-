const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['National', 'Company', 'Festival', 'Optional'],
    default: 'Company'
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Holiday', HolidaySchema);
