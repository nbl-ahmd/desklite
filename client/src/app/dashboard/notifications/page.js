'use client';

import { useMemo } from 'react';
import { Check, RefreshCcw, Bell, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NotificationsPage() {
  const { alerts, loading, markAsRead, markAllRead, refresh, readIds } = useNotifications();
  const { t } = useLanguage();

  const sorted = useMemo(() => {
    return [...alerts].sort((a, b) => {
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return bDate - aDate;
    });
  }, [alerts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('notificationsTitle')}</p>
          <h1 className="text-2xl font-black text-slate-900">{sorted.length} {t('recent')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            {t('home')}
          </Link>
          <button
            onClick={refresh}
            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={markAllRead}
            className="px-3 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 flex items-center gap-2"
          >
            <Check size={16} />
            {t('markAllRead')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {sorted.length === 0 && (
          <div className="px-6 py-12 text-center text-slate-500 text-sm">{t('notificationsEmpty')}</div>
        )}
        {sorted.map((alert) => {
          const isUnread = alert?.id ? !readIds.has(alert.id) : false;
          const accent = alert.type === 'vendor'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700';
          return (
            <div key={alert.id} className="px-6 py-4 flex items-start gap-4">
              <div className={`p-2 rounded-xl ${accent}`}>
                {alert.type === 'vendor' ? <Bell size={16} /> : <Clock size={16} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{alert.name}</p>
                  {isUnread && <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">New</span>}
                </div>
                <p className="text-sm text-slate-600">₹{Number(alert.amount).toLocaleString('en-IN')} • {alert.message}</p>
                <p className="text-xs text-slate-400 mt-1">{alert.dueDate ? new Date(alert.dueDate).toLocaleDateString('en-IN') : ''}</p>
              </div>
              <button
                onClick={() => markAsRead(alert.id)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Mark read
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
