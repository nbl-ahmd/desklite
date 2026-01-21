'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getApiToken } from '@/utils/auth';
import { useNotifications } from '@/contexts/NotificationsContext';
import QuickTransactionForm from '@/components/QuickTransactionForm';
import DashboardSummary from '@/components/DashboardSummary';
import RecentTransactions from '@/components/RecentTransactions';
import ReceivablesWidget from '@/components/ReceivablesWidget';
import PayablesWidget from '@/components/PayablesWidget';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function DashboardPage() {
  const router = useRouter();
  const { status } = useSession();
  const { t } = useLanguage();
  const [refreshKey, setRefreshKey] = useState(0);
  const [todayNet, setTodayNet] = useState({ income: 0, expense: 0, loading: true });
  const { alerts } = useNotifications();
  const notifiedRef = useRef(new Set());

  const todayRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return {
      from: start.toISOString(),
      to: end.toISOString(),
      label: start.toDateString()
    };
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchToday = async () => {
      try {
        const token = await getApiToken();
        const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions`);
        url.searchParams.set('from', todayRange.from);
        url.searchParams.set('to', todayRange.to);
        url.searchParams.set('limit', '200');
        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const body = await res.json();
        const tx = body?.data || [];
        let inc = 0;
        let exp = 0;
        tx.forEach(t => {
          const amt = parseFloat(t.amount) || 0;
          if (t.type === 'income') inc += amt; else exp += amt;
        });
        setTodayNet({ income: inc, expense: exp, loading: false });
      } catch (e) {
        console.error('today summary failed', e);
        setTodayNet(prev => ({ ...prev, loading: false }));
      }
    };
    if (status === 'authenticated') fetchToday();
  }, [status, refreshKey]);

  useEffect(() => {
    // Push notification (best effort) when new alerts arrive
    const notify = async () => {
      if (typeof window === 'undefined' || alerts.length === 0) return;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const reg = await navigator.serviceWorker?.ready;
      alerts.forEach((alert) => {
        if (notifiedRef.current.has(alert.id)) return;
        notifiedRef.current.add(alert.id);
        const title = alert.type === 'vendor' ? 'Vendor due soon' : 'Customer due today';
        const body = `${alert.name}: ₹${Number(alert.amount).toLocaleString('en-IN')}`;
        if (reg?.showNotification) {
          reg.showNotification(title, { body, tag: alert.id });
        } else {
          new Notification(title, { body, tag: alert.id });
        }
      });
    };
    if (status === 'authenticated') notify();
  }, [alerts, status]);

  const handleTransactionSuccess = () => {
    // Trigger refresh of summary and recent transactions
    setRefreshKey(prev => prev + 1);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 pb-20">

        {/* Alerts for due customers/vendors */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl border shadow-sm ${
                  alert.type === 'vendor'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                    : 'bg-amber-50 border-amber-100 text-amber-800'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wide">
                    {alert.type === 'vendor' ? 'Vendor payable' : 'Customer due'}
                  </span>
                  <span className="text-sm font-bold">
                    {alert.name} • ₹{Number(alert.amount).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-semibold opacity-80">{alert.message}</span>
                </div>
                <div className="text-xs font-semibold opacity-70">
                  {alert.dueDate ? new Date(alert.dueDate).toLocaleDateString('en-IN') : ''}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Add at top with modern minimal today stats */}
        <section className="space-y-4">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('today')}</p>
                 <div className="flex items-center gap-1.5">
                    <span className="text-xl font-black text-slate-900 leading-none">
                        {todayNet.loading ? '...' : `₹${Math.abs(todayNet.income - todayNet.expense).toLocaleString('en-IN')}`}
                    </span>
                    {!todayNet.loading && (
                        <div className={`w-1.5 h-1.5 rounded-full ${todayNet.income - todayNet.expense >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    )}
                 </div>
               </div>
            </div>
            
            {!todayNet.loading && (
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100/50">
                        <ArrowUp className="w-3 h-3 text-emerald-600" strokeWidth={3} />
                        <span className="text-xs font-bold text-emerald-700">{todayNet.income.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-rose-50 rounded-lg border border-rose-100/50">
                        <ArrowDown className="w-3 h-3 text-rose-600" strokeWidth={3} />
                        <span className="text-xs font-bold text-rose-700">{todayNet.expense.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            )}
          </div>

          <QuickTransactionForm onSuccess={handleTransactionSuccess} />
        </section>

        {/* Rest of insights */}
        <ReceivablesWidget key={`receivables-${refreshKey}`} />
        <PayablesWidget key={`payables-${refreshKey}`} />
        <DashboardSummary key={`summary-${refreshKey}`} />

        {/* Recent Activity */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{t('recentActivity')}</h2>
            <button
              onClick={() => router.push('/dashboard/transactions')}
              className="text-sm text-slate-500 font-bold hover:text-slate-900 transition-colors"
            >
              {t('seeAll')}
            </button>
          </div>
          <RecentTransactions key={`recent-${refreshKey}`} limit={5} />
        </section>

      </div>
    </ErrorBoundary>
  );
}
