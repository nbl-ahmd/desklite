'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import QuickTransactionForm from '@/components/QuickTransactionForm';
import DashboardSummary from '@/components/DashboardSummary';
import RecentTransactions from '@/components/RecentTransactions';
import LenaDenaWidget from '@/components/LenaDenaWidget';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function DashboardPage() {
  const router = useRouter();
  const { status } = useSession();
  const { t } = useLanguage();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

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
        
        {/* 1. Key Metrics (Summary) */}
        <DashboardSummary key={`summary-${refreshKey}`} />

        {/* 2. Lena/Dena Widget - Credit Receivables */}
        <LenaDenaWidget key={`lena-${refreshKey}`} />

        {/* 3. Quick Action / Entry Form */}
        <section>
          <QuickTransactionForm onSuccess={handleTransactionSuccess} />
        </section>

        {/* 4. Recent Activity */}
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
