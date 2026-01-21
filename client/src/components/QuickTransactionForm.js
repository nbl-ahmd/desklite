'use client';

import { useState, useEffect, useRef } from 'react';
import { getSession } from 'next-auth/react';
import { ArrowDownCircle, ArrowUpCircle, User, FileText, Smartphone, Calendar as CalendarIcon, CreditCard, Banknote } from 'lucide-react';
import { useSync } from '@/contexts/SyncContext';
import Button from './Button';
import Input from './Input';
import Card from './Card';
import Badge from './Badge';

export default function QuickTransactionForm({ onSuccess }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('income');
  const [mode, setMode] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCredit, setShowCredit] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentNames, setRecentNames] = useState([]);
  const amountRef = useRef(null);
  const { enqueueOfflineTransaction, isOnline, syncNow } = useSync();

  useEffect(() => {
    // Load recent names bucketed by type (customers for income, vendors for expense)
    const loadRecent = () => {
      const key = type === 'expense' ? 'recentVendorNames' : 'recentCustomerNames';
      const recent = JSON.parse(localStorage.getItem(key) || '[]');
      setRecentNames(recent);
    };

    loadRecent();
    // Focus amount field on mount for quick entry
    setTimeout(() => amountRef.current?.focus(), 100);
  }, [type]);

  const saveRecentName = (name) => {
    if (!name || name.trim() === '') return;
    const key = type === 'expense' ? 'recentVendorNames' : 'recentCustomerNames';
    const recent = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = [name, ...recent.filter(n => n !== name)].slice(0, 10);
    localStorage.setItem(key, JSON.stringify(updated));
    setRecentNames(updated);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setShowCredit(newMode === 'credit');
    if (newMode !== 'credit') {
      setDueDate('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    setLoading(true);
    try {
      const session = await getSession();
      const token = session?.apiToken;
      const clientRequestId = crypto.randomUUID();
      
      const transactionData = {
        amount: parseFloat(amount),
        type,
        mode: mode === 'online' ? 'upi' : mode, // Map 'online' to 'upi' for backend
        description: note.trim() || (type === 'income' ? 'Sale' : 'Expense'),
        customerName: customerName.trim(),
        customerPhone: phoneNumber.trim() || undefined,
        clientRequestId,
        createdAt: new Date().toISOString(),
      };

      // Add optional fields
      if (mode === 'credit' && dueDate) {
        transactionData.dueDate = dueDate;
      }
      
      const response = isOnline
        ? await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(transactionData),
          })
        : null;

      if (!response || !response.ok) {
        // Offline or failed: queue locally for background sync.
        await enqueueOfflineTransaction(transactionData);
      }

      // Save name to recent
      if (customerName.trim()) {
        saveRecentName(customerName.trim());
      }

      // Reset form
      setAmount('');
      setCustomerName('');
      setNote('');
      setPhoneNumber('');
      setDueDate('');
      amountRef.current?.focus();
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Transaction failed:', error);
      alert('Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-slate-100 mb-8 overflow-hidden">
      {/* 1. Type Toggle - Styled nicely */}
      <div className="flex bg-slate-50 p-1.5 m-2 mb-0 rounded-2xl">
        <button
          type="button"
          onClick={() => setType('income')}
          className={`flex-1 py-3.5 flex items-center justify-center gap-2 text-sm font-black rounded-xl transition-all ${
            type === 'income' 
              ? 'bg-white text-emerald-600 shadow-sm' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ArrowDownCircle size={18} className={type === 'income' ? 'text-emerald-500' : 'text-slate-300'} />
          <span>INCOME</span>
        </button>
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 py-3.5 flex items-center justify-center gap-2 text-sm font-black rounded-xl transition-all ${
            type === 'expense' 
              ? 'bg-white text-rose-600 shadow-sm' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ArrowUpCircle size={18} className={type === 'expense' ? 'text-rose-500' : 'text-slate-300'} />
          <span>EXPENSE</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* 2. Amount Input (Hero) - Styled to match image */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl text-slate-400 font-bold">₹</span>
            <input
              ref={amountRef}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="block w-full pl-12 pr-6 py-5 text-4xl font-black text-slate-900 placeholder-slate-200 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all outline-none"
              required
            />
          </div>
        </div>

        {/* 3. Mode Selection (Cards) */}
        <div>
           <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">
             Payment Method
           </label>
           <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'cash', label: 'Cash', icon: Banknote },
              { id: 'online', label: 'Online', icon: CreditCard },
              { id: 'credit', label: 'Credit', icon: FileText }
            ].map((m) => {
              const isActive = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleModeChange(m.id)}
                  className={`
                    flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-all
                    ${isActive 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20' 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50'}
                  `}
                >
                  <m.icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span className="text-xs font-bold">{m.label}</span>
                </button>
              );
            })}
           </div>
        </div>

        {/* 4. Details Section */}
        <div className="space-y-4">
          <Input 
            icon={User}
            placeholder={type === 'expense' ? 'Vendor / Merchant Name' : 'Customer Name'}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            list="recent-names"
            className="bg-slate-50 border-0 py-4 font-bold text-slate-900 placeholder:font-medium"
          />
          <datalist id="recent-names">
            {recentNames.map((name, i) => (
              <option key={`${type}-${i}`} value={name} />
            ))}
          </datalist>

          {/* Quick Name Chips */}
          {recentNames.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {recentNames.slice(0, 3).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCustomerName(name)}
                  className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          <Input 
            icon={FileText}
            placeholder={type === 'income' ? "Sale Description (Optional)" : "Expense Description"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
             className="bg-slate-50 border-0 py-4 font-bold text-slate-900 placeholder:font-medium"
          />

          {/* Conditional Fields */}
          {(showCredit || customerName) && (
             <div className="grid grid-cols-2 gap-4 animate-slide-up bg-slate-50 p-4 rounded-2xl">
               <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Additional Details</p>
               </div>
               <div className="col-span-2 sm:col-span-1">
                 <Input 
                   icon={Smartphone}
                   type="tel"
                   placeholder="Phone Number"
                   value={phoneNumber}
                   onChange={(e) => setPhoneNumber(e.target.value)}
                   className="bg-white"
                 />
               </div>
               {showCredit && (
                 <div className="col-span-2 sm:col-span-1">
                   <Input 
                     icon={CalendarIcon}
                     type="date"
                     label="Due Date"
                     value={dueDate}
                     onChange={(e) => setDueDate(e.target.value)}
                     required={mode === 'credit'}
                     className="bg-white"
                   />
                 </div>
               )}
             </div>
          )}
        </div>

        {/* 5. Submit Action */}
        <Button 
          type="submit" 
          variant={type === 'income' ? 'primary' : 'danger'} 
          isLoading={loading}
          className="w-full py-4 text-base shadow-xl rounded-2xl"
          icon={type === 'income' ? ArrowDownCircle : ArrowUpCircle}
        >
          {loading ? 'Saving Transaction...' : `Confirm ${type === 'income' ? 'Income' : 'Expense'}`}
        </Button>

      </form>
    </div>
  );
}
