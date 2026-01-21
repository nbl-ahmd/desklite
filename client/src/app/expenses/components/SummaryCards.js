'use client';

import { useEffect, useState } from 'react';
import { getApiToken } from '@/utils/auth';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function SummaryCards() {
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [balance, setBalance] = useState(0);
  const [categoryData, setCategoryData] = useState({ labels: [], values: [] });

  const fetchSummary = async () => {
    try {
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      let inc = 0, exp = 0;
      const categoryMap = {};
      data.forEach(t => {
        if (t.type === 'income') inc += t.amount; else exp += t.amount;
        if (t.type === 'expense') {
          const key = t.category || 'Other';
          categoryMap[key] = (categoryMap[key] || 0) + (t.amount || 0);
        }
      });
      setIncome(inc); setExpense(exp); setBalance(inc - exp);

      const labels = Object.keys(categoryMap).slice(0, 8);
      const values = labels.map(l => categoryMap[l]);
      setCategoryData({ labels, values });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchSummary(); }, []);

  const pieData = {
    labels: categoryData.labels,
    datasets: [
      {
        data: categoryData.values,
        backgroundColor: ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#10b981','#06b6d4','#3b82f6'],
      }
    ]
  };

  const barData = {
    labels: ['Income','Expense'],
    datasets: [
      {
        label: 'Amount',
        data: [income, expense],
        backgroundColor: ['#10b981','#ef4444']
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900 rounded-2xl shadow-xl shadow-slate-900/10 text-white relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform">
             <div className="w-32 h-32 bg-white rounded-full"></div>
          </div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Net Balance</p>
          <p className="text-4xl font-black tracking-tight">₹{balance.toLocaleString('en-IN')}</p>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 relative group">
           <div className="flex items-center gap-4 mb-2">
             <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
               </svg>
             </div>
             <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Income</p>
           </div>
           <p className="text-2xl font-black text-emerald-600 tracking-tight">₹{income.toLocaleString('en-IN')}</p>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 relative group">
           <div className="flex items-center gap-4 mb-2">
             <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
               </svg>
             </div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Expense</p>
           </div>
           <p className="text-2xl font-black text-rose-600 tracking-tight">₹{expense.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-slate-900 rounded-full"></span>
            Spending by Category
          </h3>
          <div className="flex items-center justify-center p-4 min-h-[300px]">
            {categoryData.labels.length > 0 ? (
               <div className="w-64 h-64">
                 <Pie data={pieData} options={{ maintainAspectRatio: false }} />
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center text-slate-400 py-10">
                 <p className="font-bold">No expenses yet</p>
                 <p className="text-xs">Add an expense to see breakdown</p>
               </div>
            )}
          </div>
        </div>
        <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
             <span className="w-1.5 h-6 bg-slate-900 rounded-full"></span>
            Cash Flow
          </h3>
           <div className="flex items-center justify-center p-4 min-h-[300px]">
             <Bar data={barData} options={{ 
               maintainAspectRatio: false,
               plugins: { legend: { display: false } },
               scales: {
                 y: { grid: { color: '#f1f5f9' }, ticks: { font: { weight: 'bold' } } },
                 x: { grid: { display: false }, ticks: { font: { weight: 'bold' } } }
               }
             }} />
           </div>
        </div>
      </div>
    </div>
  );
}
