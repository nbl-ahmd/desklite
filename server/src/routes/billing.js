const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { normalizePlan, getSubscriptionWithStatus, buildSubscriptionResponse, PLAN_CONFIG } = require('../services/subscriptionService');
const Subscription = require('../models/Subscription');

// POST /api/billing/activate - mock activation/upgrade without payment
router.post('/activate', auth, async (req, res) => {
  try {
    const { plan, daysValid = 365 } = req.body || {};
    const planId = normalizePlan(plan);

    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + Number(daysValid));

    const subscription = await Subscription.findOneAndUpdate(
      { shopId: req.user.shopId },
      {
        $set: {
          plan: planId,
          startDate: now,
          expiryDate: expiry,
          status: 'active',
          graceUntil: null,
        }
      },
      { upsert: true, new: true }
    );

    const { statusInfo, features } = await getSubscriptionWithStatus(req.user.shopId);
    return res.json({
      message: `Activated ${planId.toUpperCase()} plan for ${daysValid} days`,
      subscription: buildSubscriptionResponse(subscription, statusInfo, features),
      config: PLAN_CONFIG[planId],
    });
  } catch (error) {
    console.error('Billing activation error:', error);
    res.status(500).json({ message: 'Failed to activate subscription' });
  }
});

// GET /api/billing/plan - fetch current subscription with features
router.get('/plan', auth, async (req, res) => {
  try {
    const { subscription, statusInfo, features } = await getSubscriptionWithStatus(req.user.shopId);
    return res.json(buildSubscriptionResponse(subscription, statusInfo, features));
  } catch (error) {
    console.error('Billing plan fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch subscription' });
  }
});

router.patch('/features', auth, async (req, res) => {
  try {
    const { expenseSplittingEnabled } = req.body || {};
    if (typeof expenseSplittingEnabled !== 'boolean') {
      return res.status(400).json({ message: 'expenseSplittingEnabled must be boolean' });
    }
    const { subscription, statusInfo } = await getSubscriptionWithStatus(req.user.shopId);
    if (!['pro', 'premium'].includes(subscription.plan)) {
      return res.status(403).json({ message: 'Expense splitting requires a Pro or Premium plan.' });
    }
    subscription.expenseSplittingEnabled = expenseSplittingEnabled;
    await subscription.save();
    const refreshed = await getSubscriptionWithStatus(req.user.shopId);
    return res.json(buildSubscriptionResponse(subscription, statusInfo, refreshed.features));
  } catch (error) {
    console.error('Feature toggle error:', error);
    return res.status(500).json({ message: 'Failed to update feature settings' });
  }
});

module.exports = router;
