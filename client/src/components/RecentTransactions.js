'use client';

import { useEffect, useState } from 'react';
import { getSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, Banknote, Smartphone, CreditCard, Receipt } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';
import Card from './Card';

export default function RecentTransactions({ limit = 10 }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const session = await getSession();
      const token = session?.apiToken;

      const response = await apiFetch(`/transactions?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      // Handle both old array format and new paginated format
      const txns = Array.isArray(data) ? data : (data.data || []);
      const sorted = txns
        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
        .slice(0, limit);
      
      setTransactions(sorted);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
               <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
               <div className="space-y-2 flex-1">
                 <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                 <div className="h-3 bg-slate-50 rounded w-1/4"></div>
               </div>
            </div>
            <div className="h-6 bg-slate-100 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-50 rounded-3xl mb-4 text-slate-300">
          <Receipt size={32} />
        </div>
        <p className="text-slate-900 font-bold text-lg">No transactions yet</p>
        <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto font-medium">Add your first transaction above to see it appear here instantly.</p>
      </div>
    );
  }

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'cash':
        return <Banknote className="w-3 h-3" />;
      case 'upi':
        return <Smartphone className="w-3 h-3" />;
      case 'credit':
        return <CreditCard className="w-3 h-3" />;
      default:
        return <Banknote className="w-3 h-3" />;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
      <div className="divide-y divide-slate-100">
      {transactions.map((tx) => {
        const isIncome = tx.type === 'income';
        const date = new Date(tx.date || tx.createdAt);
        
        return (
          <div
            key={tx._id}
            className="p-5 hover:bg-slate-50/80 transition-all flex items-center gap-4 group cursor-default"
          >
            <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
              isIncome 
                ? 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100' 
                : 'bg-rose-50 text-rose-500 group-hover:bg-rose-100'
            }`}>
              {isIncome ? (
                <ArrowDownCircle size={24} />
              ) : (
                <ArrowUpCircle size={24} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-base font-bold text-slate-800 truncate group-hover:text-slate-900 transition-colors">
                  {tx.customerName || 'Walk-in Customer'}
                </p>
                <div className="flex items-center gap-2">
                   <p className={`text-base font-black tracking-tight ${isIncome ? 'text-emerald-500' : 'text-slate-800'}`}>
                    {isIncome ? '+' : '-'} ₹{parseFloat(tx.amount).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 truncate max-w-[140px]">
                    {tx.description || (isIncome ? 'Sale' : 'Expense')}
                  </span>
                </div>
                 <div className="flex items-center gap-2">
                    {tx.mode && (
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {getModeIcon(tx.mode)}
                        {tx.mode}
                      </span>
                    )}
                   <span className="text-[10px] font-bold text-slate-300">
                     {formatDistanceToNow(date, { addSuffix: true })}
                   </span>
                 </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
