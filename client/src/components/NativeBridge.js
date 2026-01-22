"use client";

import { useEffect } from 'react';
import { isNativePlatform, onAppStateChange, onAppUrlOpen } from '@/lib/native';

export default function NativeBridge() {
  useEffect(() => {
    if (!isNativePlatform()) return undefined;

    const removeState = onAppStateChange(({ isActive }) => {
      // Bubble a custom event so screens can react (e.g., refresh data on resume)
      document.dispatchEvent(new CustomEvent('desklite:app-state', { detail: { isActive } }));
    });

    const removeUrl = onAppUrlOpen(({ url }) => {
      // Surface intents / deep links to the web layer
      document.dispatchEvent(new CustomEvent('desklite:app-url', { detail: { url } }));
    });

    return () => {
      removeState?.remove?.();
      removeUrl?.remove?.();
    };
  }, []);

  return null;
}
