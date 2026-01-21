const Reminder = require('../models/Reminder');

async function logReminder({ shopId, customerName, phoneNumber, dueDate, balance, channel = 'console', meta = {} }) {
  const message = `Reminder -> Shop:${shopId} Customer:${customerName} Due:${dueDate ? new Date(dueDate).toISOString() : 'n/a'} Balance:${balance}`;
  console.log(message);
  await Reminder.create({ shopId, customerName, phoneNumber, dueDate, balance, channel, meta, status: 'sent', lastNotifiedAt: new Date() });
}

module.exports = {
  logReminder,
};
