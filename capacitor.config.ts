import { CapacitorConfig } from '@capacitor/cli';

const useDevServer = !!process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.desklite.app',
  appName: 'Desklite',
  webDir: 'client/out',
  bundledWebRuntime: false,
  server: useDevServer
    ? {
        url: process.env.CAP_SERVER_URL,
        cleartext: true
      }
    : {
        url: 'https://desklite.vercel.app',
        cleartext: true
      },
  android: {
    allowMixedContent: true
  }
};

export default config;