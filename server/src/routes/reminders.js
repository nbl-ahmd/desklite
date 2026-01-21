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
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Helper to convert shopId to ObjectId
const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
};

// Helper to escape HTML/XML characters
const escapeHtml = (unsafe) => {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// PUBLIC: shareable card with OG tags for WhatsApp/preview links
router.get('/share-card', async (req, res) => {
  try {
    const { customerName = 'Customer', amount = 0, dueDate, language = 'en', shopName = 'Shop', shopPhone = '', upiId = '' } = req.query;

    if (!upiId) {
      return res.status(400).send('UPI not configured');
    }

    const reminderImage = await generateReminderImage({
      customerName,
      amount,
      dueDate,
      shopName,
      shopPhone,
      upiId,
      language
    });

    // Build absolute base URL for serving assets
    const headerHost = req.get('host');
    const headerProto = req.headers['x-forwarded-proto'] || req.protocol;
    // Prefer the incoming host (tunnel) so OG scrapers can reach the image
    const requestBase = headerHost ? `${headerProto}://${headerHost}` : '';
    const envBase = process.env.NEXT_PUBLIC_API_URL || process.env.APP_URL || process.env.NEXTAUTH_URL || '';
    const baseUrl = requestBase || envBase;

    // Generate isolated QR for the page display
    const qrCodeOnly = await generateUPIQR(upiId, amount, shopName, `Payment from ${customerName}`);

    // Format amount for UPI standard (2 decimal places)
    const upiAmount = Number(amount).toFixed(2);
    
    // Construct UPI Deep Link (Standard format)
    // Note: Some apps fail if 'am' doesn't have decimals or if 'pn' (payee name) has special chars or length > 25
    const payeeName = (shopName || 'Shop').replace(/[^a-zA-Z0-9 \-_.]/g, '').slice(0, 25);
    const paymentLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${upiAmount}&cu=INR&tn=${encodeURIComponent('Payment from ' + customerName)}`;
    const intentLink = `intent://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${upiAmount}&cu=INR&tn=${encodeURIComponent('Payment from ' + customerName)}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;

    // Define title and description for usage below
    const title = language === 'ml' ? 'പേയ്മെന്റ് റിമൈൻഡർ' : 'Payment Reminder';
    const description = `${shopName} — ₹${Number(amount).toLocaleString('en-IN')}`;

    const formattedAmt = `₹${Number(amount).toLocaleString('en-IN')}`;
    const payNowText = language === 'ml' ? 'ഇപ്പോൾ പേയ് ചെയ്യുക' : 'Pay Now';
    const scanText = language === 'ml' ? 'സ്കാൻ ചെയ്ത് പേയ് ചെയ്യുക' : 'Scan QR to pay';

    // Safe values for HTML injection
    const safeShopName = escapeHtml(shopName);
    const safeCustomerName = escapeHtml(customerName);
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeAmt = escapeHtml(formattedAmt);
    const safeUpiId = escapeHtml(upiId);

    const imageUrl = baseUrl 
      ? `${baseUrl}/api/reminders/share-card-image?customerName=${encodeURIComponent(customerName)}&amount=${encodeURIComponent(amount)}&dueDate=${encodeURIComponent(dueDate || '')}&language=${language}&shopName=${encodeURIComponent(shopName)}&shopPhone=${encodeURIComponent(shopPhone)}&upiId=${encodeURIComponent(upiId)}`
      : reminderImage;

    const html = `<!DOCTYPE html>
      <html lang="${language}">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        
        <!-- Open Graph / WhatsApp Preview -->
        <meta property="og:title" content="${safeTitle} - ${safeAmt}" />
        <meta property="og:description" content="${safeDescription}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:url" content="${baseUrl}/api/reminders/share-card?customerName=${encodeURIComponent(customerName)}&amount=${encodeURIComponent(amount)}&dueDate=${encodeURIComponent(dueDate || '')}&language=${language}&shopName=${encodeURIComponent(shopName)}&shopPhone=${encodeURIComponent(shopPhone)}&upiId=${encodeURIComponent(upiId)}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="website" />
        
        <title>${safeTitle} | ${safeShopName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --primary: #22c55e;
            --primary-dark: #16a34a;
            --bg-dark: #0f172a;
            --card-bg: #1e293b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', sans-serif;
            background: var(--bg-dark);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background-image: 
              radial-gradient(at 0% 0%, rgba(34, 197, 94, 0.15) 0px, transparent 50%),
              radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.15) 0px, transparent 50%);
          }
          
          .container {
            width: 100%;
            max-width: 400px;
            animation: slideUp 0.5s ease-out;
          }

          .card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 32px 24px;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            position: relative;
            overflow: hidden;
          }

          /* Verified Badge */
          .verified-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(34, 197, 94, 0.1);
            color: var(--primary);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 24px;
          }
          .verified-badge svg { width: 14px; height: 14px; fill: currentColor; }

          .shop-name {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: var(--text-muted);
            margin-bottom: 8px;
            font-weight: 600;
          }

          .amount-label {
            font-size: 14px;
            color: var(--text-muted);
            margin-top: 24px;
          }

          .amount {
            font-size: 48px;
            font-weight: 800;
            color: var(--text-main);
            letter-spacing: -1px;
            margin: 4px 0 32px;
            text-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }

          .qr-container {
            background: white;
            padding: 16px;
            border-radius: 20px;
            display: inline-block;
            margin-bottom: 32px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            position: relative;
          }
          
          .qr-container img {
            display: block;
            width: 180px;
            height: 180px;
          }
          
          .upi-id {
            font-family: monospace;
            background: rgba(15, 23, 42, 0.5);
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            color: var(--text-muted);
            margin-bottom: 32px;
            display: inline-block;
            border: 1px solid rgba(255,255,255,0.05);
          }

          .pay-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            font-size: 18px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
            border: 1px solid rgba(255,255,255,0.1);
            cursor: pointer;
          }

          .pay-btn:active {
            transform: scale(0.98);
          }

          .share-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            margin-top: 10px;
            padding: 12px;
            background: rgba(255,255,255,0.08);
            color: #cbd5e1;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.08);
            gap: 8px;
            cursor: pointer;
          }

          .secure-footer {
            margin-top: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: #64748b;
            font-size: 12px;
          }
          
          .secure-footer svg { width: 12px; height: 12px; fill: currentColor; }

          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          /* Bottom sheet for platform-specific actions */
          .sheet-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease;
            z-index: 90;
          }
          .sheet {
            position: fixed;
            left: 0; right: 0; bottom: 0;
            background: #0f172a;
            border-radius: 18px 18px 0 0;
            padding: 18px 16px 22px;
            box-shadow: 0 -10px 30px rgba(0,0,0,0.35);
            transform: translateY(100%);
            transition: transform 0.3s ease;
            z-index: 99;
          }
          .sheet.active { transform: translateY(0); }
          .sheet-backdrop.active { opacity: 1; pointer-events: auto; }
          .sheet-handle {
            width: 50px; height: 5px; background: #1f2937;
            border-radius: 999px; margin: 0 auto 14px;
          }
          .sheet-title { font-size: 17px; font-weight: 700; margin-bottom: 6px; color: #e2e8f0; text-align: left; }
          .sheet-desc { font-size: 13px; color: #94a3b8; margin-bottom: 14px; line-height: 1.5; text-align: left; }
          .sheet-actions { display: grid; gap: 10px; margin-bottom: 10px; }
          .sheet-btn {
            width: 100%; padding: 12px; border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.04);
            color: #e2e8f0; font-weight: 600; font-size: 14px;
            text-align: left; cursor: pointer;
            display: flex; justify-content: space-between; align-items: center;
          }
          .sheet-btn span { opacity: 0.7; font-weight: 500; }
          .sheet-primary {
            width: 100%; padding: 14px; border-radius: 12px;
            border: none; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white; font-weight: 700; font-size: 16px; cursor: pointer;
            box-shadow: 0 8px 20px rgba(34,197,94,0.3);
          }
          .sheet-close { position: absolute; top: 12px; right: 16px; color: #94a3b8; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="verified-badge">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              Verified Payment Link
            </div>

            <div class="shop-name">${safeShopName}</div>
            <div class="amount-label">Requested Amount</div>
            <div class="amount">${safeAmt}</div>

            <div class="qr-container">
              <img src="${qrCodeOnly}" alt="Scan to Pay">
            </div>

            <div class="upi-id">${safeUpiId}</div>

            <a class="pay-btn" id="pay-btn" href="${paymentLink}">
              ${payNowText}
            </a>

            
            <div class="secure-footer">
              <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
              Secured by Desklite
            </div>
          </div>
        </div>

        <div class="sheet-backdrop" id="sheet-backdrop"></div>
        <div class="sheet" id="action-sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-title" id="sheet-title">Pay with UPI</div>
          <div class="sheet-desc" id="sheet-desc"></div>
          <div class="sheet-actions">
            <button class="sheet-btn" id="copy-upi-btn">Copy UPI ID <span>${safeUpiId}</span></button>
            <button class="sheet-btn" id="copy-amount-btn">Copy Amount <span>${safeAmt}</span></button>
            <button class="sheet-btn" id="download-card-btn">Download Payment Card <span>PNG</span></button>
          </div>
          <button class="sheet-primary" id="sheet-primary-btn">Continue</button>
        </div>

        <script>
          const paymentLink = "${paymentLink}";
          const intentLink = "${intentLink}";
          const qrDataUrl = "${qrCodeOnly}"; // QR image to share
          const cardImageUrl = "${imageUrl}"; // Full card PNG for download/share
          const upiId = "${upiId}";
          const amountValue = "${upiAmount}";
          const isIOS = /iP(hone|od|ad)/i.test(navigator.userAgent || '');
          let currentSheetMode = 'android';

          async function shareQr(evt) {
            if (evt) evt.preventDefault();
            try {
              if (!navigator.share) {
                window.open(qrDataUrl, '_blank');
                return false;
              }
              // Try sharing as file first
              try {
                const res = await fetch(qrDataUrl);
                const blob = await res.blob();
                const file = new File([blob], 'upi-qr.png', { type: blob.type || 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                  await navigator.share({ files: [file], title: 'UPI QR', text: 'Scan to pay' });
                  return false;
                }
              } catch (e) {
                console.warn('File share failed, falling back to URL share', e);
              }

              // Fallback: share as URL/text (many apps will open and show the image URL)
              await navigator.share({ title: 'UPI QR', text: 'Scan to pay', url: qrDataUrl });
            } catch (e) {
              console.error('Share failed', e);
              window.open(qrDataUrl, '_blank');
            }
            return false;
          }

          async function sharePaymentCard() {
            try {
              if (!navigator.share || !navigator.canShare) return false;
              const res = await fetch(qrDataUrl, { cache: 'no-store' });
              const blob = await res.blob();
              const file = new File([blob], 'upi-qr.png', { type: blob.type || 'image/png' });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'UPI QR', text: 'Scan to pay' });
                return true;
              }
            } catch (e) {
              console.error('Share card failed', e);
            }
            return false;
          }

          async function androidPrimaryAction() {
            // Try sharing QR image first; fallback to UPI intent/deeplink
            const shared = await sharePaymentCard();
            if (shared) return;
            const isAndroid = /Android/i.test(navigator.userAgent || '');
            if (isAndroid) {
              window.location.href = intentLink;
              setTimeout(() => { window.location.href = paymentLink; }, 800);
            } else {
              window.location.href = paymentLink;
            }
          }

          function showSheet(mode) {
            currentSheetMode = mode;
            const sheet = document.getElementById('action-sheet');
            const backdrop = document.getElementById('sheet-backdrop');
            const titleEl = document.getElementById('sheet-title');
            const descEl = document.getElementById('sheet-desc');
            const primaryBtn = document.getElementById('sheet-primary-btn');

            if (mode === 'ios') {
              titleEl.textContent = 'Pay using UPI on iPhone';
              descEl.textContent = 'Copy the UPI ID or save the card, then open your UPI app and paste/scan to pay.';
              primaryBtn.textContent = 'Copy UPI ID';
            } else {
              titleEl.textContent = 'Pay using UPI apps';
              descEl.textContent = 'Copy UPI ID or amount if needed. When ready, share to your UPI app to pay.';
              primaryBtn.textContent = 'select UPI app to pay';
            }

            sheet.classList.add('active');
            backdrop.classList.add('active');
          }

          function hideSheet() {
            document.getElementById('action-sheet').classList.remove('active');
            document.getElementById('sheet-backdrop').classList.remove('active');
          }

          async function copyText(text) {
            try {
              if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
              } else {
                const tmp = document.createElement('textarea');
                tmp.value = text;
                document.body.appendChild(tmp);
                tmp.select();
                document.execCommand('copy');
                tmp.remove();
              }
              return true;
            } catch (e) {
              console.error('Copy failed', e);
              return false;
            }
          }

          async function downloadCard() {
            try {
              const res = await fetch(cardImageUrl, { cache: 'no-store' });
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'payment-card.png';
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            } catch (e) {
              console.error('Download failed', e);
            }
          }

          async function handlePrimary() {
            if (currentSheetMode === 'ios') {
              await copyText(upiId);
              hideSheet();
            } else {
              hideSheet();
              await androidPrimaryAction();
            }
          }

          async function payNow(evt) {
            if (evt) evt.preventDefault();
            if (isIOS) {
              showSheet('ios');
            } else {
              showSheet('android');
            }
            return false;
          }

          // Attach events after DOM ready
          document.addEventListener('DOMContentLoaded', () => {
            const payBtn = document.getElementById('pay-btn');
            const shareQrBtn = document.getElementById('share-qr-btn');
            const backdrop = document.getElementById('sheet-backdrop');
            const copyUpiBtn = document.getElementById('copy-upi-btn');
            const copyAmountBtn = document.getElementById('copy-amount-btn');
            const downloadCardBtn = document.getElementById('download-card-btn');
            const primaryBtn = document.getElementById('sheet-primary-btn');
            if (payBtn) payBtn.addEventListener('click', payNow);
            if (shareQrBtn) shareQrBtn.addEventListener('click', shareQr);
            if (backdrop) backdrop.addEventListener('click', hideSheet);
            if (copyUpiBtn) copyUpiBtn.addEventListener('click', () => copyText(upiId));
            if (copyAmountBtn) copyAmountBtn.addEventListener('click', () => copyText(amountValue));
            if (downloadCardBtn) downloadCardBtn.addEventListener('click', downloadCard);
            if (primaryBtn) primaryBtn.addEventListener('click', handlePrimary);
          });
        </script>
      </body>
      </html>`;

    // Allow inline script for this rendered page (needed for button handlers);
    // also allow data/blob for QR images and the generated PNG.
    // Allow data/blob in connect-src so fetch(data URL) works for sharing
    res.setHeader('Content-Security-Policy', "default-src 'self' data: blob:; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' data:; style-src 'self' 'unsafe-inline' https:; connect-src * data: blob:;");
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error rendering share card:', error);
    res.status(500).send('Failed to render share card');
  }
});

// PUBLIC: serve the share-card image as PNG (preferred by OG scrapers)
router.get('/share-card-image', async (req, res) => {
  try {
    const { customerName = 'Customer', amount = 0, dueDate, language = 'en', shopName = 'Shop', shopPhone = '', upiId = '' } = req.query;

    if (!upiId) {
      return res.status(400).send('UPI not configured');
    }

    const reminderImage = await generateReminderImage({
      customerName,
      amount,
      dueDate,
      shopName,
      shopPhone,
      upiId,
      language
    });

    const base64 = reminderImage.replace(/^data:image\/svg\+xml;base64,/, '');
    const svgBuffer = Buffer.from(base64, 'base64');
    const pngBuffer = await sharp(svgBuffer).png({ quality: 90 }).toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(pngBuffer);
  } catch (error) {
    console.error('Error rendering share card image:', error);
    res.status(500).send('Failed to render share card image');
  }
});

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

    // Format amount for UPI standard (2 decimal places)
    const upiAmount = Number(amount).toFixed(2);

    // Generate payment deep link and visuals
    const paymentLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${upiAmount}&cu=INR&tn=${encodeURIComponent(`Payment from ${customerName}`)}`;
    const qrDataUrl = await generateUPIQR(upiId, upiAmount, shopName, `Payment from ${customerName}`);
    const reminderImage = await generateReminderImage({
      customerName,
      amount,
      dueDate,
      shopName,
      shopPhone,
      upiId,
      language
    });

    // Public share URL with OG tags for WhatsApp preview
    const headerHost = req.get('host');
    const headerProto = req.headers['x-forwarded-proto'] || req.protocol;
    // Prefer API URL so the share link hits this Express route (ensures OG meta + image reachable)
    const baseUrl = process.env.NEXT_PUBLIC_API_URL
      || process.env.APP_URL
      || process.env.NEXTAUTH_URL
      || (headerHost ? `${headerProto}://${headerHost}` : '');
    const shareUrl = baseUrl
      ? `${baseUrl}/api/reminders/share-card?customerName=${encodeURIComponent(customerName)}&amount=${encodeURIComponent(amount)}&dueDate=${encodeURIComponent(dueDate || '')}&language=${language}&shopName=${encodeURIComponent(shopName)}&shopPhone=${encodeURIComponent(shopPhone)}&upiId=${encodeURIComponent(upiId)}`
      : '';

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
      image: reminderImage,
      paymentLink,
      shareUrl,
      upiId,
      shopName,
      shopPhone,
      formattedAmount,
      customerName,
      dueDate: formattedDate
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
