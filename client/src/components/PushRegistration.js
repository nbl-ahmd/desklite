'use client';

import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { isNativePlatform } from '@/lib/native';
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
  const listenersRef = useRef([]);
  const vapidKeyRef = useRef(null);

  const resolvePublicKey = async () => {
    if (vapidKeyRef.current) return vapidKeyRef.current;
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      vapidKeyRef.current = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      return vapidKeyRef.current;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/push/public-key`);
      if (res.ok) {
        const data = await res.json();
        vapidKeyRef.current = data.publicKey;
        return vapidKeyRef.current;
      }
    } catch (err) {
      console.warn('Failed to fetch VAPID key', err);
    }
    return null;
  };

  useEffect(() => {
    const register = async () => {
      if (typeof window === 'undefined') return;

      if (isNativePlatform()) {
        await registerNativePush();
        return;
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported');
        return;
      }

      const publicKey = await resolvePublicKey();
      if (!publicKey) {
        setStatus('missing-key');
        console.warn('VAPID public key is not configured');
        return;
      }

      try {
        setStatus('registering');
        // Ensure service worker is registered for web push
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
        if (subscription) {
          try {
            // Ensure key is current; re-subscribe if not
            const rawKey = subscription.options?.applicationServerKey;
            const currentKey = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : null;
            if (!currentKey || currentKey !== publicKey) {
              await subscription.unsubscribe();
              subscription = null;
            }
          } catch (err) {
            console.warn('Existing subscription validation failed, resubscribing', err);
            subscription = null;
          }
        }
        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });
        }

        // Send to backend (web push)
        const token = await getApiToken();
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/push/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ subscription, platform: 'web' })
        });

        setStatus('ready');
      } catch (err) {
        console.error('Push registration failed', err);
        setStatus('error');
      }
    };

    const registerNativePush = async () => {
      try {
        setStatus('registering');
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== 'granted') {
          setStatus('denied');
          return;
        }

        await PushNotifications.register();

        const regListener = await PushNotifications.addListener('registration', async (token) => {
          try {
            const apiToken = await getApiToken();
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/push/subscribe`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiToken}`
              },
              body: JSON.stringify({
                nativeToken: token.value,
                platform: Capacitor.getPlatform(),
                device: {
                  model: navigator.userAgent,
                  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || 'mobile'
                }
              })
            });
            setStatus('ready');
          } catch (err) {
            console.error('Native push registration save failed', err);
            setStatus('error');
          }
        });

        const errorListener = await PushNotifications.addListener('registrationError', (err) => {
          console.error('Native push registration error', err);
          setStatus('error');
        });

        const actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
          // Intents / deep links can be handled here if needed
          console.info('Notification action', event);
        });

        listenersRef.current = [regListener, errorListener, actionListener];
      } catch (err) {
        console.error('Native push registration failed', err);
        setStatus('error');
      }
    };

    register();

    return () => {
      listenersRef.current.forEach((listener) => listener?.remove?.());
      listenersRef.current = [];
    };
  }, []);

  return null; // Silent component; status kept for future UI if needed
}
