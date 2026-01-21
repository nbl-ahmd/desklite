'use client';

import { useEffect, useState } from 'react';
import { getApiToken } from '@/utils/auth';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushRegistration() {
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    const register = async () => {
      if (typeof window === 'undefined') return;
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported');
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setStatus('missing-key');
        console.warn('VAPID public key is not configured');
        return;
      }

      try {
        setStatus('registering');
        // Ensure service worker is registered
        await navigator.serviceWorker.register('/sw.js');
        const reg = await navigator.serviceWorker.ready;

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setStatus('denied');
          return;
        }

        // Subscribe
        let subscription = await reg.pushManager.getSubscription();
        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });
        }

        // Send to backend
        const token = await getApiToken();
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/push/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ subscription })
        });

        setStatus('ready');
      } catch (err) {
        console.error('Push registration failed', err);
        setStatus('error');
      }
    };

    register();
  }, []);

  return null; // Silent component; status kept for future UI if needed
}
