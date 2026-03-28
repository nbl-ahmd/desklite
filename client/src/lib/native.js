import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

export function onAppStateChange(callback) {
  if (!isNativePlatform()) return { remove: () => {} };
  return App.addListener('appStateChange', callback);
}

export function onAppUrlOpen(callback) {
  if (!isNativePlatform()) return { remove: () => {} };
  return App.addListener('appUrlOpen', callback);
}

export async function getNetworkStatus() {
  if (!isNativePlatform()) {
    return { connected: navigator.onLine };
  }
  return await Network.getStatus();
}

export async function watchNetwork(callback) {
  if (!isNativePlatform()) return { remove: () => {} };
  return await Network.addListener('networkStatusChange', callback);
}
