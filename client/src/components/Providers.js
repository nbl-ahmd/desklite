'use client';

import { SessionProvider } from 'next-auth/react';
import { SyncProvider } from '@/contexts/SyncContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import NativeBridge from './NativeBridge';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <SubscriptionProvider>
          <SyncProvider>
            <NotificationsProvider>
              <NativeBridge />
              {children}
            </NotificationsProvider>
          </SyncProvider>
        </SubscriptionProvider>
      </LanguageProvider>
    </SessionProvider>
  );
} 