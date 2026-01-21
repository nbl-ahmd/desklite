'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ledger, transactions } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getApiToken } from '@/utils/auth';
import WhatsAppReminderModal from '@/components/WhatsAppReminderModal';
import { 
  AlertTriangle, Loader2, Users, IndianRupee, 
  MessageCircle, Phone, Clock, ChevronRight, 
  Send, Bell, Calendar, Filter, Store
} from 'lucide-react';

export default function OverduePage() {
  const { status } = useSession();
  const router = useRouter();
  const { t, language } = useLanguage();
  const { hasFeature, subscription } = useSubscription();
  
  const [rows, setRows] = useState([]);
  const [payableRows, setPayableRows] = useState([]);
  const [dueSoon, setDueSoon] = useState([]);
  const [payableDueSoon, setPayableDueSoon] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overdue'); // overdue | due-soon | payables | payables-due-soon
  const [reminderStats, setReminderStats] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(null);
  const [markingPaid, setMarkingPaid] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showReminderModal, setShowReminderModal] = useState(false);

  const fetchReminderStats = async () => {
    try {
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reminders/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setReminderStats(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch reminder stats:', err);
    }
  };

  const markAsPaid = async (row, kind) => {
    const name = row._id || row.name || row.customerName;
    if (!name) return;
    try {
      setMarkingPaid(name);
      await transactions.markPaid({ customerName: name, kind });
      await load();
    } catch (err) {
      console.error('Failed to mark paid:', err);
      setError('Failed to update status');
    } finally {
      setMarkingPaid(null);
    }
  };

  const fetchDueSoon = async () => {
    try {
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reminders/due-soon`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDueSoon(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch due soon:', err);
    }
  };

  const fetchPayables = async () => {
    try {
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/payables`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPayableRows(data.vendors || []);
      }
    } catch (err) {
      console.error('Failed to fetch payables:', err);
    }
  };

  const fetchPayablesDueSoon = async () => {
    try {
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reminders/payables/due-soon`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPayableDueSoon(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch payables due soon:', err);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ledger.outstanding();
      setRows(res.data.data || []);
      await Promise.all([
        fetchReminderStats(),
        fetchDueSoon(),
        fetchPayables(),
        fetchPayablesDueSoon()
      ]);
    } catch (err) {
      console.error(err);
      setError('Failed to load overdue list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      load();
    }
  }, [status, load]);

  const sendWhatsAppReminder = async (customer) => {
    // Open the WhatsApp reminder modal - it will handle phone validation
    setSelectedCustomer(customer);
    setShowReminderModal(true);
  };

  const handleReminderSent = () => {
    fetchReminderStats();
    load();
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const totalOverdue = rows.reduce((sum, r) => sum + (r.balance || 0), 0);
  const totalDueSoon = dueSoon.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalPayables = payableRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalPayablesDueSoon = payableDueSoon.reduce((sum, r) => sum + (r.amount || 0), 0);

  const list =
    activeTab === 'overdue'
      ? rows
      : activeTab === 'due-soon'
        ? dueSoon
        : activeTab === 'payables'
          ? payableRows
          : payableDueSoon;

  const listTitle = {
    overdue: `${t('overdue')} Customers`,
    'due-soon': 'Due Soon',
    payables: 'Vendor Payables',
    'payables-due-soon': 'Vendor Payables (Due Soon)'
  }[activeTab];

  const isPayableTab = activeTab === 'payables' || activeTab === 'payables-due-soon';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6 max-w-7xl lg:max-w-full mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('overdue')}</h1>
          <p className="text-sm font-bold text-slate-500 mt-1">{t('pendingAmount')}</p>
        </div>
        <div className="flex items-center gap-2">
          {reminderStats && (
            <div className="px-3 py-2 bg-blue-50 rounded-xl text-xs font-bold text-blue-700">
              <Bell className="w-3 h-3 inline mr-1" />
              {reminderStats.daily.remaining !== null 
                ? `${reminderStats.daily.remaining}/${reminderStats.daily.limit} ${t('sendReminder')}`
                : '∞ Reminders'
              }
            </div>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-slate-900/20 transition-all active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('overdue')}
          className={`p-5 rounded-3xl border transition-all text-left ${
            activeTab === 'overdue' 
              ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/30' 
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
            activeTab === 'overdue' ? 'bg-white/20' : 'bg-rose-50'
          }`}>
            <AlertTriangle className={`w-5 h-5 ${activeTab === 'overdue' ? 'text-white' : 'text-rose-500'}`} />
          </div>
          <p className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'overdue' ? 'text-rose-100' : 'text-slate-400'}`}>
            {t('overdue')}
          </p>
          <p className={`text-2xl font-black mt-1 ${activeTab === 'overdue' ? 'text-white' : 'text-slate-900'}`}>
            ₹{totalOverdue.toLocaleString('en-IN')}
          </p>
          <p className={`text-xs font-bold mt-1 ${activeTab === 'overdue' ? 'text-rose-100' : 'text-slate-400'}`}>
            {rows.length} {t('customers')}
          </p>
        </button>

        <button
          onClick={() => setActiveTab('due-soon')}
          className={`p-5 rounded-3xl border transition-all text-left ${
            activeTab === 'due-soon' 
              ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/30' 
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
            activeTab === 'due-soon' ? 'bg-white/20' : 'bg-amber-50'
          }`}>
            <Clock className={`w-5 h-5 ${activeTab === 'due-soon' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <p className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'due-soon' ? 'text-amber-100' : 'text-slate-400'}`}>
            Due Soon (3 days)
          </p>
          <p className={`text-2xl font-black mt-1 ${activeTab === 'due-soon' ? 'text-white' : 'text-slate-900'}`}>
            ₹{totalDueSoon.toLocaleString('en-IN')}
          </p>
          <p className={`text-xs font-bold mt-1 ${activeTab === 'due-soon' ? 'text-amber-100' : 'text-slate-400'}`}>
            {dueSoon.length} transactions
          </p>
        </button>

        <button
          onClick={() => setActiveTab('payables')}
          className={`p-5 rounded-3xl border transition-all text-left ${
            activeTab === 'payables' 
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
            activeTab === 'payables' ? 'bg-white/20' : 'bg-emerald-50'
          }`}>
            <Store className={`w-5 h-5 ${activeTab === 'payables' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <p className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'payables' ? 'text-emerald-100' : 'text-slate-400'}`}>
            Vendor Payables
          </p>
          <p className={`text-2xl font-black mt-1 ${activeTab === 'payables' ? 'text-white' : 'text-slate-900'}`}>
            ₹{totalPayables.toLocaleString('en-IN')}
          </p>
          <p className={`text-xs font-bold mt-1 ${activeTab === 'payables' ? 'text-emerald-100' : 'text-slate-400'}`}>
            {payableRows.length} vendors
          </p>
        </button>

        <button
          onClick={() => setActiveTab('payables-due-soon')}
          className={`p-5 rounded-3xl border transition-all text-left ${
            activeTab === 'payables-due-soon' 
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
            activeTab === 'payables-due-soon' ? 'bg-white/20' : 'bg-emerald-50'
          }`}>
            <Clock className={`w-5 h-5 ${activeTab === 'payables-due-soon' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <p className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'payables-due-soon' ? 'text-emerald-100' : 'text-slate-400'}`}>
            Payables: Due Soon
          </p>
          <p className={`text-2xl font-black mt-1 ${activeTab === 'payables-due-soon' ? 'text-white' : 'text-slate-900'}`}>
            ₹{totalPayablesDueSoon.toLocaleString('en-IN')}
          </p>
          <p className={`text-xs font-bold mt-1 ${activeTab === 'payables-due-soon' ? 'text-emerald-100' : 'text-slate-400'}`}>
            {payableDueSoon.length} transactions
          </p>
        </button>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">{listTitle}</h3>
          {!isPayableTab && !hasFeature('whatsappReminders') && (
            <button 
              onClick={() => router.push('/dashboard/upgrade')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <MessageCircle className="w-3 h-3" />
              Upgrade for WhatsApp
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {list.map((row, idx) => {
            const name = row._id || row.name || row.customerName || 'Unknown';
            const amount = row.balance || row.amount || 0;
            const phone = row.phone || row.customerPhone;
            const overdueDays = row.daysOverdue != null ? Math.ceil(row.daysOverdue) : null;
            const isOverdue = (row.overdue || (overdueDays !== null && overdueDays > 0)) && activeTab !== 'due-soon' && !activeTab.includes('due-soon');
            const oldestDays = row.daysSinceOldest ? Math.floor(row.daysSinceOldest) : null;
            const dueDate = row.dueDate ? new Date(row.dueDate) : null;
            const daysUntilDue = dueDate ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)) : null;
            const canSendWhatsApp = !isPayableTab && !!phone;
            
            return (
              <div key={idx} className="p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 truncate">{name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {isOverdue && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-600">
                        <AlertTriangle className="w-3 h-3" />
                        {overdueDays !== null ? `${overdueDays}d` : 'Overdue'}
                      </span>
                    )}
                    {isPayableTab && oldestDays !== null && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700">
                        <Clock className="w-3 h-3" />
                        {`${oldestDays}d since oldest`}
                      </span>
                    )}
                    {activeTab === 'payables-due-soon' && dueDate && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700">
                        <Calendar className="w-3 h-3" />
                        {daysUntilDue !== null ? `Due in ${daysUntilDue}d` : 'Due soon'}
                      </span>
                    )}
                    {!isPayableTab && row.openCredits > 0 && (
                      <span className="text-xs font-bold text-slate-400">
                        {row.openCredits} pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-emerald-600">₹{amount.toLocaleString('en-IN')}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => markAsPaid(row, isPayableTab ? 'vendor' : 'customer')}
                    disabled={markingPaid === (row._id || row.customerName || row.name)}
                    className="px-3 h-10 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    title="Mark as paid"
                  >
                    {markingPaid === (row._id || row.customerName || row.name) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Paid'
                    )}
                  </button>
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  {!isPayableTab && (
                    <button
                      onClick={() => canSendWhatsApp && sendWhatsAppReminder(row)}
                      disabled={!canSendWhatsApp || sendingReminder === (row._id || row.customerName || row.name)}
                      className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
                      title={canSendWhatsApp ? 'Send WhatsApp Reminder' : 'WhatsApp available for customers only'}
                    >
                      {sendingReminder === (row._id || row.customerName || row.name) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MessageCircle className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {!loading && list.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 text-emerald-500">
              <IndianRupee size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {activeTab === 'overdue' && 'No overdue payments!'}
              {activeTab === 'due-soon' && 'No upcoming dues!'}
              {activeTab === 'payables' && 'No vendor payables!'}
              {activeTab === 'payables-due-soon' && 'No vendor dues soon!'}
            </h3>
            <p className="text-slate-500 text-sm font-medium mt-1">
              {isPayableTab ? 'All vendor payments are clear.' : 'Everyone is paid up! 🎉'}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 text-rose-600 text-sm font-bold text-center border-t border-rose-100">
            {error}
          </div>
        )}
      </div>

      {/* WhatsApp Reminder Modal */}
      <WhatsAppReminderModal
        isOpen={showReminderModal}
        onClose={() => {
          setShowReminderModal(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        onSent={handleReminderSent}
      />
    </div>
  );
}
