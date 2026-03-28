# WhatsApp Share Plugin Usage

## Android
- Shares image and text directly to a WhatsApp chat using jid (bypasses sharesheet).
- Usage:

```js
import { shareToWhatsApp } from '@/lib/whatsappShare';

await shareToWhatsApp({
  phone: '91xxxxxxxxxx', // digits only
  text: 'Your message here',
  filePath: 'file:///path/to/image.png', // must be a valid file URI
});
```

## iOS
- Shares text and link using the default share sheet (no image or jid support).
- Usage:

```js
import { shareToWhatsApp } from '@/lib/whatsappShare';

await shareToWhatsApp({
  phone: '91xxxxxxxxxx', // not used on iOS
  text: 'Your message here',
  url: 'https://your-link.com',
});
```

## Notes
- The plugin is located at `android/capacitor-whatsapp-share`.
- For Android, ensure FileProvider is configured in your `AndroidManifest.xml` for file sharing.
- For iOS, only text and link are supported due to platform limitations.
- See `client/src/lib/whatsappShare.js` for the wrapper logic.

## Installation
1. Copy the plugin folder into your project if not already present.
2. Add the plugin to your `capacitor.config.json` or `capacitor.config.ts`:
   ```json
   "plugins": {
     "WhatsAppShare": {}
   }
   ```
3. Run `npx cap sync` after adding the plugin.

## License
MIT
