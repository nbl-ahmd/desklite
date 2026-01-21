const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    index: true
  },
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
  eventType: {
    type: String,
    enum: ['sale', 'payment', 'expense', 'supplier'],
    default: 'sale'
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  mode: {
    type: String,
    enum: ['cash', 'upi', 'credit'],
    default: 'cash'
  },
  date: {
    type: Date,
    default: Date.now
  },
  // Optional customer/vendor name
  customerName: {
    type: String,
    trim: true,
    index: true
  },
  // Customer phone number for credit/follow-up
  customerPhone: {
    type: String,
    trim: true
  },
  // Optional phone number (mainly for expenses/vendors)
  phoneNumber: {
    type: String,
    trim: true
  },
  // Optional description/note about the transaction
  description: {
    type: String,
    trim: true
  },
  // Due date for credit transactions
  dueDate: {
    type: Date
  },
  // Credit payment status
  isPaid: {
    type: Boolean,
    default: function() {
      return this.mode !== 'credit';
    }
  },
  occurredAt: {
    type: Date,
    default: Date.now
  },
  // Idempotency key for offline/online sync
  clientRequestId: {
    type: String,
    index: true,
    sparse: true
  },
  // Bill/receipt attachment
  billImage: {
    type: String, // URL or base64 string
    trim: true
  },
  billImageKey: {
    type: String, // S3 key or storage reference
    trim: true
  },
  // Reminder tracking
  lastReminderSent: {
    type: Date
  },
  reminderCount: {
    type: Number,
    default: 0
  },
  // Scheduled reminder
  scheduledReminderDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, mode: 1, isPaid: 1 }); // For credit reminders
transactionSchema.index({ userId: 1, clientRequestId: 1 }, { unique: true, partialFilterExpression: { clientRequestId: { $exists: true } } });
transactionSchema.index({ shopId: 1, clientRequestId: 1 }, { unique: true, partialFilterExpression: { clientRequestId: { $exists: true } } });
transactionSchema.index({ shopId: 1, dueDate: 1 });
transactionSchema.index({ shopId: 1, occurredAt: -1 });
transactionSchema.index({ shopId: 1, customerName: 1, occurredAt: -1 });
transactionSchema.index({ shopId: 1, mode: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
