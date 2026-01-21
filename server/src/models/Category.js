const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  createdAt: { type: Date, default: Date.now }
});

categorySchema.index({ userId: 1, type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
