const cron = require('node-cron');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { ensureSubscription, consumeReminder, assertReminderAllowed } = require('../services/subscriptionService');
const { logReminder } = require('../services/notificationService');

async function findOverdueByShop(shopId) {
  const now = new Date();
  const pipeline = [
    { $match: { shopId: new mongoose.Types.ObjectId(shopId) } },
    { $addFields: { signedAmount: { $cond: [{ $in: ['$eventType', ['payment', 'expense']] }, { $multiply: ['$amount', -1] }, '$amount'] } } },
    { $group: {
        _id: '$customerName',
        balance: { $sum: '$signedAmount' },
        lastDueDate: { $max: '$dueDate' },
        phoneNumber: { $first: '$phoneNumber' },
      }
    },
    { $match: { _id: { $ne: null }, balance: { $gt: 0 }, lastDueDate: { $lt: now } } },
  ];

  return Transaction.aggregate(pipeline);
}

async function processRemindersOnce() {
  const shopIds = (await Transaction.distinct('shopId')).filter(Boolean);
  const MAX_PER_SHOP = 100;

  for (const shopId of shopIds) {
    const subscription = await ensureSubscription(shopId);
    const quota = await assertReminderAllowed(subscription);
    if (!quota.allowed) {
      continue;
    }

    const overdue = (await findOverdueByShop(shopId)).slice(0, MAX_PER_SHOP);
    for (const entry of overdue) {
      const result = await consumeReminder(subscription);
      if (!result.allowed) break;

      await logReminder({
        shopId,
        customerName: entry._id,
        phoneNumber: entry.phoneNumber,
        dueDate: entry.lastDueDate,
        balance: entry.balance,
        channel: 'console',
        meta: { source: 'scheduler' }
      });
    }
  }
}

function scheduleReminders() {
  // Run hourly
  cron.schedule('0 * * * *', () => {
    processRemindersOnce().catch((err) => console.error('Reminder job failed', err));
  });
}

module.exports = {
  scheduleReminders,
  processRemindersOnce,
};
