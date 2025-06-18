const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// Middleware to validate transaction data
const validateTransaction = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('mode').isIn(['cash', 'upi', 'credit']).withMessage('Invalid payment mode'),
  body('customerName').if(body('mode').equals('credit')).notEmpty().withMessage('Customer name is required for credit transactions'),
  body('customerPhone').if(body('mode').equals('credit')).notEmpty().withMessage('Customer phone is required for credit transactions')
];

// Get all transactions for a user
router.get('/', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get total amount for a user
router.get('/total', auth, async (req, res) => {
  try {
    console.log('get total', req.user.id )
    const result = await Transaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    console.log(result)
    const total = result.length > 0 ? result[0].total : 0;
    res.json({ total });
  } catch (error) {
    console.error('Error calculating total:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new transaction
router.post('/', auth, async (req, res) => {
  try {
    const { amount, mode, customerName, customerPhone, description, type } = req.body;
    //console.log(req.body);
    console.log('req from transaction  route', req.body);
    //console.log('req from transaction  route', req.user);
    if (!type) {
      return res.status(400).json({ error: 'Type is required' });
    }
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    if (type === 'income' && !mode) {
      return res.status(400).json({ error: 'Payment mode is required for income' });
    }

    if (mode === 'credit' && (!customerName || !customerPhone)) {
      return res.status(400).json({
        error: 'Customer name and phone are required for credit transactions'
      });
    }

    const transaction = new Transaction({
      userId: req.user.id,
      amount,
      type,
      mode: type === 'income' ? mode : undefined,
      customerName,
      customerPhone,
      description,
      date: new Date()
    });

    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update transaction
router.put('/:id', auth, validateTransaction, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    //console.log(req.params.id, req.user.id)
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true },
      
    );

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 