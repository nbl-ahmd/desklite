const router = require('express').Router();
const Bill = require('../models/Bill');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const auth = require('../middleware/auth');

// Get all bills for user
router.get('/', auth, async (req, res) => {
  try {
    const { 
      status, 
      paymentStatus, 
      from, 
      to, 
      customer,
      search,
      sortBy = 'billDate',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const query = { userId: req.user.id };
    
    if (req.user.shopId) {
      query.shopId = req.user.shopId;
    }

    // Filters
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    
    if (from || to) {
      query.billDate = {};
      if (from) query.billDate.$gte = new Date(from);
      if (to) query.billDate.$lte = new Date(to);
    }

    if (customer) {
      query.customerName = new RegExp(customer, 'i');
    }

    if (search) {
      query.$or = [
        { billNumber: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
        { customerPhone: new RegExp(search, 'i') }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [bills, total] = await Promise.all([
      Bill.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-verificationCode')
        .lean(),
      Bill.countDocuments(query)
    ]);

    // Calculate summary
    const summary = await Bill.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$amountPaid' },
          totalDue: { $sum: '$amountDue' },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
          },
          unpaidCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, 1, 0] }
          },
          partialCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'partial'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      bills,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      },
      summary: summary[0] || {
        totalSales: 0,
        totalPaid: 0,
        totalDue: 0,
        paidCount: 0,
        unpaidCount: 0,
        partialCount: 0
      }
    });

  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// Get single bill by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).lean();

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json(bill);
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

// Create new bill
router.post('/', auth, async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      items,
      paymentMode,
      amountPaid,
      dueDate,
      notes,
      termsAndConditions,
      billDate,
      shippingCharges,
      otherCharges,
      roundOff,
      createTransaction = true
    } = req.body;

    // Validation
    if (!customerName || !items || items.length === 0) {
      return res.status(400).json({ 
        error: 'Customer name and items are required' 
      });
    }

    // Generate bill number and verification code
    const billNumber = await Bill.generateBillNumber(req.user.id);
    const verificationCode = Bill.generateVerificationCode();

    // Create bill
    const bill = new Bill({
      billNumber,
      verificationCode,
      userId: req.user.id,
      shopId: req.user.shopId,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit || 'pcs',
        price: item.price,
        discount: item.discount || 0,
        taxPercent: item.taxPercent || 0,
        total: (item.price * item.quantity) - (item.discount || 0) + 
               ((item.price * item.quantity - (item.discount || 0)) * (item.taxPercent || 0) / 100)
      })),
      paymentMode: paymentMode || 'cash',
      amountPaid: amountPaid || 0,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes,
      termsAndConditions,
      billDate: billDate ? new Date(billDate) : new Date(),
      shippingCharges: shippingCharges || 0,
      otherCharges: otherCharges || 0,
      roundOff: roundOff || 0,
      status: 'sent'
    });

    // Deduct stock for matching products and log movements before final save
    const billDateObj = bill.billDate || new Date();
    const stockActions = [];

    for (const item of bill.items) {
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;

      const product = item.productId
        ? await Product.findOne({ _id: item.productId, userId: req.user.id })
        : await Product.findOne({ userId: req.user.id, name: item.name.trim() });

      if (!product) continue;

      const newStock = (product.stock || 0) - qty;
      if (newStock < 0) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }

      stockActions.push({ product, qty, newStock });
    }

    // Apply stock changes after all checks pass
    for (const action of stockActions) {
      const { product, qty, newStock } = action;
      product.stock = newStock;
      product.lastSoldAt = billDateObj;
      await product.save();

      await StockMovement.create({
        productId: product._id,
        userId: req.user.id,
        shopId: req.user.shopId,
        type: 'sale',
        direction: 'out',
        quantity: qty,
        unitCost: product.purchasePrice || 0,
        note: `Bill ${bill.billNumber}`,
        referenceType: 'bill',
        referenceId: bill._id,
        occurredAt: billDateObj,
        closingStock: product.stock
      });
    }

    await bill.save();

    // Create transaction if requested
    if (createTransaction && bill.amountPaid > 0) {
      const transaction = new Transaction({
        userId: req.user.id,
        shopId: req.user.shopId,
        amount: bill.amountPaid,
        type: 'income',
        eventType: 'sale',
        mode: bill.paymentMode === 'credit' ? 'credit' : bill.paymentMode,
        customerName: bill.customerName,
        customerPhone: bill.customerPhone,
        description: `Bill ${bill.billNumber}`,
        date: bill.billDate,
        isPaid: bill.paymentStatus === 'paid',
        dueDate: bill.dueDate
      });

      await transaction.save();

      // Link transaction to bill
      bill.transactionId = transaction._id;
      await bill.save();
    }

    res.status(201).json({
      bill,
      message: 'Bill created successfully'
    });

  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

// Update bill
router.put('/:id', auth, async (req, res) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Prevent editing paid bills
    if (bill.paymentStatus === 'paid' && req.body.items) {
      return res.status(400).json({ 
        error: 'Cannot modify items of paid bills' 
      });
    }

    const allowedUpdates = [
      'customerName', 'customerPhone', 'customerEmail', 'customerAddress',
      'items', 'notes', 'termsAndConditions', 'dueDate',
      'shippingCharges', 'otherCharges', 'roundOff', 'status'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        bill[field] = req.body[field];
      }
    });

    await bill.save();

    res.json({
      bill,
      message: 'Bill updated successfully'
    });

  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({ error: 'Failed to update bill' });
  }
});

// Record payment for bill
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const { amount, mode, notes, date } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const bill = await Bill.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (bill.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Bill is already paid' });
    }

    // Update bill payment
    const previousPaid = bill.amountPaid;
    bill.amountPaid += amount;
    
    if (bill.amountPaid >= bill.grandTotal) {
      bill.amountPaid = bill.grandTotal;
      bill.paymentStatus = 'paid';
      bill.amountDue = 0;
    } else if (bill.amountPaid > 0) {
      bill.paymentStatus = 'partial';
      bill.amountDue = bill.grandTotal - bill.amountPaid;
    }

    await bill.save();

    // Create transaction for payment
    const transaction = new Transaction({
      userId: req.user.id,
      shopId: req.user.shopId,
      amount,
      type: 'income',
      eventType: 'payment',
      mode: mode || 'cash',
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
      description: notes || `Payment for bill ${bill.billNumber}`,
      date: date ? new Date(date) : new Date(),
      isPaid: true
    });

    await transaction.save();

    res.json({
      bill,
      transaction,
      message: 'Payment recorded successfully'
    });

  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Cancel bill
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;

    const bill = await Bill.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (bill.status === 'cancelled') {
      return res.status(400).json({ error: 'Bill is already cancelled' });
    }

    bill.status = 'cancelled';
    bill.cancelledAt = new Date();
    bill.cancelReason = reason;
    await bill.save();

    // Restock items for matching products when bill is cancelled
    const billDateObj = bill.billDate || new Date();
    for (const item of bill.items || []) {
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;

      const product = item.productId
        ? await Product.findOne({ _id: item.productId, userId: req.user.id })
        : await Product.findOne({ userId: req.user.id, name: item.name.trim() });

      if (!product) continue;

      product.stock = (product.stock || 0) + qty;
      product.lastRestockedAt = new Date();
      await product.save();

      await StockMovement.create({
        productId: product._id,
        userId: req.user.id,
        shopId: req.user.shopId,
        type: 'correction',
        direction: 'in',
        quantity: qty,
        unitCost: product.purchasePrice || 0,
        note: `Restock for cancelled bill ${bill.billNumber}`,
        referenceType: 'bill',
        referenceId: bill._id,
        occurredAt: billDateObj,
        closingStock: product.stock
      });
    }

    res.json({
      bill,
      message: 'Bill cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling bill:', error);
    res.status(500).json({ error: 'Failed to cancel bill' });
  }
});

// Get bill by verification code (public route for customers)
router.get('/public/:verificationCode', async (req, res) => {
  try {
    const bill = await Bill.findOne({
      verificationCode: req.params.verificationCode
    }).select('-userId -shopId -__v');

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Get shop details
    const user = await User.findById(bill.userId).select('shopName phone address upiId');

    // Update view tracking
    bill.viewCount += 1;
    bill.lastViewedAt = new Date();
    if (bill.status === 'sent') {
      bill.status = 'viewed';
    }
    await bill.save();

    res.json({
      bill,
      shop: user ? {
        name: user.shopName,
        phone: user.phone,
        address: user.address,
        upiId: user.upiId
      } : null
    });

  } catch (error) {
    console.error('Error fetching public bill:', error);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

// Generate bill statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { from, to } = req.query;

    const matchQuery = { userId: req.user.id };
    if (req.user.shopId) {
      matchQuery.shopId = req.user.shopId;
    }

    if (from || to) {
      matchQuery.billDate = {};
      if (from) matchQuery.billDate.$gte = new Date(from);
      if (to) matchQuery.billDate.$lte = new Date(to);
    }

    const stats = await Bill.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                totalBills: { $sum: 1 },
                totalSales: { $sum: '$grandTotal' },
                totalPaid: { $sum: '$amountPaid' },
                totalDue: { $sum: '$amountDue' },
                avgBillValue: { $avg: '$grandTotal' }
              }
            }
          ],
          byStatus: [
            {
              $group: {
                _id: '$paymentStatus',
                count: { $sum: 1 },
                amount: { $sum: '$grandTotal' }
              }
            }
          ],
          byPaymentMode: [
            {
              $group: {
                _id: '$paymentMode',
                count: { $sum: 1 },
                amount: { $sum: '$amountPaid' }
              }
            }
          ],
          topCustomers: [
            {
              $group: {
                _id: '$customerName',
                totalPurchases: { $sum: '$grandTotal' },
                billCount: { $sum: 1 },
                totalDue: { $sum: '$amountDue' }
              }
            },
            { $sort: { totalPurchases: -1 } },
            { $limit: 10 }
          ],
          monthlyTrend: [
            {
              $group: {
                _id: {
                  year: { $year: '$billDate' },
                  month: { $month: '$billDate' }
                },
                sales: { $sum: '$grandTotal' },
                billCount: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
          ]
        }
      }
    ]);

    res.json(stats[0]);

  } catch (error) {
    console.error('Error fetching bill stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
