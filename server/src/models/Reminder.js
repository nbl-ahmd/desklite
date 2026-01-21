const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  customerName: { type: String, required: true },
  phoneNumber: { type: String },
  dueDate: { type: Date },
  balance: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'sent'], default: 'pending', index: true },
  lastNotifiedAt: { type: Date },
  channel: { type: String, enum: ['console', 'db'], default: 'console' },
  meta: { type: Object, default: {} }
}, { timestamps: true });

reminderSchema.index({ shopId: 1, status: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
