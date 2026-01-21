const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

router.use(auth);

// Helper to convert shopId to ObjectId
const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
};

// Get all unique customers with their balance summary
router.get('/', async (req, res) => {
  try {
    const shopId = toObjectId(req.user.shopId);
    
    const customers = await Transaction.aggregate([
      { $match: { shopId: shopId, customerName: { $exists: true, $nin: [null, ''] } } },
      {
        $group: {
          _id: '$customerName',
          phone: { $first: '$customerPhone' },
          totalIncome: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
          },
          totalExpense: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
          },
          creditAmount: {
            $sum: { $cond: [{ $eq: ['$mode', 'credit'] }, '$amount', 0] }
          },
          transactionCount: { $sum: 1 },
          lastTransaction: { $max: '$date' },
          firstTransaction: { $min: '$date' }
        }
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          phone: 1,
          totalIncome: 1,
          totalExpense: 1,
          creditAmount: 1,
          balance: { $subtract: ['$totalIncome', '$totalExpense'] },
          transactionCount: 1,
          lastTransaction: 1,
          firstTransaction: 1
        }
      },
      { $sort: { lastTransaction: -1 } }
    ]);

    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get customers with outstanding credit (Lena - To Receive)
router.get('/receivables', async (req, res) => {
  try {
    const shopId = toObjectId(req.user.shopId);
    
    const receivables = await Transaction.aggregate([
      { 
        $match: { 
          shopId: shopId, 
          mode: 'credit',
          customerName: { $exists: true, $ne: null, $ne: '' }
        } 
      },
      {
        $group: {
          _id: '$customerName',
          phone: { $first: '$customerPhone' },
          totalCredit: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          lastTransaction: { $max: '$date' },
          oldestDue: { $min: '$date' }
        }
      },
      { $match: { totalCredit: { $gt: 0 } } },
      {
        $project: {
          _id: 0,
          name: '$_id',
          phone: 1,
          amount: '$totalCredit',
          transactionCount: 1,
          lastTransaction: 1,
          oldestDue: 1,
          daysSinceOldest: {
            $divide: [
              { $subtract: [new Date(), '$oldestDue'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      { $sort: { amount: -1 } }
    ]);

    const totalReceivable = receivables.reduce((sum, r) => sum + r.amount, 0);

    res.json({
      customers: receivables,
      total: totalReceivable,
      count: receivables.length
    });
  } catch (error) {
    console.error('Error fetching receivables:', error);
    res.status(500).json({ error: 'Failed to fetch receivables' });
  }
});

// Get single customer details with transaction history
router.get('/:name', async (req, res) => {
  try {
    const shopId = toObjectId(req.user.shopId);
    const customerName = decodeURIComponent(req.params.name);
    
    const transactions = await Transaction.find({
      shopId,
      customerName: { $regex: new RegExp(`^${customerName}$`, 'i') }
    }).sort({ date: -1 }).limit(100);

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const summary = transactions.reduce((acc, t) => {
      if (t.type === 'income') acc.totalIncome += t.amount;
      if (t.type === 'expense') acc.totalExpense += t.amount;
      if (t.mode === 'credit') acc.creditAmount += t.amount;
      return acc;
    }, { totalIncome: 0, totalExpense: 0, creditAmount: 0 });

    res.json({
      name: customerName,
      phone: transactions[0].customerPhone,
      ...summary,
      balance: summary.totalIncome - summary.totalExpense,
      transactions
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer details' });
  }
});

module.exports = router;
