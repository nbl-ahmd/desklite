const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const auth = require('../middleware/auth');

// Get user subscription
router.get('/', auth, async (req, res) => {
  try {
    let subscription = await Subscription.findOne({ userId: req.user.id });
    
    if (!subscription) {
      subscription = new Subscription({ userId: req.user.id });
      await subscription.save();
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Update subscription plan
router.patch('/plan', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!['free', 'basic', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    let subscription = await Subscription.findOne({ userId: req.user.id });
    if (!subscription) {
      subscription = new Subscription({ userId: req.user.id });
    }

    subscription.plan = plan;
    subscription.updatedAt = new Date();

    // Update features based on plan
    const planFeatures = {
      free: {
        transactions: { enabled: true, limit: 100 },
        expenseTracker: { enabled: false },
        analytics: { enabled: false },
        multiUser: { enabled: false },
        inventory: { enabled: false },
        bulkImport: { enabled: false },
        advancedReports: { enabled: false },
        apiAccess: { enabled: false }
      },
      basic: {
        transactions: { enabled: true, limit: 1000 },
        expenseTracker: { enabled: true },
        analytics: { enabled: true },
        multiUser: { enabled: false },
        inventory: { enabled: false },
        bulkImport: { enabled: false },
        advancedReports: { enabled: false },
        apiAccess: { enabled: false }
      },
      pro: {
        transactions: { enabled: true, limit: -1 },
        expenseTracker: { enabled: true },
        analytics: { enabled: true },
        multiUser: { enabled: true },
        inventory: { enabled: true },
        bulkImport: { enabled: true },
        advancedReports: { enabled: true },
        apiAccess: { enabled: false }
      },
      enterprise: {
        transactions: { enabled: true, limit: -1 },
        expenseTracker: { enabled: true },
        analytics: { enabled: true },
        multiUser: { enabled: true },
        inventory: { enabled: true },
        bulkImport: { enabled: true },
        advancedReports: { enabled: true },
        apiAccess: { enabled: true }
      }
    };

    subscription.features = planFeatures[plan];
    await subscription.save();

    res.json(subscription);
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

module.exports = router;
