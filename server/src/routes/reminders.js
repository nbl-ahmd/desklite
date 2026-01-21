const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { requireSubscription } = require('../middleware/subscription');
const { getSubscriptionWithStatus, consumeReminder } = require('../services/subscriptionService');
const { 
  generateReminderImage, 
  generateReminderMessage, 
  getAvailableTemplates,
  generateUPIQR 
} = require('../services/reminderImageService');
const mongoose = require('mongoose');

// Helper to convert shopId to ObjectId
const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
};

router.use(auth);
router.use(requireSubscription());

// GET /api/reminders/overdue - Get all overdue credit transactions
router.get('/overdue', async (req, res) => {
  try {
    const shopId = toObjectId(req.user.shopId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdue = await Transaction.find({
      shopId,
      mode: 'credit',
      isPaid: false,
      dueDate: { $lt: today }
    }).sort({ dueDate: 1 });
    
    // Calculate days overdue
    const result = overdue.map(tx => {
      const dueDate = new Date(tx.dueDate);
      const diffTime = today - dueDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...tx.toObject(),
        daysOverdue: diffDays
      };
    });
    
    res.json({
      count: result.length,
      totalAmount: result.reduce((sum, tx) => sum + tx.amount, 0),
      transactions: result
    });
  } catch (error) {
    console.error('Error fetching overdue:', error);
    res.status(500).json({ error: 'Failed to fetch overdue transactions' });
  }
});

// GET /api/reminders/due-soon - Get transactions due within next 3 days
router.get('/due-soon', async (req, res) => {
  try {
    const shopId = toObjectId(req.user.shopId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const dueSoon = await Transaction.find({
      shopId,
      mode: 'credit',
      isPaid: false,
      dueDate: { $gte: today, $lte: threeDaysFromNow }
    }).sort({ dueDate: 1 });
    
    res.json({
      count: dueSoon.length,
      totalAmount: dueSoon.reduce((sum, tx) => sum + tx.amount, 0),
      transactions: dueSoon
    });
  } catch (error) {
    console.error('Error fetching due-soon:', error);
    res.status(500).json({ error: 'Failed to fetch due soon transactions' });
  }
});

// POST /api/reminders/send - Log a reminder being sent (for tracking limits)
router.post('/send', async (req, res) => {
  try {
    const { transactionId, method = 'whatsapp' } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    
    // Check subscription limits
    const { subscription, features } = await getSubscriptionWithStatus(req.user.shopId);
    
    // Check if WhatsApp reminders are enabled for this plan
    if (method === 'whatsapp' && !features.whatsappReminders.enabled) {
      return res.status(403).json({ 
        error: 'WhatsApp reminders not available on your plan',
        upgrade: true 
      });
    }
    
    // Consume a reminder from the daily quota
    const { allowed, remaining, limit } = await consumeReminder(subscription);
    
    if (!allowed) {
      return res.status(429).json({
        error: 'Daily reminder limit reached',
        limit,
        remaining: 0
      });
    }
    
    // Update the transaction with reminder info
    const transaction = await Transaction.findOneAndUpdate(
      { _id: transactionId, shopId: req.user.shopId },
      { 
        $set: { lastReminderSent: new Date() },
        $inc: { reminderCount: 1 }
      },
      { new: true }
    );
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json({
      success: true,
      message: 'Reminder logged',
      remaining,
      limit,
      transaction
    });
  } catch (error) {
    console.error('Error logging reminder:', error);
    res.status(500).json({ error: 'Failed to log reminder' });
  }
});

// POST /api/reminders/schedule - Schedule a reminder (Pro/Premium only)
router.post('/schedule', async (req, res) => {
  try {
    const { transactionId, reminderDate } = req.body;
    
    if (!transactionId || !reminderDate) {
      return res.status(400).json({ error: 'Transaction ID and reminder date are required' });
    }
    
    // Check subscription
    const { features } = await getSubscriptionWithStatus(req.user.shopId);
    
    if (!features.scheduledReminders.enabled) {
      return res.status(403).json({ 
        error: 'Scheduled reminders not available on your plan',
        upgrade: true 
      });
    }
    
    const transaction = await Transaction.findOneAndUpdate(
      { _id: transactionId, shopId: req.user.shopId },
      { $set: { scheduledReminderDate: new Date(reminderDate) } },
      { new: true }
    );
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json({
      success: true,
      message: 'Reminder scheduled',
      scheduledDate: transaction.scheduledReminderDate,
      transaction
    });
  } catch (error) {
    console.error('Error scheduling reminder:', error);
    res.status(500).json({ error: 'Failed to schedule reminder' });
  }
});

// GET /api/reminders/scheduled - Get all scheduled reminders
router.get('/scheduled', async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const scheduled = await Transaction.find({
      shopId,
      scheduledReminderDate: { $gte: today },
      isPaid: false
    }).sort({ scheduledReminderDate: 1 });
    
    res.json({
      count: scheduled.length,
      transactions: scheduled
    });
  } catch (error) {
    console.error('Error fetching scheduled reminders:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled reminders' });
  }
});

// GET /api/reminders/stats - Get reminder usage stats
router.get('/stats', async (req, res) => {
  try {
    const { subscription, features } = await getSubscriptionWithStatus(req.user.shopId);
    
    res.json({
      daily: {
        used: features.reminders.used,
        limit: features.reminders.limit,
        remaining: features.reminders.remaining
      },
      whatsappEnabled: features.whatsappReminders.enabled,
      scheduledEnabled: features.scheduledReminders.enabled
    });
  } catch (error) {
    console.error('Error fetching reminder stats:', error);
    res.status(500).json({ error: 'Failed to fetch reminder stats' });
  }
});

// GET /api/reminders/templates - Get available reminder templates
router.get('/templates', async (req, res) => {
  try {
    const { language = 'en' } = req.query;
    const templates = getAvailableTemplates(language);
    res.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /api/reminders/generate-message - Generate reminder message with template
router.post('/generate-message', async (req, res) => {
  try {
    const { 
      templateType = 'friendly',
      language = 'en',
      customerName,
      amount,
      dueDate,
      includeQR = true
    } = req.body;

    // Get shop details
    const user = await User.findById(req.user.id);
    const shopName = user?.shopName || user?.name || 'Shop';
    const shopPhone = user?.phone || '';
    const upiId = user?.upiId || '';

    const message = generateReminderMessage({
      templateType,
      language,
      customerName,
      amount,
      dueDate,
      shopName,
      shopPhone,
      upiId,
      includeQR: includeQR && !!upiId
    });

    res.json({ 
      message,
      hasQR: includeQR && !!upiId,
      upiId: includeQR ? upiId : null
    });
  } catch (error) {
    console.error('Error generating message:', error);
    res.status(500).json({ error: 'Failed to generate message' });
  }
});

// POST /api/reminders/generate-image - Generate reminder image with QR code
router.post('/generate-image', async (req, res) => {
  try {
    const { 
      customerName,
      amount,
      dueDate,
      language = 'en'
    } = req.body;

    // Get shop details
    const user = await User.findById(req.user.id);
    const shopName = user?.shopName || user?.name || 'Shop';
    const shopPhone = user?.phone || '';
    const upiId = user?.upiId || '';

    if (!upiId) {
      return res.status(400).json({ 
        error: 'UPI ID not configured. Please set up your UPI ID in settings.',
        code: 'NO_UPI_ID'
      });
    }

    // Generate QR code as data URL
    const qrDataUrl = await generateUPIQR(upiId, amount, shopName, `Payment from ${customerName}`);

    // Format amount in Indian currency
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);

    // Format date
    const formattedDate = dueDate ? new Date(dueDate).toLocaleDateString(language === 'ml' ? 'ml-IN' : 'en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : '';

    // Get labels based on language
    const labels = language === 'ml' ? {
      title: 'പേയ്‌മെന്റ് റിമൈൻഡർ',
      to: 'പേര്',
      amount: 'തുക',
      dueDate: 'അവസാന തീയതി',
      scanToPay: 'പണം അടയ്ക്കാൻ സ്കാൻ ചെയ്യുക',
      upi: 'UPI ID',
      from: 'കട'
    } : {
      title: 'Payment Reminder',
      to: 'To',
      amount: 'Amount',
      dueDate: 'Due Date',
      scanToPay: 'Scan to Pay',
      upi: 'UPI ID',
      from: 'From'
    };

    // Generate HTML template for image
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
          .card {
            width: 400px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            padding: 30px;
            color: white;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          }
          .header {
            text-align: center;
            margin-bottom: 25px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .shop-name {
            font-size: 16px;
            opacity: 0.9;
          }
          .details {
            background: rgba(255,255,255,0.15);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .row:last-child { margin-bottom: 0; }
          .label { opacity: 0.8; font-size: 14px; }
          .value { font-weight: bold; font-size: 16px; }
          .amount-row .value {
            font-size: 28px;
            color: #FFD700;
          }
          .qr-section {
            background: white;
            border-radius: 15px;
            padding: 20px;
            text-align: center;
          }
          .qr-title {
            color: #333;
            font-size: 14px;
            margin-bottom: 15px;
            font-weight: 600;
          }
          .qr-image {
            width: 180px;
            height: 180px;
          }
          .upi-id {
            color: #666;
            font-size: 12px;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="title">${labels.title}</div>
            <div class="shop-name">${labels.from}: ${shopName}</div>
          </div>
          
          <div class="details">
            <div class="row">
              <span class="label">${labels.to}</span>
              <span class="value">${customerName}</span>
            </div>
            <div class="row amount-row">
              <span class="label">${labels.amount}</span>
              <span class="value">${formattedAmount}</span>
            </div>
            ${formattedDate ? `<div class="row">
              <span class="label">${labels.dueDate}</span>
              <span class="value">${formattedDate}</span>
            </div>` : ''}
          </div>
          
          <div class="qr-section">
            <div class="qr-title">${labels.scanToPay}</div>
            <img class="qr-image" src="${qrDataUrl}" alt="UPI QR Code" />
            <div class="upi-id">${labels.upi}: ${upiId}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    res.json({ 
      html: htmlTemplate,
      qr: qrDataUrl,
      upiId,
      shopName,
      formattedAmount
    });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Failed to generate reminder image' });
  }
});

// POST /api/reminders/generate-qr - Generate just the UPI QR code
router.post('/generate-qr', async (req, res) => {
  try {
    const { amount, note = 'Payment' } = req.body;

    // Get shop details
    const user = await User.findById(req.user.id);
    const shopName = user?.shopName || user?.name || 'Shop';
    const upiId = user?.upiId || '';

    if (!upiId) {
      return res.status(400).json({ 
        error: 'UPI ID not configured',
        code: 'NO_UPI_ID'
      });
    }

    const qrDataUrl = await generateUPIQR(upiId, amount, shopName, note);

    res.json({ 
      qr: qrDataUrl,
      upiId,
      amount
    });
  } catch (error) {
    console.error('Error generating QR:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

module.exports = router;
