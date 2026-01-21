'use client';

import { SessionProvider } from 'next-auth/react';
import { SyncProvider } from '@/contexts/SyncContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <SubscriptionProvider>
          <SyncProvider>
            {children}
          </SyncProvider>
        </SubscriptionProvider>
      </LanguageProvider>
    </SessionProvider>
  );
} 