const express = require('express');
const { randomUUID } = require('crypto');
const router = express.Router();
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const { requireSubscription } = require('../middleware/subscription');

// Helper to convert shopId to ObjectId
const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
};

// POST /api/sync
// Accepts batched transactions from offline queue. Idempotent via clientRequestId.
router.post('/', auth, requireSubscription(), async (req, res) => {
  try {
    const { transactions = [] } = req.body || {};

    if (!Array.isArray(transactions)) {
      return res.status(400).json({ message: 'transactions must be an array' });
    }

    const shopId = toObjectId(req.user.shopId);

    // Preserve ordering by createdAt so inserts respect client sequence.
    const sorted = [...transactions].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    const syncedIds = [];

    for (const item of sorted) {
      const clientRequestId = item.clientRequestId || randomUUID();
      const payload = {
        userId: req.user.id,
        shopId: shopId,
        amount: item.amount,
        type: item.type,
        mode: item.mode,
        customerName: item.customerName,
        phoneNumber: item.phoneNumber,
        description: item.description,
        dueDate: item.dueDate,
        isPaid: item.isPaid !== undefined ? item.isPaid : item.mode !== 'credit',
        date: item.createdAt ? new Date(item.createdAt) : new Date(),
        occurredAt: item.occurredAt ? new Date(item.occurredAt) : (item.createdAt ? new Date(item.createdAt) : new Date()),
        clientRequestId,
      };

      // Upsert without overwriting existing rows to keep immutability and idempotency.
      await Transaction.updateOne(
        { shopId: shopId, clientRequestId },
        { $setOnInsert: payload },
        { upsert: true }
      );

      syncedIds.push(clientRequestId);
    }

    return res.json({ syncedIds });
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ message: 'Failed to sync transactions' });
  }
});

module.exports = router;
