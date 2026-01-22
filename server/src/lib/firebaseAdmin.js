const admin = require('firebase-admin');

let app;

function getServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!raw) return null;
  try {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ? Buffer.from(raw, 'base64').toString('utf8') : raw;
    return JSON.parse(json);
  } catch (err) {
    console.error('Failed to parse Firebase service account', err);
    return null;
  }
}

function initFirebaseAdmin() {
  if (app) return app;

  try {
    const serviceAccount = getServiceAccountFromEnv();
    if (serviceAccount) {
      app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      return app;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      app = admin.initializeApp();
      return app;
    }
  } catch (err) {
    console.error('Firebase admin init failed', err);
  }

  return null;
}

function getMessaging() {
  const initialized = initFirebaseAdmin();
  if (!initialized) return null;
  return admin.messaging(initialized);
}

module.exports = {
  getMessaging,
};
