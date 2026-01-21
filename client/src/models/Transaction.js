import mongoose from 'mongoose';

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
    default: 'income' 
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
  customerName: {
    type: String,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  description: { 
    type: String,
    trim: true
  },
  dueDate: {
    type: Date
  },
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
  // Idempotency key to support offline sync retries
  clientRequestId: {
    type: String,
    index: true,
    sparse: true
  }
}, {
  timestamps: true
});

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, mode: 1, isPaid: 1 });
transactionSchema.index({ userId: 1, clientRequestId: 1 }, { unique: true, partialFilterExpression: { clientRequestId: { $exists: true } } });
transactionSchema.index({ shopId: 1, occurredAt: -1 });
transactionSchema.index({ shopId: 1, customerName: 1, occurredAt: -1 });
transactionSchema.index({ shopId: 1, mode: 1 });

export default mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema); 