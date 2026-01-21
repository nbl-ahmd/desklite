const express = require('express');
const webpush = require('web-push');
const auth = require('../middleware/auth');
const PushSubscription = require('../models/PushSubscription');

const router = express.Router();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:hello@desklite.app';

const ensureVapidConfigured = () => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return false;
  }
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return true;
};

router.get('/public-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) return res.status(500).json({ error: 'VAPID public key not configured' });
  return res.json({ publicKey: VAPID_PUBLIC_KEY });
});

router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription payload' });
    }

    const upserted = await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        shopId: req.user?.shopId,
        endpoint: subscription.endpoint,
        keys: subscription.keys || {},
        userAgent: req.headers['user-agent'] || ''
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, subscription: upserted });
  } catch (err) {
    console.error('Push subscribe failed', err);
    return res.status(500).json({ error: 'Failed to save subscription' });
  }
});

router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint required' });
    await PushSubscription.deleteOne({ endpoint, shopId: req.user?.shopId });
    return res.json({ success: true });
  } catch (err) {
    console.error('Push unsubscribe failed', err);
    return res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

router.post('/test', auth, async (req, res) => {
  try {
    if (!ensureVapidConfigured()) {
      return res.status(500).json({ error: 'VAPID keys not configured on server' });
    }

    const subs = await PushSubscription.find({ shopId: req.user?.shopId }).limit(5);
    if (!subs.length) return res.status(404).json({ error: 'No subscriptions found' });

    const payload = JSON.stringify({
      title: 'Desklite',
      body: 'Push notifications are working!',
      url: process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://desklite.vercel.app/dashboard'
    });

    const results = [];
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub, payload);
        results.push({ endpoint: sub.endpoint, status: 'sent' });
      } catch (err) {
        console.error('Push send error', err?.statusCode, err?.body);
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await PushSubscription.deleteOne({ endpoint: sub.endpoint });
        }
        results.push({ endpoint: sub.endpoint, status: 'failed', message: err?.message });
      }
    }

    return res.json({ success: true, results });
  } catch (err) {
    console.error('Push test failed', err);
    return res.status(500).json({ error: 'Failed to send push' });
  }
});

module.exports = router;
