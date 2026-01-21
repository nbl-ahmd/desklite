'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getApiToken } from '@/utils/auth';
import QuickTransactionForm from '@/components/QuickTransactionForm';
import DashboardSummary from '@/components/DashboardSummary';
import RecentTransactions from '@/components/RecentTransactions';
import ReceivablesWidget from '@/components/ReceivablesWidget';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function DashboardPage() {
  const router = useRouter();
  const { status } = useSession();
  const { t } = useLanguage();
  const [refreshKey, setRefreshKey] = useState(0);
  const [todayNet, setTodayNet] = useState({ income: 0, expense: 0, loading: true });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchToday = async () => {
      try {
        const token = await getApiToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const tx = await res.json();
        const today = new Date().toDateString();
        let inc = 0, exp = 0;
        tx.forEach(t => {
          if (new Date(t.date).toDateString() !== today) return;
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

        {/* Quick Add at top with tiny insight */}
        <section className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('today')}
              </p>
              <p className="text-lg font-black text-slate-900">
                {todayNet.loading ? '—' : `₹${(todayNet.income - todayNet.expense).toLocaleString('en-IN')}`}
              </p>
              <p className="text-xs font-medium text-slate-500">
                {todayNet.loading ? '' : `+₹${todayNet.income.toLocaleString('en-IN')} / -₹${todayNet.expense.toLocaleString('en-IN')}`}
              </p>
            </div>
            <div className="text-sm font-bold text-emerald-600">
              {todayNet.loading ? '' : (todayNet.income - todayNet.expense >= 0 ? 'Net Inflow' : 'Net Outflow')}
            </div>
          </div>

          <QuickTransactionForm onSuccess={handleTransactionSuccess} />
        </section>

        {/* Rest of insights */}
        <ReceivablesWidget key={`receivables-${refreshKey}`} />
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
