import { CapacitorConfig } from '@capacitor/cli';

const useDevServer = !!process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'app.desklite.mobile',
  appName: 'Desklite',
  webDir: 'client/out',
  bundledWebRuntime: false,
  server: useDevServer
    ? {
        url: process.env.CAP_SERVER_URL,
        cleartext: true
      }
    : undefined,
  android: {
    allowMixedContent: true
  }
};

export default config;
