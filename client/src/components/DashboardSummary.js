'use client';

import { useEffect, useState } from 'react';
import { getSession } from 'next-auth/react';
import { Wallet, TrendingUp, TrendingDown, Calendar, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export default function DashboardSummary() {
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    todayIncome: 0,
    todayExpense: 0,
    transactionCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const session = await getSession();
      const token = session?.apiToken;
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const transactions = await response.json();
      
      const today = new Date().toDateString();
      let income = 0, expense = 0, todayInc = 0, todayExp = 0;

      transactions.forEach(t => {
        const amt = parseFloat(t.amount) || 0;
        const isToday = new Date(t.date).toDateString() === today;

        if (t.type === 'income') {
          income += amt;
          if (isToday) todayInc += amt;
        } else {
          expense += amt;
          if (isToday) todayExp += amt;
        }
      });

      setStats({
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        todayIncome: todayInc,
        todayExpense: todayExp,
        transactionCount: transactions.length
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 animate-pulse">
        <div className="col-span-2 h-32 bg-slate-200 rounded-xl"></div>
        <div className="h-24 bg-slate-200 rounded-xl"></div>
        <div className="h-24 bg-slate-200 rounded-xl"></div>
      </div>
    );
  }

  const isPositive = stats.balance >= 0;

  return (
    <div className="grid grid-cols-2 gap-5 mb-8">
      {/* Total Balance - Full Width */}
      <div className="col-span-2 relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl shadow-slate-900/10 p-8 group">
         <div className="absolute right-0 top-0 opacity-5 transform translate-x-1/4 -translate-y-1/4">
             <Wallet size={200} />
         </div>
         <div className="relative z-10">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Net Balance</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-5xl font-black tracking-tighter">
                ₹{Math.abs(stats.balance).toLocaleString('en-IN')}
              </h2>
              <span className={`text-lg font-bold px-2 py-0.5 rounded-md ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {isPositive ? 'CR' : 'DR'}
              </span>
            </div>
            <p className="mt-2 text-slate-400 text-sm font-medium">
               Your business financial health is {isPositive ? 'good' : 'needs attention'}.
            </p>
         </div>
      </div>

      {/* Money In */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
         <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
               <ArrowDownCircle size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Received</span>
         </div>
         <p className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{stats.totalIncome.toLocaleString('en-IN')}
         </p>
      </div>

      {/* Money Out */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
         <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
               <ArrowUpCircle size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Spent</span>
         </div>
         <p className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{stats.totalExpense.toLocaleString('en-IN')}
         </p>
      </div>
      
      {/* Today's Activity */}
      <div className="col-span-2 bg-slate-50 p-6 rounded-3xl border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
             <div className="bg-slate-200 p-1.5 rounded-lg text-slate-600"><Calendar size={16} /></div>
             <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">Today's Overview</span>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">{new Date().toLocaleDateString('en-GB')}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-slate-400 mb-1">Income</p>
            <p className="text-xl font-black text-emerald-600">+₹{stats.todayIncome.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-slate-400 mb-1">Expense</p>
            <p className="text-xl font-black text-rose-600">-₹{stats.todayExpense.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
