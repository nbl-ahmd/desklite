'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getApiToken } from '@/utils/auth';
import { Search, Store, Clock, AlertTriangle, ArrowUpRight, Receipt, Phone, MessageCircle } from 'lucide-react';

export default function VendorsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [payables, setPayables] = useState({ vendors: [], total: 0, count: 0 });
  const [overdue, setOverdue] = useState([]);
  const [dueSoon, setDueSoon] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const filteredVendors = useMemo(() => {
    const q = search.toLowerCase();
    return payables.vendors.filter((v) => v.name?.toLowerCase().includes(q));
  }, [payables.vendors, search]);

  const filteredTx = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter((tx) => (tx.customerName || '').toLowerCase().includes(q));
  }, [transactions, search]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getApiToken();

      const [payRes, overdueRes, dueRes, txRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/payables`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reminders/payables/overdue`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reminders/payables/due-soon`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions?type=expense&limit=200`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!payRes.ok || !overdueRes.ok || !dueRes.ok || !txRes.ok) {
        throw new Error('Failed to load vendor data');
      }

      const [payData, overdueData, dueData, txData] = await Promise.all([
        payRes.json(),
        overdueRes.json(),
        dueRes.json(),
        txRes.json()
      ]);

      setPayables(payData || { vendors: [], total: 0, count: 0 });
      setOverdue(overdueData.transactions || []);
      setDueSoon(dueData.transactions || []);
      setTransactions(txData.data || []);
    } catch (err) {
      console.error('vendors load failed', err);
      setError('Failed to load vendors. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      load();
    }
  }, [status, router, load]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Vendors / Merchants</h1>
          <p className="text-slate-500 font-bold mt-1">Expenses and dues to pay</p>
        </div>
        <div className="hidden md:flex gap-2 text-sm font-bold text-slate-500">
          <span className="px-3 py-1 rounded-xl bg-slate-100">{payables.count} vendors</span>
          <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700">₹{payables.total.toLocaleString('en-IN')} due</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-100">
          <p className="text-xs font-bold text-emerald-600 uppercase">Total Due</p>
          <p className="text-2xl font-black text-emerald-700">₹{payables.total.toLocaleString('en-IN')}</p>
          <p className="text-xs font-semibold text-emerald-600/80">{payables.count} vendors</p>
        </div>
        <div className="p-4 rounded-3xl bg-rose-50 border border-rose-100">
          <p className="text-xs font-bold text-rose-600 uppercase">Overdue</p>
          <p className="text-2xl font-black text-rose-700">{overdue.length}</p>
          <p className="text-xs font-semibold text-rose-600/80">needs attention</p>
        </div>
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-100">
          <p className="text-xs font-bold text-amber-600 uppercase">Due Soon</p>
          <p className="text-2xl font-black text-amber-700">{dueSoon.length}</p>
          <p className="text-xs font-semibold text-amber-600/80">within 3 days</p>
        </div>
        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
          <p className="text-xs font-bold text-slate-600 uppercase">Expenses</p>
          <p className="text-2xl font-black text-slate-900">{transactions.length}</p>
          <p className="text-xs font-semibold text-slate-500">last 200 records</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search vendor by name"
          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 transition-all outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 font-semibold">{error}</div>
      )}

      {/* Vendor Payables List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Store className="w-5 h-5" /> Payables by Vendor
          </h3>
          <span className="text-xs font-bold text-slate-500">Showing {filteredVendors.length} vendors</span>
        </div>

        {filteredVendors.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center text-slate-500 font-semibold">
            No vendors found.
          </div>
        ) : (
          filteredVendors.map((v) => {
            const days = v.daysSinceOldest ? Math.floor(v.daysSinceOldest) : null;
            return (
              <div key={v.name} className="bg-white border border-slate-100 rounded-3xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 font-black flex items-center justify-center text-lg">
                    {v.name?.charAt(0)?.toUpperCase() || 'V'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{v.name}</p>
                    <p className="text-sm text-slate-500 font-semibold">₹{v.amount?.toLocaleString('en-IN')}</p>
                    {days !== null && (
                      <p className="text-xs font-semibold text-emerald-600">{days}d since oldest due</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  {v.phone && (
                    <a
                      href={`tel:${v.phone}`}
                      className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  {v.phone && (
                    <a
                      href={`https://wa.me/${v.phone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dues Section */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black text-slate-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-600" /> Overdue</h4>
            <span className="text-xs font-bold text-slate-500">{overdue.length} items</span>
          </div>
          {overdue.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">Nothing overdue 🎉</p>
          ) : (
            <div className="space-y-2">
              {overdue.map((tx) => {
                const days = tx.daysOverdue ? Math.ceil(tx.daysOverdue) : null;
                return (
                  <div key={tx._id} className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 flex justify-between items-center">
                    <div>
                      <p className="font-bold">{tx.customerName || 'Vendor'}</p>
                      <p className="text-sm font-semibold">₹{tx.amount?.toLocaleString('en-IN')}</p>
                    </div>
                    <p className="text-xs font-bold">{days !== null ? `${days}d overdue` : ''}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black text-slate-900 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-600" /> Due Soon (3d)</h4>
            <span className="text-xs font-bold text-slate-500">{dueSoon.length} items</span>
          </div>
          {dueSoon.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">No upcoming dues</p>
          ) : (
            <div className="space-y-2">
              {dueSoon.map((tx) => {
                const due = tx.dueDate ? new Date(tx.dueDate) : null;
                return (
                  <div key={tx._id} className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 flex justify-between items-center">
                    <div>
                      <p className="font-bold">{tx.customerName || 'Vendor'}</p>
                      <p className="text-sm font-semibold">₹{tx.amount?.toLocaleString('en-IN')}</p>
                    </div>
                    <p className="text-xs font-bold">{due ? due.toLocaleDateString('en-IN') : ''}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Expense Transactions */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm">
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
          <h4 className="font-black text-slate-900 flex items-center gap-2"><Receipt className="w-4 h-4" /> Expense Transactions</h4>
          <span className="text-xs font-bold text-slate-500">Latest 200</span>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredTx.length === 0 ? (
            <div className="p-6 text-center text-slate-500 font-semibold">No expense transactions.</div>
          ) : (
            filteredTx.map((tx) => {
              const due = tx.dueDate ? new Date(tx.dueDate) : null;
              return (
                <div key={tx._id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-sm shrink-0">
                      {tx.customerName?.charAt(0)?.toUpperCase() || 'V'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{tx.customerName || 'Vendor'}</p>
                      <p className="text-xs font-semibold text-slate-500 truncate">{tx.description || 'Expense'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-slate-900">₹{Number(tx.amount).toLocaleString('en-IN')}</p>
                    <p className="text-xs font-semibold text-slate-500">{due ? due.toLocaleDateString('en-IN') : 'No due date'}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
