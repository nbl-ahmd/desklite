# Capacitor Android Guide

Mobile build pipeline:
- Install deps: `npm install` (workspace) then `npm --prefix client install` and `npm --prefix server install` if needed.
- Build web bundle for the container: `npm run build:mobile` (sets `NEXT_OUTPUT=export` and writes to `client/out`).
- Sync Capacitor assets: `npm run cap:sync` (creates/updates `android/`).
- Open Android Studio: `npm run cap:open` then build/run from there.

Development with live reload:
- Run `npm run dev:client` to serve web UI at `http://localhost:3000`.
- Set `CAP_SERVER_URL=http://<your-ip>:3000` before running `npm run cap:sync` so the native shell uses the dev server.

Using a deployed host (Vercel):
- You can point the native shell at your deployed app (e.g., `https://desklite.vercel.app`).
- Example: `CAP_SERVER_URL=https://desklite.vercel.app npx cap sync android` then build/run from Android Studio.
- This avoids export blockers (NextAuth, dynamic routes) because the shell loads the live site instead of bundled static HTML.
- Keep the URL HTTPS in production. Use HTTP only for LAN dev during testing.

Push notifications (native FCM):
- Provide Firebase Admin credentials to the server via `FIREBASE_SERVICE_ACCOUNT_JSON` (or base64 in `FIREBASE_SERVICE_ACCOUNT_BASE64`) or `GOOGLE_APPLICATION_CREDENTIALS`.
- Add the Firebase Android config file (`android/app/google-services.json`) for the app package `app.desklite.mobile`.
- On device, the app requests permissions and registers the FCM token via `/api/push/subscribe` with `nativeToken`.
- `POST /api/push/test` now attempts web push (VAPID) and native FCM; native sending is skipped if Firebase Admin credentials are missing.

Other native integrations:
- Network status now uses Capacitor `@capacitor/network` when available (improved offline banner accuracy on device).
- `NativeBridge` publishes app state (`desklite:app-state`) and intent/deep-link events (`desklite:app-url`) on `document` for the React layer to consume.
- Helpers in `src/lib/native.js` wrap Share, Filesystem, App state, and Network APIs. Use them when adding native-only flows (e.g., saving PDFs to device storage or invoking the share sheet).

Release checklist:
- Bump versionCode/versionName in `android/app/build.gradle` after running `npx cap add android`.
- Validate push on device with `curl -X POST https://<server>/api/push/test` (requires credentials + at least one registered device).
- Verify offline caching still works via `next-pwa` service worker in web builds; native offline uses bundled `client/out` assets.
