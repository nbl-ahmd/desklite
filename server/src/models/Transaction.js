const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  mode: {
    type: String,
    enum: ['cash', 'upi', 'credit'],
    required: function () {
      return this.type === 'income';
    }
  },
  date: {
    type: Date,
    default: Date.now
  },
  customerName: {
    type: String,
    required: function () {
      return this.mode === 'credit';
    }
  },
  customerPhone: {
    type: String,
    required: function () {
      return this.mode === 'credit';
    }
  },
  description: {
    type: String
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
