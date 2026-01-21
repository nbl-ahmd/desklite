'use client';

import { useEffect } from 'react';
import ExpenseForm from './components/ExpenseForm';
import SummaryCards from './components/SummaryCards';

export default function ExpensesHome() {
  useEffect(() => { document.title = 'Expenses - Desklite'; }, []);

  return (
    <div className="space-y-8 pb-12">
      <div className="animate-fade-in">
        <SummaryCards />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Expense Form */}
        <div className="lg:col-span-2 animate-slide-up">
          <ExpenseForm />
        </div>

        {/* Side Widgets */}
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          
          {/* Pro Tip Card */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4 text-xl">💡</div>
              <h3 className="font-bold text-lg mb-2">Smart Categorization</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Consistent categorization unlocks powerful insights in your monthly reports. Try to group similar expenses together!
              </p>
            </div>
          </div>

          {/* Quick Stats Placeholder (Visual Only) */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
             <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>
             <h3 className="font-bold text-lg mb-4 relative z-10">Your Spending Power</h3>
             <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 relative z-10 transition-transform hover:scale-105 cursor-default">
                <span className="block text-xs uppercase tracking-wider opacity-80 mb-1">Monthly Budget</span>
                <span className="block text-2xl font-black">Unlimited</span>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
