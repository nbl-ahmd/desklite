const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { requireSubscription } = require('../middleware/subscription');
const mongoose = require('mongoose');

// Helper to convert shopId to ObjectId
const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
};

const scopedFilter = (req) => ({ shopId: toObjectId(req.user.shopId) });

// Middleware to validate transaction data for creation
const validateTransaction = [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('mode').isIn(['cash', 'upi', 'credit']).withMessage('Invalid payment mode'),
  body('customerName').if(body('mode').equals('credit')).notEmpty().withMessage('Customer name is required for credit transactions'),
  body('customerPhone').if(body('mode').equals('credit')).notEmpty().withMessage('Customer phone is required for credit transactions')
];

// Middleware to validate transaction data for updates (more flexible)
const validateTransactionUpdate = [
  body('amount').optional().isNumeric().withMessage('Amount must be a number'),
  body('mode').optional().custom((value, { req }) => {
    if (value !== undefined && value !== null && value !== '') {
      if (!['cash', 'upi', 'credit'].includes(value)) {
        throw new Error('Invalid payment mode');
      }
    }
    return true;
  }),
  body('customerName').optional(),
  body('customerPhone').optional(),
  body('description').optional(),
  body('type').optional().isIn(['income', 'expense']).withMessage('Invalid transaction type'),
  body('date').optional(),
  body('userId').optional(),
  body('_id').optional(),
  body('__v').optional()
];

// Load auth and subscription for all routes; writes will be blocked if subscription is expired beyond grace
router.use(auth);
router.use(requireSubscription());

// Get all transactions for a user (with pagination)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 per page
    const skip = (page - 1) * limit;
    
    const filter = scopedFilter(req);
    
    // Optional date filtering
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to) filter.date.$lte = new Date(req.query.to);
    }
    
    // Optional mode filtering
    if (req.query.mode && ['cash', 'upi', 'credit'].includes(req.query.mode)) {
      filter.mode = req.query.mode;
    }
    
    // Optional type filtering
    if (req.query.type && ['income', 'expense'].includes(req.query.type)) {
      filter.type = req.query.type;
    }
    
    // Optional customer search
    if (req.query.customer) {
      filter.customerName = { $regex: req.query.customer, $options: 'i' };
    }
    
    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(filter)
    ]);
    
    res.json({
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get total amount for a user
router.get('/total', async (req, res) => {
  try {
    console.log('get total', req.user.id )
    const match = scopedFilter(req);
    if (match.shopId && mongoose.Types.ObjectId.isValid(match.shopId)) {
      match.shopId = new mongoose.Types.ObjectId(match.shopId);
    }
    const result = await Transaction.aggregate([
      { $match: match },
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
router.post('/', async (req, res) => {
  try {
    const { amount, mode, customerName, customerPhone, description, type, dueDate } = req.body;
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

    const txnMode = mode || 'cash';
    const isCredit = txnMode === 'credit';

    const transaction = new Transaction({
      shopId: toObjectId(req.user.shopId),
      userId: req.user.id,
      amount,
      type,
      mode: txnMode,
      customerName,
      customerPhone,
      description,
      date: new Date(),
      occurredAt: new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      // For credit (including expense to vendors), ensure it remains unpaid until settled
      isPaid: isCredit ? false : undefined
    });

    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update transaction (only allowed fields)
router.put('/:id', validateTransactionUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Only allow specific fields to be updated (prevent mass assignment)
    const allowedUpdates = ['amount', 'mode', 'customerName', 'customerPhone', 'description', 'type', 'date'];
    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, ...scopedFilter(req) },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark credit transactions for a customer/vendor as paid
router.post('/mark-paid', async (req, res) => {
  try {
    const { customerName, kind = 'customer' } = req.body || {};

    if (!customerName) {
      return res.status(400).json({ error: 'customerName is required' });
    }

    // Vendors: just close unpaid credit expenses
    if (kind === 'vendor') {
      const result = await Transaction.updateMany(
        {
          shopId: toObjectId(req.user.shopId),
          customerName,
          mode: 'credit',
          type: 'expense',
          isPaid: false
        },
        { $set: { isPaid: true } }
      );

      return res.json({ updated: result.modifiedCount, createdPayment: false, kind });
    }

    // Customers: create a payment entry to offset balance and mark credit tx as paid
    const match = {
      shopId: toObjectId(req.user.shopId),
      customerName,
      mode: 'credit',
      type: { $ne: 'expense' },
      isPaid: false
    };

    const [creditTx] = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$customerName',
          total: { $sum: '$amount' },
          phone: { $first: '$customerPhone' }
        }
      }
    ]);

    if (!creditTx || creditTx.total <= 0) {
      return res.json({ updated: 0, createdPayment: false, kind });
    }

    // Mark existing credit as paid
    const updated = await Transaction.updateMany(match, { $set: { isPaid: true } });

    // Insert payment event to offset balance in ledger
    const payment = new Transaction({
      shopId: toObjectId(req.user.shopId),
      userId: req.user.id,
      amount: creditTx.total,
      eventType: 'payment',
      type: 'expense',
      mode: 'cash',
      customerName,
      customerPhone: creditTx.phone,
      description: 'Marked paid (manual)',
      isPaid: true,
      date: new Date(),
      occurredAt: new Date()
    });
    await payment.save();

    res.json({ updated: updated.modifiedCount, createdPayment: true, kind });
  } catch (error) {
    console.error('Error marking transactions paid:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      ...scopedFilter(req)
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