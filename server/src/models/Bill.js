const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    default: 'pcs',
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  taxPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  total: {
    type: Number,
    required: true
  }
}, { _id: false });

const billSchema = new mongoose.Schema({
  // Unique bill number
  billNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Shop/User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    index: true
  },
  
  // Customer details
  customerName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  customerPhone: {
    type: String,
    trim: true
  },
  
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  customerAddress: {
    type: String,
    trim: true
  },
  
  // Bill items
  items: [billItemSchema],
  
  // Financial details
  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalTax: {
    type: Number,
    default: 0,
    min: 0
  },
  
  shippingCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  
  otherCharges: {
    type: Number,
    default: 0
  },
  
  roundOff: {
    type: Number,
    default: 0
  },
  
  grandTotal: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Payment details
  paymentMode: {
    type: String,
    enum: ['cash', 'upi', 'card', 'credit', 'partial'],
    default: 'cash'
  },
  
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  
  amountDue: {
    type: Number,
    default: 0,
    min: 0
  },
  
  paymentStatus: {
    type: String,
    enum: ['paid', 'unpaid', 'partial'],
    default: 'unpaid'
  },
  
  // Transaction reference
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  
  // Bill date
  billDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  dueDate: {
    type: Date
  },
  
  // Notes and terms
  notes: {
    type: String,
    trim: true
  },
  
  termsAndConditions: {
    type: String,
    trim: true
  },
  
  // Digital bill verification
  verificationCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Bill status
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'paid', 'cancelled'],
    default: 'draft'
  },
  
  // View tracking
  viewCount: {
    type: Number,
    default: 0
  },
  
  lastViewedAt: {
    type: Date
  },
  
  // Signature/stamp
  hasSignature: {
    type: Boolean,
    default: false
  },
  
  signatureUrl: {
    type: String
  },
  
  // Metadata
  tags: [String],
  
  cancelledAt: {
    type: Date
  },
  
  cancelReason: {
    type: String
  }
  
}, {
  timestamps: true
});

// Indexes for faster queries
billSchema.index({ userId: 1, billDate: -1 });
billSchema.index({ userId: 1, paymentStatus: 1 });
billSchema.index({ userId: 1, customerName: 1 });
billSchema.index({ shopId: 1, billDate: -1 });
billSchema.index({ billNumber: 1, userId: 1 });

// Virtual for bill age (days since creation)
billSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.billDate) / (1000 * 60 * 60 * 24));
});

// Virtual for overdue status
billSchema.virtual('isOverdue').get(function() {
  if (this.paymentStatus === 'paid') return false;
  if (!this.dueDate) return false;
  return new Date() > this.dueDate;
});

// Generate unique bill number
billSchema.statics.generateBillNumber = async function(userId) {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  
  // Find last bill number for this user today
  const lastBill = await this.findOne({
    userId,
    billDate: {
      $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    }
  }).sort({ billNumber: -1 });
  
  let sequence = 1;
  if (lastBill && lastBill.billNumber) {
    const parts = lastBill.billNumber.split('-');
    if (parts.length >= 4) {
      sequence = parseInt(parts[3]) + 1;
    }
  }
  
  const seqStr = sequence.toString().padStart(4, '0');
  return `INV-${year}${month}-${Date.now().toString().slice(-6)}-${seqStr}`;
};

// Generate verification code
billSchema.statics.generateVerificationCode = function() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Pre-save hook to calculate totals
billSchema.pre('save', function(next) {
  // Calculate subtotal from items
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
    this.totalDiscount = this.items.reduce((sum, item) => sum + (item.discount || 0), 0);
    this.totalTax = this.items.reduce((sum, item) => {
      const itemSubtotal = (item.price * item.quantity) - (item.discount || 0);
      return sum + (itemSubtotal * (item.taxPercent || 0) / 100);
    }, 0);
  }
  
  // Calculate grand total
  this.grandTotal = this.subtotal + this.totalTax + (this.shippingCharges || 0) + 
                     (this.otherCharges || 0) + (this.roundOff || 0);
  
  // Calculate amount due
  this.amountDue = this.grandTotal - (this.amountPaid || 0);
  
  // Update payment status
  if (this.amountPaid >= this.grandTotal) {
    this.paymentStatus = 'paid';
    this.amountDue = 0;
  } else if (this.amountPaid > 0) {
    this.paymentStatus = 'partial';
  } else {
    this.paymentStatus = 'unpaid';
  }
  
  next();
});

module.exports = mongoose.model('Bill', billSchema);
