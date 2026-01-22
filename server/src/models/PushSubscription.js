const mongoose = require('mongoose');

const PushSubscriptionSchema = new mongoose.Schema({
  shopId: { type: String, index: true },
  platform: { type: String, enum: ['web', 'android', 'ios', 'unknown'], default: 'web', index: true },
  endpoint: { type: String, unique: true, sparse: true },
  nativeToken: { type: String, unique: true, sparse: true },
  keys: {
    p256dh: String,
    auth: String
  },
  userAgent: String,
  device: {
    model: String,
    appVersion: String
  }
}, { timestamps: true });

module.exports = mongoose.model('PushSubscription', PushSubscriptionSchema);
