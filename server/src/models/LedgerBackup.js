const mongoose = require('mongoose');

const ledgerBackupSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  date: { type: Date, default: Date.now, index: true },
  rangeStart: { type: Date },
  rangeEnd: { type: Date },
  transactionCount: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  outstanding: { type: Number, default: 0 },
  data: { type: Array, default: [] }
}, {
  timestamps: true
});

ledgerBackupSchema.index({ shopId: 1, date: -1 });

module.exports = mongoose.model('LedgerBackup', ledgerBackupSchema);
