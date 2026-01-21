const {
  getSubscriptionWithStatus,
  canWrite,
  assertExportAllowed,
  consumeExport,
  buildFeatureFlags,
  assertReminderAllowed,
  consumeReminder,
} = require('../services/subscriptionService');

const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'];

async function loadSubscription(req) {
  if (req.subscription && req.subscriptionStatus && req.subscriptionFeatures) {
    return { subscription: req.subscription, statusInfo: req.subscriptionStatus, features: req.subscriptionFeatures };
  }

  const { subscription, statusInfo, features } = await getSubscriptionWithStatus(req.user.shopId);
  req.subscription = subscription;
  req.subscriptionStatus = statusInfo;
  req.subscriptionFeatures = features || buildFeatureFlags(subscription);
  return { subscription, statusInfo, features: req.subscriptionFeatures };
}

function requireSubscription(options = {}) {
  const { allowDuringGrace = true } = options;
  return async function subscriptionGuard(req, res, next) {
    try {
      const { statusInfo } = await loadSubscription(req);
      if (READ_METHODS.includes(req.method)) return next();
      if (canWrite(statusInfo) && (statusInfo.status !== 'grace' || allowDuringGrace)) return next();

      return res.status(402).json({
        message: 'Subscription expired. Upgrade to continue making changes.',
        status: statusInfo.status,
      });
    } catch (error) {
      console.error('Subscription middleware error:', error);
      return res.status(500).json({ message: 'Subscription check failed' });
    }
  };
}

function requireFeature(featureName, options = {}) {
  const { consume = false } = options;
  return async function featureGuard(req, res, next) {
    try {
      const { subscription, statusInfo, features } = await loadSubscription(req);

      if (!canWrite(statusInfo)) {
        return res.status(402).json({ message: 'Subscription expired. Upgrade to continue.' });
      }

      // Export quota gating
      if (featureName === 'exports') {
        const quota = consume ? await consumeExport(subscription) : await assertExportAllowed(subscription);
        if (!quota.allowed) {
          return res.status(402).json({
            message: 'Export limit reached for your plan. Upgrade to increase limits.',
            remaining: quota.remaining,
            limit: quota.limit,
          });
        }
        return next();
      }

      if (featureName === 'reminders') {
        const quota = consume ? await consumeReminder(subscription) : await assertReminderAllowed(subscription);
        if (!quota.allowed) {
          return res.status(402).json({
            message: 'Reminder limit reached for today. Upgrade to increase limits.',
            remaining: quota.remaining,
            limit: quota.limit,
          });
        }
        return next();
      }

      const flag = features?.[featureName];
      if (!flag || flag.enabled === false) {
        return res.status(402).json({ message: `Feature '${featureName}' is not available on your plan.` });
      }

      return next();
    } catch (error) {
      console.error('Feature gate error:', error);
      return res.status(500).json({ message: 'Feature check failed' });
    }
  };
}

module.exports = {
  loadSubscription,
  requireSubscription,
  requireFeature,
};
