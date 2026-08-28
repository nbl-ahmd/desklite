const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  referenceId: { type: String, default: null },
  quantity: { type: Number, min: 0, default: 1 },
  enabled: { type: Boolean, default: true }
}, { _id: false });

const expenseSplitSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, trim: true, default: 'Expense split' },
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  selectedSourceIds: { type: [String], default: [] },
  fundSourceIds: { type: [String], default: [] },
  groupFundMode: { type: String, enum: ['participant', 'offset'], default: 'participant' },
  participants: { type: [participantSchema], default: [] },
  calculation: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

expenseSplitSchema.index({ shopId: 1, updatedAt: -1 });

module.exports = mongoose.model('ExpenseSplit', expenseSplitSchema);
