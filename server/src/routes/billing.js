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

module.exports = router;
