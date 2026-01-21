const cron = require('node-cron');
const Transaction = require('../models/Transaction');
const LedgerBackup = require('../models/LedgerBackup');

async function runBackupOnce() {
  const shopIds = (await Transaction.distinct('shopId')).filter(Boolean);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  for (const shopId of shopIds) {
    if (!shopId) continue;

    const docs = await Transaction.find({ shopId, occurredAt: { $gte: startOfDay, $lte: endOfDay } })
      .select({ amount: 1, eventType: 1, type: 1, mode: 1, customerName: 1, phoneNumber: 1, description: 1, dueDate: 1, isPaid: 1, occurredAt: 1 })
      .lean();
    const balance = docs.reduce((sum, t) => {
      const signed = ['payment', 'expense'].includes(t.eventType) ? -Math.abs(t.amount) : Math.abs(t.amount);
      return sum + signed;
    }, 0);

    await LedgerBackup.create({
      shopId,
      date: now,
      rangeStart: startOfDay,
      rangeEnd: endOfDay,
      transactionCount: docs.length,
      balance,
      outstanding: docs.filter((t) => t.mode === 'credit' && t.isPaid === false).length,
      data: docs,
    });
  }
}

function scheduleBackups() {
  // Run daily at 03:00 server time
  cron.schedule('0 3 * * *', () => {
    runBackupOnce().catch((err) => console.error('Backup job failed', err));
  });
}

module.exports = {
  scheduleBackups,
  runBackupOnce,
};
