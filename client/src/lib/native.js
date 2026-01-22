import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Network } from '@capacitor/network';
import { Share } from '@capacitor/share';

export const isNativePlatform = () => Capacitor.isNativePlatform();

export async function shareContent({ title, text, url }) {
  if (!isNativePlatform()) return { supported: false };
  try {
    await Share.share({ title, text, url });
    return { supported: true, shared: true };
  } catch (err) {
    if (err?.message?.includes('Share canceled')) return { supported: true, shared: false };
    throw err;
  }
}

export async function persistJson({ filename, data, directory = Directory.Documents }) {
  if (!isNativePlatform()) return { supported: false };
  await Filesystem.writeFile({ path: filename, data: JSON.stringify(data, null, 2), directory, encoding: 'utf8', recursive: true });
  return { supported: true };
}

export async function getNetworkStatus() {
  if (!isNativePlatform()) return { connected: navigator.onLine, connectionType: navigator.onLine ? 'wifi' : 'none' };
  return Network.getStatus();
}

export async function watchNetwork(callback) {
  if (!isNativePlatform()) return { remove: () => {} };
  return Network.addListener('networkStatusChange', callback);
}

export function onAppStateChange(listener) {
  if (!isNativePlatform()) return { remove: () => {} };
  return App.addListener('appStateChange', listener);
}

export function onAppUrlOpen(listener) {
  if (!isNativePlatform()) return { remove: () => {} };
  return App.addListener('appUrlOpen', listener);
}
