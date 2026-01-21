'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ledger } from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { Loader2, Search, CalendarRange, Users } from 'lucide-react';

export default function LedgerPage() {
  const { data: session, status } = useSession();
  const [customer, setCustomer] = useState('');
  const [items, setItems] = useState([]);
  const [balance, setBalance] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = session?.apiToken;
  const canLoad = status === 'authenticated' && customer.trim();

  const loadLedger = async (pageToLoad = 1) => {
    if (!canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ledger.customer({ customerName: customer.trim(), page: pageToLoad, pageSize });
      setItems(res.data.data || []);
      setBalance(res.data.balance || 0);
      setTotal(res.data.total || 0);
      setPage(pageToLoad);
    } catch (err) {
      console.error(err);
      setError('Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canLoad) {
      loadLedger(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20 text-gray-600">Loading session...</div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl lg:max-w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Ledger</h1>
          <p className="text-sm font-bold text-slate-500 mt-1">Detailed transaction history</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Search Customer..."
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-medium transition-all outline-none"
            />
          </div>
          <button
            onClick={() => loadLedger(1)}
            disabled={!customer || loading}
            className="px-6 py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 flex items-center gap-2 shadow-lg shadow-slate-900/20 transition-all active:scale-95"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            View
          </button>
        </div>
      </div>

        {/* Results */}
        {customer && !loading && !items.length && !error && (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                    <Users className="text-slate-300" size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No records found</h3>
            </div>
        )}

        {customer && items.length > 0 && (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Balance</p>
                   <p className={`text-xl font-black tracking-tight ${balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                     {balance >= 0 ? '+' : ''}₹{balance.toFixed(2)}
                   </p>
                </div>
              </div>
              {error && <span className="text-sm font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-lg">{error}</span>}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 text-left font-black uppercase tracking-wider text-xs">Date</th>
                    <th className="px-6 py-4 text-left font-black uppercase tracking-wider text-xs">Type</th>
                    <th className="px-6 py-4 text-left font-black uppercase tracking-wider text-xs">Mode</th>
                    <th className="px-6 py-4 text-right font-black uppercase tracking-wider text-xs">Amount</th>
                    <th className="px-6 py-4 text-right font-black uppercase tracking-wider text-xs">Balance</th>
                    <th className="px-6 py-4 text-left font-black uppercase tracking-wider text-xs">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {items.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">
                        {row.occurredAt ? format(parseISO(row.occurredAt), 'dd MMM yyyy') : '-'}
                        <div className="text-xs text-slate-400 font-medium">
                           {row.occurredAt ? format(parseISO(row.occurredAt), 'h:mm a') : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold capitalize
                           ${['payment', 'expense'].includes(row.eventType) ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}
                         `}>
                           {row.eventType || row.type}
                         </span>
                      </td>
                      <td className="px-6 py-4 uppercase text-xs font-bold text-slate-500">{row.mode}</td>
                      <td className={`px-6 py-4 text-right font-black text-base ${['payment', 'expense'].includes(row.eventType) ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {['payment', 'expense'].includes(row.eventType) ? '-' : '+'}₹{row.amount?.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold text-slate-700`}>
                        ₹{row.runningBalance?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium text-xs max-w-xs truncate">{row.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List */}
            <div className="md:hidden divide-y divide-slate-100">
               {items.map((row) => {
                 const isExpense = ['payment', 'expense'].includes(row.eventType);
                 return (
                  <div key={row._id} className="p-5 flex flex-col gap-3">
                     <div className="flex items-start justify-between">
                        <div>
                           <p className="text-xs font-bold text-slate-400 mb-0.5">
                             {row.occurredAt ? format(parseISO(row.occurredAt), 'dd MMM, h:mm a') : '-'}
                           </p>
                           <h4 className="font-bold text-slate-900 capitalize text-sm">{row.eventType || row.type || 'Transaction'}</h4>
                        </div>
                        <div className="text-right">
                           <p className={`text-base font-black ${isExpense ? 'text-rose-500' : 'text-emerald-500'}`}>
                             {isExpense ? '-' : '+'}₹{row.amount?.toFixed(2)}
                           </p>
                           <p className="text-xs font-bold text-slate-400 mt-0.5">Bal: ₹{row.runningBalance?.toFixed(2)}</p>
                        </div>
                     </div>
                     <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500 uppercase bg-slate-100 px-2 py-1 rounded-lg">
                          {row.mode}
                        </span>
                        {row.description && (
                          <span className="text-slate-400 font-medium truncate max-w-[150px]">
                            {row.description}
                          </span>
                        )}
                     </div>
                  </div>
                 );
               })}
            </div>
            
            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs font-bold text-slate-400">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => loadLedger(Math.max(1, page - 1))}
                  disabled={page <= 1 || loading}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >Previous</button>
                <button
                  onClick={() => loadLedger(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages || loading}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >Next</button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}