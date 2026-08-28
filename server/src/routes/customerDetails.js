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

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/customer-details/vendor/:name - Vendor expense details page data
router.get('/vendor/:name', async (req, res) => {
  try {
    const shopId = toObjectId(req.user.shopId);
    const vendorName = decodeURIComponent(req.params.name);

    const {
      startDate,
      endDate,
      mode,        // 'cash' | 'upi' | 'credit'
      status,      // 'paid' | 'unpaid'
      sortBy = 'date',
      sortOrder = 'desc',
      limit = 100,
      page = 1
    } = req.query;

    const filter = {
      shopId,
      type: 'expense',
      customerName: { $regex: new RegExp(`^${escapeRegExp(vendorName)}$`, 'i') }
    };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (mode) filter.mode = mode;
    if (status === 'paid') filter.isPaid = true;
    if (status === 'unpaid') filter.isPaid = false;

    const totalCount = await Transaction.countDocuments(filter);
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const transactions = await Transaction.find(filter)
      .sort(sort)
      .limit(parseInt(limit, 10))
      .skip(skip)
      .lean();

    const summary = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalExpense: { $sum: '$amount' },
          totalCash: {
            $sum: { $cond: [{ $eq: ['$mode', 'cash'] }, '$amount', 0] }
          },
          totalUPI: {
            $sum: { $cond: [{ $eq: ['$mode', 'upi'] }, '$amount', 0] }
          },
          totalCredit: {
            $sum: { $cond: [{ $eq: ['$mode', 'credit'] }, '$amount', 0] }
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ['$isPaid', true] }, '$amount', 0] }
          },
          unpaidAmount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$mode', 'credit'] }, { $eq: ['$isPaid', false] }] },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);

    const vendorInfo = await Transaction.findOne(filter)
      .select('customerName customerPhone')
      .lean();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyBreakdown = await Transaction.aggregate([
      {
        $match: {
          ...filter,
          date: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalExpense: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const outstandingCredits = await Transaction.find({
      ...filter,
      mode: 'credit',
      isPaid: false
    })
      .sort({ dueDate: 1 })
      .limit(20)
      .lean();

    const summaryData = summary[0] || {
      totalTransactions: 0,
      totalExpense: 0,
      totalCash: 0,
      totalUPI: 0,
      totalCredit: 0,
      paidAmount: 0,
      unpaidAmount: 0
    };

    res.json({
      vendor: {
        name: vendorName,
        phone: vendorInfo?.customerPhone || null
      },
      summary: {
        ...summaryData,
        netPayable: summaryData.unpaidAmount
      },
      transactions,
      pagination: {
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
        totalCount,
        perPage: parseInt(limit, 10),
        hasMore: skip + transactions.length < totalCount
      },
      monthlyBreakdown,
      outstandingCredits,
      filters: { startDate, endDate, mode, status }
    });
  } catch (error) {
    console.error('Error fetching vendor details:', error);
    res.status(500).json({ error: 'Failed to fetch vendor details' });
  }
});

// GET /api/customer-details/:name - Get detailed transaction breakdown for a customer
router.get('/:name', async (req, res) => {
  try {
    const shopId = toObjectId(req.user.shopId);
    const customerName = decodeURIComponent(req.params.name);
    
    // Query parameters for filtering
    const {
      startDate,
      endDate,
      type,        // 'income' | 'expense'
      mode,        // 'cash' | 'upi' | 'credit'
      status,      // 'paid' | 'unpaid'
      sortBy = 'date',
      sortOrder = 'desc',
      limit = 100,
      page = 1
    } = req.query;

    // Build filter query
    const filter = {
      shopId,
      customerName: { $regex: new RegExp(`^${escapeRegExp(customerName)}$`, 'i') }
    };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (type) filter.type = type;
    if (mode) filter.mode = mode;
    if (status === 'paid') filter.isPaid = true;
    if (status === 'unpaid') filter.isPaid = false;

    // Get total count for pagination
    const totalCount = await Transaction.countDocuments(filter);

    // Get transactions with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const transactions = await Transaction.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Calculate summary statistics
    const summary = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalIncome: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
          },
          totalExpense: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
          },
          totalCash: {
            $sum: { $cond: [{ $eq: ['$mode', 'cash'] }, '$amount', 0] }
          },
          totalUPI: {
            $sum: { $cond: [{ $eq: ['$mode', 'upi'] }, '$amount', 0] }
          },
          totalCredit: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$mode', 'credit'] }, { $ne: ['$type', 'expense'] }] },
                '$amount',
                0
              ]
            }
          },
          paidAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$mode', 'credit'] },
                    { $eq: ['$isPaid', true] },
                    { $ne: ['$type', 'expense'] }
                  ]
                },
                '$amount',
                0
              ]
            }
          },
          unpaidAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$mode', 'credit'] },
                    { $eq: ['$isPaid', false] },
                    { $ne: ['$type', 'expense'] }
                  ]
                },
                '$amount',
                0
              ]
            }
          },
          creditIncomeCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$mode', 'credit'] }, { $eq: ['$type', 'income'] }] },
                1,
                0
              ]
            }
          },
          creditExpenseCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$mode', 'credit'] }, { $eq: ['$type', 'expense'] }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get customer contact info
    const customerInfo = await Transaction.findOne(filter)
      .select('customerName customerPhone')
      .lean();

    // Calculate breakdown by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyBreakdown = await Transaction.aggregate([
      {
        $match: {
          ...filter,
          date: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalIncome: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
          },
          totalExpense: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Outstanding credit transactions
    const outstandingCredits = await Transaction.find({
      ...filter,
      mode: 'credit',
      type: { $ne: 'expense' },
      isPaid: false
    })
      .sort({ dueDate: 1 })
      .limit(10)
      .lean();

    const summaryData = summary[0] || {
      totalTransactions: 0,
      totalIncome: 0,
      totalExpense: 0,
      totalCash: 0,
      totalUPI: 0,
      totalCredit: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      creditIncomeCount: 0,
      creditExpenseCount: 0
    };

    res.json({
      customer: {
        name: customerName,
        phone: customerInfo?.customerPhone || null
      },
      summary: {
        ...summaryData,
        balance: summaryData.totalIncome - summaryData.totalExpense,
        netReceivable: summaryData.unpaidAmount
      },
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        perPage: parseInt(limit),
        hasMore: skip + transactions.length < totalCount
      },
      monthlyBreakdown,
      outstandingCredits,
      filters: { startDate, endDate, type, mode, status }
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    res.status(500).json({ error: 'Failed to fetch customer details' });
  }
});

// POST /api/customer-details/:name/mark-paid - Mark a transaction as paid
router.post('/:name/mark-paid', async (req, res) => {
  try {
    const shopId = toObjectId(req.user.shopId);
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const transaction = await Transaction.findOne({
      _id: transactionId,
      shopId,
      mode: 'credit',
      isPaid: false
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    transaction.isPaid = true;
    await transaction.save();

    res.json({ success: true, transaction });
  } catch (error) {
    console.error('Error marking transaction as paid:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// POST /api/customer-details/:name/record-payment - Record a payment against credit
router.post('/:name/record-payment', async (req, res) => {
  try {
    const shopId = toObjectId(req.user.shopId);
    const customerName = decodeURIComponent(req.params.name);
    const { amount, mode = 'cash', transactionIds, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // If specific transactions are provided, mark them as paid
    if (transactionIds && transactionIds.length > 0) {
      await Transaction.updateMany(
        {
          _id: { $in: transactionIds },
          shopId,
          customerName: { $regex: new RegExp(`^${escapeRegExp(customerName)}$`, 'i') },
          mode: 'credit',
          type: { $ne: 'expense' },
          isPaid: false
        },
        { isPaid: true }
      );
    }

    // Create a payment transaction record
    const paymentTransaction = new Transaction({
      shopId,
      userId: req.user.id,
      customerName,
      amount,
      type: 'income',
      mode,
      eventType: 'payment',
      description: description || `Payment received from ${customerName}`,
      isPaid: true,
      date: new Date()
    });

    await paymentTransaction.save();

    res.json({ success: true, payment: paymentTransaction });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// GET /api/customer-details/:name/statement - Get customer statement for export
router.get('/:name/statement', async (req, res) => {
  try {
    const shopId = toObjectId(req.user.shopId);
    const customerName = decodeURIComponent(req.params.name);
    const { startDate, endDate } = req.query;

    const filter = {
      shopId,
      customerName: { $regex: new RegExp(`^${escapeRegExp(customerName)}$`, 'i') }
    };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const transactions = await Transaction.find(filter)
      .sort({ date: 1 })
      .lean();

    // Calculate running balance
    let runningBalance = 0;
    const statementData = transactions.map(txn => {
      if (txn.type === 'income') {
        runningBalance += txn.amount;
      } else {
        runningBalance -= txn.amount;
      }

      return {
        date: txn.date,
        description: txn.description || `${txn.type} - ${txn.mode}`,
        type: txn.type,
        mode: txn.mode,
        debit: txn.type === 'expense' ? txn.amount : 0,
        credit: txn.type === 'income' ? txn.amount : 0,
        balance: runningBalance,
        isPaid: txn.isPaid,
        dueDate: txn.dueDate
      };
    });

    res.json({
      customer: customerName,
      period: { startDate, endDate },
      openingBalance: 0,
      closingBalance: runningBalance,
      transactions: statementData,
      summary: {
        totalDebit: statementData.reduce((sum, t) => sum + t.debit, 0),
        totalCredit: statementData.reduce((sum, t) => sum + t.credit, 0),
        netBalance: runningBalance
      }
    });
  } catch (error) {
    console.error('Error generating statement:', error);
    res.status(500).json({ error: 'Failed to generate statement' });
  }
});

module.exports = router;
