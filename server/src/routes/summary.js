const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// Helper to convert shopId to ObjectId
const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
};

// Apply auth middleware
router.use(auth);

// Get summary of transactions
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, mode } = req.query;
    const query = { shopId: toObjectId(req.user.shopId) };

    if (mode && mode !== 'all') {
      query.mode = mode;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const transactions = await Transaction.find(query);
    
    const summary = {
      totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      totalExpense: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      totalCount: transactions.length,
      byMode: {
        cash: transactions.filter(t => t.mode === 'cash').reduce((sum, t) => sum + t.amount, 0),
        upi: transactions.filter(t => t.mode === 'upi').reduce((sum, t) => sum + t.amount, 0),
        credit: transactions.filter(t => t.mode === 'credit').reduce((sum, t) => sum + t.amount, 0)
      },
      byType: {
        income: transactions.filter(t => t.type === 'income').length,
        expense: transactions.filter(t => t.type === 'expense').length
      }
    };

    summary.netBalance = summary.totalIncome - summary.totalExpense;

    res.json(summary);
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lightweight totals without fetching all transactions
router.get('/quick', async (req, res) => {
  try {
    const shopId = toObjectId(req.user.shopId);

    const [result] = await Transaction.aggregate([
      { $match: { shopId } },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          totalExpense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } }
        }
      }
    ]);

    const totalIncome = result?.totalIncome || 0;
    const totalExpense = result?.totalExpense || 0;

    res.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    });
  } catch (error) {
    console.error('Quick summary error:', error);
    res.status(500).json({ error: 'Failed to fetch quick summary' });
  }
});

// Daily summary for dashboard
router.get('/daily', async (req, res) => {
  try {
    const shopId = toObjectId(req.user.shopId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTransactions = await Transaction.find({
      shopId,
      date: { $gte: today, $lt: tomorrow }
    });

    const income = todayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = todayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    res.json({
      date: today.toISOString(),
      income,
      expense,
      net: income - expense,
      transactionCount: todayTransactions.length,
      byMode: {
        cash: todayTransactions.filter(t => t.mode === 'cash').reduce((sum, t) => sum + t.amount, 0),
        upi: todayTransactions.filter(t => t.mode === 'upi').reduce((sum, t) => sum + t.amount, 0),
        credit: todayTransactions.filter(t => t.mode === 'credit').reduce((sum, t) => sum + t.amount, 0)
      }
    });
  } catch (error) {
    console.error('Daily summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 