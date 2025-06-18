const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// Get summary of transactions
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, mode } = req.query;
    const query = { userId: req.user.uid };

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
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      totalCount: transactions.length,
      byMode: {
        cash: transactions.filter(t => t.mode === 'cash').reduce((sum, t) => sum + t.amount, 0),
        upi: transactions.filter(t => t.mode === 'upi').reduce((sum, t) => sum + t.amount, 0),
        credit: transactions.filter(t => t.mode === 'credit').reduce((sum, t) => sum + t.amount, 0)
      }
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 