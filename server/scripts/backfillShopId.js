require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction');
const Subscription = require('../src/models/Subscription');

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not set');
  }
  await mongoose.connect(process.env.MONGODB_URI);

  // Backfill transactions: set shopId to userId where missing
  const resTx = await Transaction.updateMany(
    { $or: [{ shopId: { $exists: false } }, { shopId: null }] },
    [
      { $set: { shopId: '$userId' } }
    ]
  );
  console.log(`Transactions updated: ${resTx.modifiedCount}`);

  // Ensure subscriptions have shopId
  const subsMissing = await Subscription.find({ $or: [{ shopId: { $exists: false } }, { shopId: null }] }).lean();
  let subUpdated = 0;
  for (const sub of subsMissing) {
    // skip if a subscription with this userId already exists with shopId set (unique constraint)
    const existing = await Subscription.findOne({ shopId: sub.userId });
    if (existing) continue;
    await Subscription.updateOne({ _id: sub._id }, { $set: { shopId: sub.userId } });
    subUpdated += 1;
  }
  console.log(`Subscriptions updated: ${subUpdated}`);

  // Create required indexes
  await Transaction.collection.createIndex({ shopId: 1, clientRequestId: 1 }, { unique: true, partialFilterExpression: { clientRequestId: { $exists: true } } });
  await Transaction.collection.createIndex({ shopId: 1, dueDate: 1 });

  await mongoose.disconnect();
  console.log('Backfill complete');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
