const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', index: true },
  type: { type: String, enum: ['purchase', 'sale', 'adjustment', 'correction'], default: 'adjustment' },
  direction: { type: String, enum: ['in', 'out'], required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, default: 0, min: 0 },
  note: { type: String, trim: true },
  referenceType: { type: String, enum: ['bill', 'transaction', 'manual', 'other'], default: 'manual' },
  referenceId: { type: String, trim: true },
  occurredAt: { type: Date, default: Date.now },
  closingStock: { type: Number, default: 0 }
}, {
  timestamps: true
});

stockMovementSchema.index({ productId: 1, occurredAt: -1 });
stockMovementSchema.index({ userId: 1, occurredAt: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
