'use client';

import { useEffect, useState } from 'react';
import { getApiToken } from '@/utils/auth';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { Plus, Save, Banknote, CreditCard, Wallet, Building, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export default function ExpenseForm() {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');

  const fetchCategories = async () => {
    try {
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newCategory, type })
      });
      if (res.ok) {
        const created = await res.json();
        setCategories((s) => [created, ...s]);
        setNewCategory('');
      }
    } catch (err) {
      console.error('Create category failed', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = await getApiToken();
      const payload = { amount: parseFloat(amount), type, mode, description: note, category };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setAmount(''); setNote(''); setCategory('');
        alert('Saved');
      } else if (res.status === 401) {
        alert('Unauthorized. Please log in again.');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save transaction');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900">Add Transaction</h3>
        
        {/* Type Toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button 
            onClick={() => setType('income')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ArrowDownCircle size={16} />
            Income
          </button>
          <button 
            onClick={() => setType('expense')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ArrowUpCircle size={16} />
            Expense
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Amount & Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input 
            label="Amount (₹)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="text-lg"
          />
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Payment Mode</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Wallet className="h-5 w-5 text-slate-400" />
              </div>
              <select 
                value={mode} 
                onChange={(e) => setMode(e.target.value)}
                className="block w-full rounded-xl border-0 bg-slate-50 pl-11 pr-10 py-3.5 text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-slate-900 focus:shadow-lg transition-all appearance-none cursor-pointer"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank">Bank Transfer</option>
                <option value="credit">Credit Card</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                 <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                 </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Category</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.filter(c => c.type === type).slice(0, 8).map(c => (
              <button 
                type="button" 
                key={c._id} 
                onClick={() => setCategory(c.name)} 
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${category === c.name 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105' 
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
               <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none appearance-none"
                >
                  <option value="">Select or type below...</option>
                  {categories.filter(c => c.type === type).map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                   <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                   </svg>
                </div>
            </div>
            {/* New Category Input */}
            <div className="flex-1 flex gap-2">
               <input 
                 value={newCategory} 
                 onChange={(e) => setNewCategory(e.target.value)} 
                 placeholder="New..." 
                 className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-slate-900 outline-none"
               />
               <button 
                type="button" 
                onClick={handleAddCategory} 
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-3 rounded-xl transition-colors"
                title="Add Category"
               >
                 <Plus size={20} />
               </button>
            </div>
          </div>
        </div>

        <Input 
          label="Note (Optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What was this for?"
        />

        <Button 
          type="submit" 
          variant={type === 'income' ? 'primary' : 'danger'} 
          className="w-full py-4 text-lg shadow-xl"
          icon={Save}
        >
          Save Transaction
        </Button>
      </form>
    </div>
  );
}
