const mongoose = require('mongoose');

// Subscription keeps a single record per shop (tenant) and tracks plan, dates, and usage caps
const subscriptionSchema = new mongoose.Schema({
  // userId kept for backward compatibility with old index (userId_1). Mirror shopId into userId to avoid duplicate-key null errors.
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'premium'],
    default: 'free'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'grace', 'expired'],
    default: 'active',
    index: true
  },
  graceUntil: {
    type: Date,
    default: null
  },
  // Track export usage in a rolling monthly window
  exportUsage: {
    periodStart: { type: Date, default: null },
    count: { type: Number, default: 0 }
  },
  // Track reminder usage in a daily window
  reminderUsage: {
    periodStart: { type: Date, default: null },
    count: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

subscriptionSchema.index({ plan: 1, status: 1 });
// Backward compatibility: allow lookups by either key
subscriptionSchema.index({ userId: 1, shopId: 1 }, { unique: true });

// Keep userId and shopId in sync (legacy index support)
subscriptionSchema.pre('validate', function(next) {
  if (!this.userId && this.shopId) {
    this.userId = this.shopId;
  }
  if (!this.shopId && this.userId) {
    this.shopId = this.userId;
  }
  next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
