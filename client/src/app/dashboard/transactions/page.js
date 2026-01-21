'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { getApiToken } from '@/utils/auth';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { 
  Plus, Search, Calendar, Filter, 
  ArrowUpRight, ArrowDownLeft, MoreHorizontal, 
  ArrowDownCircle, ArrowUpCircle,
  Trash2, Edit2, X, Check, Banknote, Smartphone, CreditCard
} from 'lucide-react';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Input from '@/components/Input';

export default function TransactionsPage() {
  const router = useRouter();
  const { status } = useSession();
  const { subscription } = useSubscription(); // Kept for future use
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  
  // Filter States
  const [selectedMode, setSelectedMode] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI States
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchTransactions();
    }
  }, [status, router]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, selectedMode, dateRange, searchQuery]);

  const fetchTransactions = async () => {
    try {
      const token = await getApiToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      // Handle both old array format and new paginated format
      const txns = Array.isArray(data) ? data : (data.data || []);
      setTransactions(txns);
      setFilteredTransactions(txns);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Search Filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        (t.customerName?.toLowerCase().includes(lowerQuery)) ||
        (t.description?.toLowerCase().includes(lowerQuery)) ||
        (t.amount?.toString().includes(lowerQuery))
      );
    }

    // Mode Filter
    if (selectedMode !== 'all') {
      filtered = filtered.filter(t => t.mode === selectedMode);
    }

    // Date Filter
    const now = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = startOfDay(subDays(now, 7));
        endDate = endOfDay(now);
        break;
      case 'month':
        startDate = startOfDay(subDays(now, 30));
        endDate = endOfDay(now);
        break;
    }

    if (startDate && endDate) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    setFilteredTransactions(filtered);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const token = await getApiToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete transaction');
      setTransactions(transactions.filter(t => t._id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = await getApiToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${editingTransaction._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingTransaction),
      });

      if (!response.ok) throw new Error('Failed to update transaction');

      const updatedTransaction = await response.json();
      setTransactions(transactions.map(t => 
        t._id === updatedTransaction._id ? updatedTransaction : t
      ));
      setIsEditModalOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction');
    }
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'cash': return <Banknote className="w-4 h-4" />;
      case 'upi': return <Smartphone className="w-4 h-4" />;
      case 'credit': return <CreditCard className="w-4 h-4" />;
      default: return <Banknote className="w-4 h-4" />;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-slate-500 font-bold text-sm mt-1">Manage and track your financial records</p>
        </div>
        <Button 
          onClick={() => router.push('/dashboard')}
          icon={Plus}
          className="w-full sm:w-auto shadow-lg shadow-slate-900/20 bg-slate-900 text-white rounded-2xl py-3 font-bold hover:bg-slate-800"
        >
          New Entry
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-2 rounded-3xl sticky top-0 md:static z-20 shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="flex flex-col gap-2">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Search by name, note, or amount..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-1">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none bg-slate-100 border-none text-slate-900 text-xs font-black py-3 px-5 rounded-xl focus:ring-0 cursor-pointer uppercase tracking-wider"
            >
              <option value="all">📅 All Time</option>
              <option value="today">📅 Today</option>
              <option value="week">📅 This Week</option>
              <option value="month">📅 This Month</option>
            </select>

            {['all', 'cash', 'upi', 'credit'].map((mode) => (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`flex-none px-5 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap uppercase tracking-wider ${
                  selectedMode === mode
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105'
                    : 'bg-white border border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                {mode === 'all' ? 'All' : mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 text-slate-300">
              <Search className="w-10 h-10" />
            </div>
            <h3 className="text-slate-900 font-black text-xl mb-2">No transactions found</h3>
            <p className="text-slate-500 font-medium max-w-xs mx-auto">Try adjusting your filters or search query to find what you're looking for.</p>
          </div>
        ) : (
          filteredTransactions.map((transaction) => {
            const isIncome = transaction.type === 'income';
            return (
              <div
                key={transaction._id}
                onClick={() => handleEdit(transaction)}
                className="group relative bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      isIncome 
                        ? 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100' 
                        : 'bg-rose-50 text-rose-500 group-hover:bg-rose-100'
                    }`}>
                      {isIncome ? <ArrowDownCircle size={24} /> : <ArrowUpCircle size={24} />}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-base font-bold text-slate-900 truncate">
                          {transaction.customerName || 'Walk-in Customer'}
                        </h3>
                        {transaction.mode && (
                           <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                             {transaction.mode}
                           </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-400 truncate">
                        {transaction.description || format(new Date(transaction.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-black tracking-tight ${
                      isIncome ? 'text-emerald-500' : 'text-slate-900'
                    }`}>
                      {isIncome ? '+' : '-'}₹{parseFloat(transaction.amount).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] font-bold text-slate-300 mt-0.5">
                      {format(new Date(transaction.date), 'h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)} />
          
          <Card className="w-full max-w-md relative bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden animate-slide-up sm:animate-in sm:fade-in sm:zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Transaction Details</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  icon={Banknote}
                  required
                  className="text-2xl font-bold"
                  value={editingTransaction.amount}
                  onChange={(e) => setEditingTransaction({
                    ...editingTransaction,
                    amount: parseFloat(e.target.value)
                  })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Type</label>
                  <div className="relative">
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-slate-900 appearance-none focus:ring-2 focus:ring-primary-500"
                      value={editingTransaction.mode}
                      onChange={(e) => setEditingTransaction({
                        ...editingTransaction,
                        mode: e.target.value
                      })}
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="credit">Credit</option>
                    </select>
                    <ArrowUpRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-45" />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Customer</label>
                  <Input
                     value={editingTransaction.customerName || ''}
                     onChange={(e) => setEditingTransaction({
                       ...editingTransaction,
                       customerName: e.target.value
                     })}
                     placeholder="Name"
                  />
                </div>
              </div>

              <div>
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Note</label>
                 <Input
                    value={editingTransaction.description || ''}
                    onChange={(e) => setEditingTransaction({
                      ...editingTransaction,
                      description: e.target.value
                    })}
                    placeholder="Add description..."
                 />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-50">
                <Button 
                  type="button" 
                  variant="danger" 
                  className="flex-1"
                  onClick={() => {
                    // Confirm delete
                    if(confirm('Delete this transaction?')) {
                      handleDelete(editingTransaction._id); 
                      setIsEditModalOpen(false);
                    }
                  }}
                >
                  Delete
                </Button>
                <Button type="submit" variant="primary" className="flex-[2]">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
