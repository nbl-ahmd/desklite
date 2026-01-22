const express = require('express');
const webpush = require('web-push');
const auth = require('../middleware/auth');
const PushSubscription = require('../models/PushSubscription');
const { getMessaging } = require('../lib/firebaseAdmin');

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

const sendNativeTestNotification = async ({ tokens, shopId }) => {
  const messaging = getMessaging();
  if (!messaging || !tokens?.length) return { sent: 0, error: 'FCM not configured or no tokens' };

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: 'Desklite',
      body: 'Push notifications are working!',
    },
    data: {
      shopId: shopId || '',
      intent: 'test',
    },
  });

  const summary = {
    sent: response.successCount,
    failed: response.failureCount,
    errors: response.responses
      .map((r, idx) => (!r.success ? { token: tokens[idx], message: r.error?.message } : null))
      .filter(Boolean),
  };

  return summary;
};

router.get('/public-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) return res.status(500).json({ error: 'VAPID public key not configured' });
  return res.json({ publicKey: VAPID_PUBLIC_KEY });
});

router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription, nativeToken, platform = 'web', device } = req.body;

    if (nativeToken) {
      const upsertedNative = await PushSubscription.findOneAndUpdate(
        { nativeToken },
        {
          shopId: req.user?.shopId,
          nativeToken,
          platform: platform || 'android',
          userAgent: req.headers['user-agent'] || '',
          device: device || {}
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      return res.json({ success: true, subscription: upsertedNative, mode: 'native' });
    }

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription payload' });
    }

    const upsertedWeb = await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        shopId: req.user?.shopId,
        platform: 'web',
        endpoint: subscription.endpoint,
        keys: subscription.keys || {},
        userAgent: req.headers['user-agent'] || ''
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, subscription: upsertedWeb, mode: 'web' });
  } catch (err) {
    console.error('Push subscribe failed', err);
    return res.status(500).json({ error: 'Failed to save subscription' });
  }
});

router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint, nativeToken } = req.body;
    if (!endpoint && !nativeToken) return res.status(400).json({ error: 'Endpoint or native token required' });

    if (nativeToken) {
      await PushSubscription.deleteOne({ nativeToken, shopId: req.user?.shopId });
    }

    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint, shopId: req.user?.shopId });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Push unsubscribe failed', err);
    return res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

router.post('/test', auth, async (req, res) => {
  try {
    const nativeSubs = await PushSubscription.find({ shopId: req.user?.shopId, nativeToken: { $exists: true, $ne: null } }).limit(50);
    const webSubs = await PushSubscription.find({ shopId: req.user?.shopId, endpoint: { $exists: true, $ne: null } }).limit(5);

    const response = { success: true, web: [], native: [] };

    if (webSubs.length) {
      if (!ensureVapidConfigured()) {
        response.web = [{ status: 'skipped', message: 'VAPID keys not configured on server' }];
      } else {
        const payload = JSON.stringify({
          title: 'Desklite',
          body: 'Push notifications are working!',
          url: process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://desklite.vercel.app/dashboard'
        });

        for (const sub of webSubs) {
          try {
            await webpush.sendNotification(sub, payload);
            response.web.push({ endpoint: sub.endpoint, status: 'sent' });
          } catch (err) {
            console.error('Push send error', err?.statusCode, err?.body);
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              await PushSubscription.deleteOne({ endpoint: sub.endpoint });
            }
            response.web.push({ endpoint: sub.endpoint, status: 'failed', message: err?.message });
          }
        }
      }
    }

    if (nativeSubs.length) {
      try {
        const tokens = nativeSubs.map((sub) => sub.nativeToken).filter(Boolean);
        response.native = await sendNativeTestNotification({ tokens, shopId: req.user?.shopId });
      } catch (err) {
        console.error('Native push send error', err);
        response.native = { sent: 0, error: err?.message || 'Native push failed' };
      }
    }

    if (!webSubs.length && !nativeSubs.length) {
      return res.status(404).json({ error: 'No subscriptions found' });
    }

    return res.json(response);
  } catch (err) {
    console.error('Push test failed', err);
    return res.status(500).json({ error: 'Failed to send push' });
  }
});

module.exports = router;
