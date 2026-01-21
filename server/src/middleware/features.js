const Subscription = require('../models/Subscription');

const checkFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const subscription = await Subscription.findOne({ userId: req.user.id });
      
      if (!subscription) {
        // Create default free subscription
        const newSub = new Subscription({ userId: req.user.id });
        await newSub.save();
        req.subscription = newSub;
      } else {
        req.subscription = subscription;
      }

      if (!req.subscription.hasFeature(featureName)) {
        return res.status(403).json({ 
          error: 'Feature not available', 
          feature: featureName,
          requiredPlan: getRequiredPlan(featureName),
          message: `This feature requires an upgrade. Please upgrade to access ${featureName}.`
        });
      }

      next();
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({ error: 'Failed to verify feature access' });
    }
  };
};

const getRequiredPlan = (featureName) => {
  const planMap = {
    transactions: 'free',
    expenseTracker: 'basic',
    analytics: 'basic',
    multiUser: 'pro',
    inventory: 'pro',
    bulkImport: 'pro',
    advancedReports: 'pro',
    apiAccess: 'enterprise'
  };
  return planMap[featureName] || 'pro';
};

module.exports = { checkFeature };
