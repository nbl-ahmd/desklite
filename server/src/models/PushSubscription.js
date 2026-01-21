const mongoose = require('mongoose');

const PushSubscriptionSchema = new mongoose.Schema({
  shopId: { type: String, index: true },
  endpoint: { type: String, unique: true, required: true },
  keys: {
    p256dh: String,
    auth: String
  },
  userAgent: String
}, { timestamps: true });

module.exports = mongoose.model('PushSubscription', PushSubscriptionSchema);
