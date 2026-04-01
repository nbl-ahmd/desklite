'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getApiToken } from '@/utils/auth';
import { apiFetch } from '@/lib/apiFetch';

const NotificationsContext = createContext();

export function NotificationsProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState(new Set());

  // hydrate read state from localStorage
  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('desk_notifications_read') : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        setReadIds(new Set(parsed));
      }
    } catch (e) {
      console.warn('failed to load read notifications', e);
    }
  }, []);

  const persistReadIds = useCallback((ids) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('desk_notifications_read', JSON.stringify(Array.from(ids)));
      }
    } catch (e) {
      console.warn('failed to persist read notifications', e);
    }
  }, []);

  const markAsRead = useCallback((id) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistReadIds(next);
      return next;
    });
  }, [persistReadIds]);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      alerts.forEach((a) => next.add(a.id));
      persistReadIds(next);
      return next;
    });
  }, [alerts, persistReadIds]);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getApiToken();

      const [custRes, payRes, stockRes] = await Promise.all([
        apiFetch('/reminders/due-soon', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        apiFetch('/reminders/payables/due-soon', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        apiFetch('/inventory/products?lowStock=1', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const custData = custRes.ok ? await custRes.json() : { transactions: [] };
      const payData = payRes.ok ? await payRes.json() : { transactions: [] };
      const stockData = stockRes?.ok ? await stockRes.json() : { products: [] };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const twoDaysOut = new Date(today);
      twoDaysOut.setDate(twoDaysOut.getDate() + 2);

      const customerAlerts = (custData.transactions || [])
        .filter((tx) => {
          if (!tx.dueDate) return false;
          const due = new Date(tx.dueDate);
          return due.toDateString() === today.toDateString();
        })
        .map((tx) => ({
          id: `cust-${tx._id}`,
          type: 'customer',
          name: tx.customerName || 'Customer',
          amount: tx.amount,
          dueDate: tx.dueDate,
          message: 'Customer due today - send reminder'
        }));

      const payableAlerts = (payData.transactions || [])
        .filter((tx) => {
          if (!tx.dueDate) return false;
          const due = new Date(tx.dueDate);
          return due >= today && due <= twoDaysOut;
        })
        .map((tx) => ({
          id: `vendor-${tx._id}`,
          type: 'vendor',
          name: tx.customerName || 'Vendor',
          amount: tx.amount,
          dueDate: tx.dueDate,
          message: 'Vendor payment due in 2 days'
        }));

      const combined = [...customerAlerts, ...payableAlerts].sort((a, b) => {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return aDate - bDate;
      });
      const lowStockAlerts = (stockData.products || []).map((p) => ({
        id: `stock-${p._id}`,
        type: 'stock',
        name: p.name,
        amount: p.stock || 0,
        dueDate: p.lastRestockedAt || new Date().toISOString(),
        message: `Low stock (<= ${p.lowStockThreshold || 0})`
      }));

      const finalAlerts = [...combined, ...lowStockAlerts].sort((a, b) => {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return aDate - bDate;
      });

      setAlerts(finalAlerts);
    } catch (e) {
      console.error('alert load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!isMounted) return;
      await fetchAlerts();
    };
    run();

    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchAlerts]);

  const unreadCount = useMemo(() => alerts.filter((a) => !readIds.has(a.id)).length, [alerts, readIds]);

  const value = {
    alerts,
    loading,
    refresh: fetchAlerts,
    markAsRead,
    markAllRead,
    unreadCount,
    readIds
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return ctx;
}
