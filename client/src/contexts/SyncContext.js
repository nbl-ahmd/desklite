'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getSession } from 'next-auth/react';
import {
  saveLocalTransaction,
  listPendingTransactions,
  markTransactionsSynced,
  incrementAttempts,
  pendingCount as pendingCountFn,
  purgeSynced,
} from '@/lib/indexedDb';

const SyncContext = createContext();

export function SyncProvider({ children }) {
  const [status, setStatus] = useState('synced'); // offline | syncing | synced | error
  const [pendingCount, setPendingCount] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const syncingRef = useRef(false);
  const retryTimerRef = useRef(null);

  const refreshPending = useCallback(async () => {
    const count = await pendingCountFn();
    setPendingCount(count);
    return count;
  }, []);

  // Queue a transaction locally (used by UI when offline or network fails)
  const enqueueOfflineTransaction = useCallback(async (transaction) => {
    const record = await saveLocalTransaction(transaction);
    await refreshPending();
    setStatus(isOnline ? 'syncing' : 'offline');
    return record;
  }, [isOnline, refreshPending]);

  const syncOnce = useCallback(async () => {
    if (syncingRef.current) return;
    if (!isOnline) {
      setStatus('offline');
      return;
    }

    const pending = await listPendingTransactions();
    setPendingCount(pending.length);

    if (!pending.length) {
      setStatus('synced');
      setLastError(null);
      await purgeSynced();
      return;
    }

    const session = await getSession();
    const token = session?.apiToken;
    if (!token) {
      setStatus('error');
      setLastError('No session token available for sync');
      return;
    }

    syncingRef.current = true;
    setStatus('syncing');
    setLastError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transactions: pending }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed with status ${response.status}`);
      }

      const data = await response.json();
      const syncedIds = data?.syncedIds || [];

      if (syncedIds.length) {
        await markTransactionsSynced(syncedIds);
      }

      await purgeSynced();
      const remaining = await refreshPending();
      setStatus(remaining ? 'syncing' : 'synced');
    } catch (error) {
      console.error('Background sync error:', error);
      setStatus('error');
      setLastError(error.message);
      // Track attempts for simple backoff.
      await incrementAttempts(pending.map((p) => p.clientRequestId));
    } finally {
      syncingRef.current = false;
    }
  }, [isOnline, refreshPending]);

  // Basic retry/backoff loop; avoids piling multiple timers.
  useEffect(() => {
    const schedule = () => {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        syncOnce();
      }, status === 'error' ? 15000 : 8000);
    };

    schedule();
    return () => clearTimeout(retryTimerRef.current);
  }, [status, syncOnce]);

  // React to online/offline events.
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setStatus('syncing');
      syncOnce();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOnce]);

  // Initial load: check pending and attempt a sync if online.
  useEffect(() => {
    refreshPending();
    if (isOnline) {
      syncOnce();
    }
  }, [isOnline, refreshPending, syncOnce]);

  return (
    <SyncContext.Provider
      value={{
        status,
        pendingCount,
        lastError,
        isOnline,
        enqueueOfflineTransaction,
        syncNow: syncOnce,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}
