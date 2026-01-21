const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { requireSubscription, requireFeature } = require('../middleware/subscription');
const Transaction = require('../models/Transaction');
const puppeteer = require('puppeteer');
const XLSX = require('xlsx');

const MAX_EXPORT_ROWS = 5000;

router.use(auth);
router.use(requireSubscription());

function buildMatch(req) {
  const match = { shopId: new mongoose.Types.ObjectId(req.user.shopId) };
  const { start, end } = req.query || {};
  if (start || end) {
    match.occurredAt = {};
    if (start) match.occurredAt.$gte = new Date(start);
    if (end) match.occurredAt.$lte = new Date(end);
  }
  return match;
}

// Utility to compute signed amount based on event type
function signedAmount(eventType, amount) {
  if (['payment', 'expense'].includes(eventType)) return -Math.abs(amount);
  return Math.abs(amount); // sale or supplier increase balance
}

// POST /api/ledger/transactions - create immutable transaction event
router.post('/transactions', auth, async (req, res) => {
  try {
    const {
      amount,
      eventType = 'sale',
      mode = 'cash',
      customerName,
      phoneNumber,
      description,
      dueDate,
      isPaid,
      occurredAt,
      clientRequestId,
    } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'amount is required and must be > 0' });
    }

    const event = {
      shopId: req.user.shopId,
      userId: req.user.id,
      amount: Number(amount),
      eventType,
      type: ['payment', 'expense'].includes(eventType) ? 'expense' : 'income',
      mode,
      customerName,
      phoneNumber,
      description,
      dueDate,
      isPaid: isPaid !== undefined ? isPaid : mode !== 'credit' || eventType === 'payment',
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      clientRequestId: clientRequestId || randomUUID(),
    };

    // Idempotent insert: only create if not exists for this shop+clientRequestId
    await Transaction.updateOne(
      { shopId: req.user.shopId, clientRequestId: event.clientRequestId },
      { $setOnInsert: event },
      { upsert: true }
    );

    const created = await Transaction.findOne({ shopId: req.user.shopId, clientRequestId: event.clientRequestId });
    return res.status(201).json(created);
  } catch (error) {
    console.error('Create transaction error:', error);
    return res.status(500).json({ message: 'Failed to create transaction' });
  }
});

// GET /api/ledger/customer - running balance for a customer
router.get('/customer', auth, async (req, res) => {
  try {
    const { customerName, page = 1, pageSize = 25 } = req.query;
    if (!customerName) {
      return res.status(400).json({ message: 'customerName is required' });
    }

    const p = Math.max(parseInt(page, 10), 1);
    const limit = Math.min(Math.max(parseInt(pageSize, 10), 1), 100);
    const skip = (p - 1) * limit;

    const pipeline = [
      { $match: { shopId: new mongoose.Types.ObjectId(req.user.shopId), customerName } },
      { $addFields: { signedAmount: { $cond: [{ $in: ['$eventType', ['payment', 'expense']] }, { $multiply: ['$amount', -1] }, '$amount'] } } },
      { $sort: { occurredAt: 1, _id: 1 } },
      {
        $setWindowFields: {
          sortBy: { occurredAt: 1, _id: 1 },
          output: {
            runningBalance: { $sum: '$signedAmount', window: { documents: ['unbounded', 'current'] } }
          }
        }
      },
      { $facet: {
          data: [ { $skip: skip }, { $limit: limit } ],
          total: [ { $count: 'count' } ],
          lastBalance: [ { $group: { _id: null, balance: { $last: '$runningBalance' } } } ]
        }
      }
    ];

    const result = await Transaction.aggregate(pipeline);
    const data = result[0]?.data || [];
    const total = result[0]?.total?.[0]?.count || 0;
    const balance = result[0]?.lastBalance?.[0]?.balance || 0;

    return res.json({
      data,
      page: p,
      pageSize: limit,
      total,
      balance,
    });
  } catch (error) {
    console.error('Customer ledger error:', error);
    return res.status(500).json({ message: 'Failed to fetch customer ledger' });
  }
});

// GET /api/ledger/summary - daily/weekly/monthly summaries
router.get('/summary', auth, async (req, res) => {
  try {
    const { range = 'daily', start, end } = req.query;
    const bucket = range === 'monthly' ? 'month' : range === 'weekly' ? 'week' : 'day';

    const match = { shopId: new mongoose.Types.ObjectId(req.user.shopId) };
    if (start || end) {
      match.occurredAt = {};
      if (start) match.occurredAt.$gte = new Date(start);
      if (end) match.occurredAt.$lte = new Date(end);
    }

    const pipeline = [
      { $match: match },
      {
        $addFields: {
          signedAmount: { $cond: [{ $in: ['$eventType', ['payment', 'expense']] }, { $multiply: ['$amount', -1] }, '$amount'] },
          bucket: { $dateTrunc: { date: '$occurredAt', unit: bucket } }
        }
      },
      {
        $group: {
          _id: '$bucket',
          total: { $sum: '$signedAmount' },
          income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const data = await Transaction.aggregate(pipeline);
    return res.json({ range: bucket, data });
  } catch (error) {
    console.error('Summary error:', error);
    return res.status(500).json({ message: 'Failed to fetch summaries' });
  }
});

// GET /api/ledger/outstanding - outstanding & overdue customers
router.get('/outstanding', auth, async (req, res) => {
  try {
    const now = new Date();
    const pipeline = [
      { $match: { shopId: new mongoose.Types.ObjectId(req.user.shopId), mode: 'credit', isPaid: false, type: { $ne: 'expense' } } },
      { $addFields: { signedAmount: { $cond: [{ $in: ['$eventType', ['payment', 'expense']] }, { $multiply: ['$amount', -1] }, '$amount'] } } },
      { $group: {
          _id: '$customerName',
          balance: { $sum: '$signedAmount' },
          lastDueDate: { $max: '$dueDate' },
          openCredits: { $sum: { $cond: [{ $and: [{ $eq: ['$mode', 'credit'] }, { $eq: ['$isPaid', false] }] }, 1, 0] } },
          phone: { $last: '$customerPhone' }
        }
      },
      { $match: { _id: { $ne: null }, balance: { $gt: 0 } } },
      { $addFields: { 
          overdue: { $and: [{ $gt: ['$lastDueDate', null] }, { $lt: ['$lastDueDate', now] }] },
          daysOverdue: { 
            $cond: [
              { $and: [{ $gt: ['$lastDueDate', null] }, { $lt: ['$lastDueDate', now] }] },
              { $divide: [{ $subtract: [now, '$lastDueDate'] }, 1000 * 60 * 60 * 24] },
              0
            ]
          }
        } 
      },
      { $sort: { overdue: -1, balance: -1 } }
    ];

    const data = await Transaction.aggregate(pipeline);
    return res.json({ data });
  } catch (error) {
    console.error('Outstanding error:', error);
    return res.status(500).json({ message: 'Failed to fetch outstanding balances' });
  }
});

// GET /api/ledger/mode-split - cash / UPI / credit split
router.get('/mode-split', auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    const match = { shopId: new mongoose.Types.ObjectId(req.user.shopId) };
    if (start || end) {
      match.occurredAt = {};
      if (start) match.occurredAt.$gte = new Date(start);
      if (end) match.occurredAt.$lte = new Date(end);
    }

    const pipeline = [
      { $match: match },
      {
        $addFields: {
          inflow: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] },
          outflow: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] },
        }
      },
      {
        $group: {
          _id: '$mode',
          inflow: { $sum: '$inflow' },
          outflow: { $sum: '$outflow' },
          net: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', { $multiply: ['$amount', -1] }] } },
          count: { $count: {} }
        }
      },
      { $sort: { net: -1 } }
    ];

    const data = await Transaction.aggregate(pipeline);
    return res.json({ data });
  } catch (error) {
    console.error('Mode split error:', error);
    return res.status(500).json({ message: 'Failed to fetch mode split' });
  }
});

// POST /api/ledger/export/pdf - scoped PDF export
router.post('/export/pdf', requireFeature('exports', { consume: true }), async (req, res) => {
  try {
    const match = buildMatch(req);
    let transactions = await Transaction.find(match).sort({ occurredAt: -1 }).limit(MAX_EXPORT_ROWS + 1).lean();
    const truncated = transactions.length > MAX_EXPORT_ROWS;
    if (truncated) transactions = transactions.slice(0, MAX_EXPORT_ROWS);

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { color: #1f2937; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Ledger Export</h1>
          <p>Total records: ${transactions.length}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Event</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Customer</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr>
                  <td>${t.occurredAt ? new Date(t.occurredAt).toLocaleString() : ''}</td>
                  <td>${t.type || ''}</td>
                  <td>${t.eventType || ''}</td>
                  <td>${t.amount}</td>
                  <td>${t.mode || ''}</td>
                  <td>${t.customerName || ''}</td>
                  <td>${t.description || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ledger.pdf"');
    if (truncated) {
      res.setHeader('X-Export-Truncated', 'true');
    }
    return res.end(pdfBuffer);
  } catch (error) {
    console.error('Ledger PDF export failed:', error);
    return res.status(500).json({ message: 'Failed to export PDF' });
  }
});

// POST /api/ledger/export/excel - scoped Excel export
router.post('/export/excel', requireFeature('exports', { consume: true }), async (req, res) => {
  try {
    const match = buildMatch(req);
    let transactions = await Transaction.find(match).sort({ occurredAt: -1 }).limit(MAX_EXPORT_ROWS + 1).lean();
    const truncated = transactions.length > MAX_EXPORT_ROWS;
    if (truncated) transactions = transactions.slice(0, MAX_EXPORT_ROWS);

    const rows = transactions.map((t) => ({
      Date: t.occurredAt ? new Date(t.occurredAt).toISOString() : '',
      Type: t.type || '',
      Event: t.eventType || '',
      Amount: t.amount,
      Mode: t.mode || '',
      Customer: t.customerName || '',
      Description: t.description || '',
      DueDate: t.dueDate ? new Date(t.dueDate).toISOString() : '',
      Paid: t.isPaid,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ledger.xlsx"');
    if (truncated) {
      res.setHeader('X-Export-Truncated', 'true');
    }
    return res.end(buffer);
  } catch (error) {
    console.error('Ledger Excel export failed:', error);
    return res.status(500).json({ message: 'Failed to export Excel' });
  }
});

module.exports = router;
