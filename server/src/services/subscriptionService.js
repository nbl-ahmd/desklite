const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');

const GRACE_DAYS = 7;
const EXPORT_WINDOW_DAYS = 30;
const REMINDER_WINDOW_DAYS = 1;

const PLAN_CONFIG = {
  free: {
    name: 'Free',
    nameML: 'ഫ്രീ',
    price: 0,
    // Limits
    exportLimit: 5, // per month
    reminderLimit: 5, // per day
    customerLimit: 25, // max customers
    transactionHistoryDays: 30, // view last 30 days only
    // Features
    cloudSync: true,
    offlineMode: true,
    ledger: true,
    reports: true,
    basicReports: true,
    advancedReports: false,
    whatsappReminders: false,
    scheduledReminders: false,
    billPhotos: false,
    pdfExport: true,
    excelExport: false,
    prioritySync: false,
    multiDevice: false,
    paymentLinks: false,
    customerNotes: true,
    dueDate: true,
    overdueList: true,
    dailySummary: true,
    monthlySummary: false,
    customerWiseReport: false,
    backup: false,
    restore: false,
  },
  pro: {
    name: 'Pro',
    nameML: 'പ്രോ',
    price: 999,
    // Limits
    exportLimit: Infinity,
    reminderLimit: 50, // per day
    customerLimit: 500,
    transactionHistoryDays: 365,
    // Features
    cloudSync: true,
    offlineMode: true,
    ledger: true,
    reports: true,
    basicReports: true,
    advancedReports: true,
    whatsappReminders: true,
    scheduledReminders: false,
    billPhotos: true,
    pdfExport: true,
    excelExport: true,
    prioritySync: true,
    multiDevice: true,
    paymentLinks: true,
    customerNotes: true,
    dueDate: true,
    overdueList: true,
    dailySummary: true,
    monthlySummary: true,
    customerWiseReport: true,
    backup: true,
    restore: true,
  },
  premium: {
    name: 'Premium',
    nameML: 'പ്രീമിയം',
    price: 2499,
    // Limits
    exportLimit: Infinity,
    reminderLimit: Infinity,
    customerLimit: Infinity,
    transactionHistoryDays: Infinity, // unlimited history
    // Features
    cloudSync: true,
    offlineMode: true,
    ledger: true,
    reports: true,
    basicReports: true,
    advancedReports: true,
    whatsappReminders: true,
    scheduledReminders: true,
    billPhotos: true,
    pdfExport: true,
    excelExport: true,
    prioritySync: true,
    multiDevice: true,
    paymentLinks: true,
    customerNotes: true,
    dueDate: true,
    overdueList: true,
    dailySummary: true,
    monthlySummary: true,
    customerWiseReport: true,
    backup: true,
    restore: true,
  },
};

function normalizePlan(plan) {
  const id = (plan || 'free').toLowerCase();
  return PLAN_CONFIG[id] ? id : 'free';
}

function computeStatus(subscription) {
  const now = new Date();
  const expiry = subscription.expiryDate ? new Date(subscription.expiryDate) : null;
  let status = 'active';
  let graceUntil = null;

  if (expiry) {
    if (now <= expiry) {
      status = 'active';
    } else {
      const grace = new Date(expiry);
      grace.setDate(grace.getDate() + GRACE_DAYS);
      graceUntil = grace;
      status = now <= grace ? 'grace' : 'expired';
    }
  }

  // Free plan never expires unless explicitly set
  if (!expiry && subscription.plan === 'free') {
    status = 'active';
    graceUntil = null;
  }

  return { status, graceUntil };
}

function ensureExportWindow(subscription) {
  const now = new Date();
  const periodStart = subscription.exportUsage?.periodStart ? new Date(subscription.exportUsage.periodStart) : null;
  const needsReset = !periodStart || periodStart.getFullYear() !== now.getFullYear() || periodStart.getMonth() !== now.getMonth();

  if (needsReset) {
    subscription.exportUsage = {
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
      count: 0,
    };
    return true;
  }

  return false;
}

function ensureReminderWindow(subscription) {
  const now = new Date();
  const periodStart = subscription.reminderUsage?.periodStart ? new Date(subscription.reminderUsage.periodStart) : null;
  const needsReset = !periodStart || now.toDateString() !== periodStart.toDateString();

  if (needsReset) {
    subscription.reminderUsage = {
      periodStart: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      count: 0,
    };
    return true;
  }

  return false;
}

async function ensureSubscription(shopId) {
  if (!shopId) {
    throw new Error('shopId is required to load subscription');
  }

  // Cast to ObjectId to avoid string/ObjectId mismatch
  const shopObjectId = new mongoose.Types.ObjectId(shopId);

  // Upsert in a single operation to avoid race conditions and duplicate inserts
  const now = new Date();
  const subscription = await Subscription.findOneAndUpdate(
    { $or: [{ shopId: shopObjectId }, { userId: shopObjectId }] },
    {
      $setOnInsert: {
        plan: 'free',
        startDate: now,
        expiryDate: null,
        status: 'active',
        graceUntil: null,
        exportUsage: { periodStart: now, count: 0 },
        reminderUsage: { periodStart: now, count: 0 },
      },
      $set: {
        shopId: shopObjectId,
        userId: shopObjectId,
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const statusInfo = computeStatus(subscription);
  const windowReset = ensureExportWindow(subscription);
  const reminderReset = ensureReminderWindow(subscription);

  let dirty = windowReset || reminderReset;
  if (subscription.status !== statusInfo.status || subscription.graceUntil !== statusInfo.graceUntil) {
    subscription.status = statusInfo.status;
    subscription.graceUntil = statusInfo.graceUntil;
    dirty = true;
  }

  if (dirty) {
    await subscription.save();
  }

  return subscription;
}

function buildFeatureFlags(subscription) {
  const config = PLAN_CONFIG[subscription.plan] || PLAN_CONFIG.free;
  const used = subscription.exportUsage?.count || 0;
  const limit = config.exportLimit;
  const remaining = limit === Infinity ? null : Math.max(limit - used, 0);

  return {
    // Limits
    exports: {
      enabled: limit === Infinity || remaining > 0,
      limit,
      used,
      remaining,
      window: 'monthly',
    },
    reminders: {
      enabled: true,
      limit: config.reminderLimit,
      used: subscription.reminderUsage?.count || 0,
      remaining: config.reminderLimit === Infinity ? null : Math.max(config.reminderLimit - (subscription.reminderUsage?.count || 0), 0),
      window: 'daily',
    },
    customerLimit: {
      enabled: true,
      limit: config.customerLimit,
    },
    transactionHistory: {
      enabled: true,
      days: config.transactionHistoryDays,
    },
    // Core Features
    cloudSync: { enabled: config.cloudSync },
    offlineMode: { enabled: config.offlineMode },
    ledger: { enabled: config.ledger },
    reports: { enabled: config.reports },
    basicReports: { enabled: config.basicReports },
    advancedReports: { enabled: config.advancedReports },
    // Communication
    whatsappReminders: { enabled: config.whatsappReminders },
    scheduledReminders: { enabled: config.scheduledReminders },
    // Exports
    pdfExport: { enabled: config.pdfExport },
    excelExport: { enabled: config.excelExport },
    // Media
    billPhotos: { enabled: config.billPhotos },
    // Advanced
    prioritySync: { enabled: config.prioritySync },
    multiDevice: { enabled: config.multiDevice },
    paymentLinks: { enabled: config.paymentLinks },
    // Customer Features
    customerNotes: { enabled: config.customerNotes },
    dueDate: { enabled: config.dueDate },
    overdueList: { enabled: config.overdueList },
    // Reports
    dailySummary: { enabled: config.dailySummary },
    monthlySummary: { enabled: config.monthlySummary },
    customerWiseReport: { enabled: config.customerWiseReport },
    expenseSplitting: {
      enabled: ['pro', 'premium'].includes(subscription.plan) && subscription.expenseSplittingEnabled === true,
      eligible: ['pro', 'premium'].includes(subscription.plan),
    },
    // Backup
    backup: { enabled: config.backup },
    restore: { enabled: config.restore },
  };
}

async function getSubscriptionWithStatus(shopId) {
  const subscription = await ensureSubscription(shopId);
  const statusInfo = computeStatus(subscription);
  const features = buildFeatureFlags(subscription);
  return { subscription, statusInfo, features, config: PLAN_CONFIG[subscription.plan] };
}

function canWrite(statusInfo) {
  return statusInfo.status === 'active' || statusInfo.status === 'grace';
}

async function assertExportAllowed(subscription) {
  const config = PLAN_CONFIG[subscription.plan] || PLAN_CONFIG.free;
  ensureExportWindow(subscription);

  if (config.exportLimit === Infinity) {
    return { allowed: true, remaining: null, limit: Infinity };
  }

  const used = subscription.exportUsage?.count || 0;
  if (used >= config.exportLimit) {
    return { allowed: false, remaining: 0, limit: config.exportLimit };
  }

  return { allowed: true, remaining: config.exportLimit - used, limit: config.exportLimit };
}

async function assertReminderAllowed(subscription) {
  const config = PLAN_CONFIG[subscription.plan] || PLAN_CONFIG.free;
  ensureReminderWindow(subscription);

  if (config.reminderLimit === Infinity) {
    return { allowed: true, remaining: null, limit: Infinity };
  }

  const used = subscription.reminderUsage?.count || 0;
  if (used >= config.reminderLimit) {
    return { allowed: false, remaining: 0, limit: config.reminderLimit };
  }

  return { allowed: true, remaining: config.reminderLimit - used, limit: config.reminderLimit };
}

async function consumeReminder(subscription) {
  const { allowed, remaining, limit } = await assertReminderAllowed(subscription);
  if (!allowed) return { allowed, remaining, limit };

  subscription.reminderUsage.count = (subscription.reminderUsage.count || 0) + 1;
  await subscription.save();
  const nextRemaining = limit === Infinity ? null : limit - subscription.reminderUsage.count;
  return { allowed: true, remaining: nextRemaining, limit };
}

async function consumeExport(subscription) {
  const { allowed, remaining, limit } = await assertExportAllowed(subscription);
  if (!allowed) {
    return { allowed, remaining, limit };
  }

  subscription.exportUsage.count = (subscription.exportUsage.count || 0) + 1;
  await subscription.save();
  const nextRemaining = limit === Infinity ? null : limit - subscription.exportUsage.count;
  return { allowed: true, remaining: nextRemaining, limit };
}

function buildSubscriptionResponse(subscription, statusInfo, features) {
  return {
    id: subscription.id,
    shopId: subscription.shopId,
    plan: subscription.plan,
    startDate: subscription.startDate,
    expiryDate: subscription.expiryDate,
    status: statusInfo.status,
    graceUntil: statusInfo.graceUntil,
    features,
  };
}

module.exports = {
  PLAN_CONFIG,
  GRACE_DAYS,
  EXPORT_WINDOW_DAYS,
  REMINDER_WINDOW_DAYS,
  ensureSubscription,
  computeStatus,
  getSubscriptionWithStatus,
  canWrite,
  assertExportAllowed,
  consumeExport,
  assertReminderAllowed,
  consumeReminder,
  buildFeatureFlags,
  buildSubscriptionResponse,
  normalizePlan,
};
