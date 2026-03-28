const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', index: true },
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  unit: { type: String, default: 'pcs', trim: true },
  category: { type: String, trim: true },
  barcode: { type: String, trim: true },
  purchasePrice: { type: Number, default: 0, min: 0 },
  sellingPrice: { type: Number, default: 0, min: 0 },
  taxPercent: { type: Number, default: 0, min: 0, max: 100 },
  openingStock: { type: Number, default: 0, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 0, min: 0 },
  lastRestockedAt: { type: Date },
  lastSoldAt: { type: Date },
  notes: { type: String, trim: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

productSchema.index({ userId: 1, name: 1 }, { unique: true });
productSchema.index({ userId: 1, sku: 1 }, { unique: true, sparse: true });
productSchema.index({ userId: 1, lowStockThreshold: 1 });

productSchema.virtual('isLow').get(function() {
  return this.lowStockThreshold > 0 && this.stock <= this.lowStockThreshold;
});

module.exports = mongoose.model('Product', productSchema);
