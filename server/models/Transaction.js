const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  checkoutRequestId: {
    type: String,
    required: true,
    unique: true
  },
  merchantRequestId: {
    type: String
  },
  phoneNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'PENDING'
  },
  mpesaReceiptNumber: {
    type: String
  },
  resultDesc: {
    type: String
  },
  resultCode: {
    type: Number
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Auto-delete after 24 hours to keep DB clean
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TransactionModel', TransactionSchema);
