'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { getApiToken } from '@/utils/auth';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import WhatsAppReminderModal from '@/components/WhatsAppReminderModal';
import { 
  ArrowLeft, Phone, MessageCircle, Download, Filter, 
  X, Calendar, TrendingUp, TrendingDown, DollarSign,
  CreditCard, Banknote, Clock, CheckCircle, AlertCircle,
  FileText, Plus, Search, ChevronDown, ChevronUp
} from 'lucide-react';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { status } = useSession();
  const customerName = decodeURIComponent(params.name);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    mode: '',
    status: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  
  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  
  // WhatsApp reminder
  const [showReminderModal, setShowReminderModal] = useState(false);
  
  // Expanded transaction details
  const [expandedTxn, setExpandedTxn] = useState(null);

  const fetchCustomerData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getApiToken();
      
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customer-details/${encodeURIComponent(customerName)}?${queryParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Failed to fetch customer data');
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching customer details:', err);
      setError('Failed to load customer details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [customerName, filters]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchCustomerData();
    }
  }, [status, router, fetchCustomerData]);

  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const token = await getApiToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customer-details/${encodeURIComponent(customerName)}/record-payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: parseFloat(paymentAmount),
            mode: paymentMode,
            description: paymentNote,
            transactionIds: selectedTransactions
          })
        }
      );

      if (!response.ok) throw new Error('Failed to record payment');
      
      // Reset form
      setPaymentAmount('');
      setPaymentMode('cash');
      setPaymentNote('');
      setSelectedTransactions([]);
      setShowPaymentModal(false);
      
      // Refresh data
      fetchCustomerData();
      
      alert('Payment recorded successfully!');
    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Failed to record payment. Please try again.');
    }
  };

  const handleMarkPaid = async (transactionId) => {
    try {
      const token = await getApiToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customer-details/${encodeURIComponent(customerName)}/mark-paid`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ transactionId })
        }
      );

      if (!response.ok) throw new Error('Failed to mark as paid');
      
      fetchCustomerData();
    } catch (err) {
      console.error('Error marking transaction as paid:', err);
      alert('Failed to update transaction. Please try again.');
    }
  };

  const handleExportStatement = async () => {
    try {
      const token = await getApiToken();
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customer-details/${encodeURIComponent(customerName)}/statement?${queryParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Failed to generate statement');
      
      const statement = await response.json();
      
      // Convert to CSV
      const csv = [
        ['Date', 'Description', 'Type', 'Mode', 'Debit', 'Credit', 'Balance', 'Status'],
        ...statement.transactions.map(t => [
          format(parseISO(t.date), 'dd/MM/yyyy'),
          t.description,
          t.type,
          t.mode,
          t.debit || 0,
          t.credit || 0,
          t.balance,
          t.isPaid ? 'Paid' : 'Unpaid'
        ])
      ].map(row => row.join(',')).join('\n');
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${customerName}_statement_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting statement:', err);
      alert('Failed to export statement. Please try again.');
    }
  };

  const applyQuickFilter = (preset) => {
    const today = new Date();
    let start, end;

    switch (preset) {
      case 'thisMonth':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'lastMonth':
        start = startOfMonth(subMonths(today, 1));
        end = endOfMonth(subMonths(today, 1));
        break;
      case 'last3Months':
        start = subMonths(today, 3);
        end = today;
        break;
      case 'unpaid':
        setFilters(prev => ({ ...prev, status: 'unpaid', startDate: '', endDate: '' }));
        return;
      case 'all':
        setFilters({
          startDate: '',
          endDate: '',
          type: '',
          mode: '',
          status: '',
          sortBy: 'date',
          sortOrder: 'desc'
        });
        return;
      default:
        return;
    }

    setFilters(prev => ({
      ...prev,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    }));
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 font-medium">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { customer, summary, transactions, pagination, monthlyBreakdown, outstandingCredits } = data;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900">{customer.name}</h1>
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mt-1">
              <Phone className="w-4 h-4" />
              <span>{customer.phone}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowReminderModal(true)}
          className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 opacity-80" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Total Income</span>
          </div>
          <p className="text-3xl font-black">₹{summary.totalIncome.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-3xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 opacity-80" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Total Expense</span>
          </div>
          <p className="text-3xl font-black">₹{summary.totalExpense.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 opacity-80" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Net Balance</span>
          </div>
          <p className="text-3xl font-black">₹{summary.balance.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 opacity-80" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Outstanding</span>
          </div>
          <p className="text-3xl font-black">₹{summary.unpaidAmount.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Payment Modes Breakdown */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Payment Modes</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold mb-1">
              <Banknote className="w-4 h-4" />
              Cash
            </div>
            <p className="text-lg font-black text-slate-900">₹{summary.totalCash.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold mb-1">
              <CreditCard className="w-4 h-4" />
              UPI
            </div>
            <p className="text-lg font-black text-slate-900">₹{summary.totalUPI.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold mb-1">
              <Clock className="w-4 h-4" />
              Credit
            </div>
            <p className="text-lg font-black text-slate-900">₹{summary.totalCredit.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Quick Filters & Actions */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => applyQuickFilter('all')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold whitespace-nowrap transition-colors"
        >
          All Time
        </button>
        <button
          onClick={() => applyQuickFilter('thisMonth')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold whitespace-nowrap transition-colors"
        >
          This Month
        </button>
        <button
          onClick={() => applyQuickFilter('lastMonth')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold whitespace-nowrap transition-colors"
        >
          Last Month
        </button>
        <button
          onClick={() => applyQuickFilter('unpaid')}
          className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-xl text-sm font-bold whitespace-nowrap transition-colors"
        >
          Unpaid Only
        </button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          More Filters
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Filters</h3>
            <button onClick={() => setShowFilters(false)}>
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium"
              >
                <option value="">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">Mode</label>
              <select
                value={filters.mode}
                onChange={(e) => setFilters(prev => ({ ...prev, mode: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium"
              >
                <option value="">All</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="credit">Credit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium"
            >
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          <button
            onClick={fetchCustomerData}
            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowPaymentModal(true)}
          className="flex-1 py-3 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
        >
          <Plus className="w-5 h-5" />
          Record Payment
        </button>
        <button
          onClick={handleExportStatement}
          className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-2xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
        >
          <Download className="w-5 h-5" />
          Export
        </button>
      </div>

      {/* Outstanding Credits */}
      {outstandingCredits.length > 0 && (
        <div className="bg-amber-50 rounded-3xl p-5 border border-amber-100">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider">Outstanding Credits</h3>
          </div>
          <div className="space-y-2">
            {outstandingCredits.map((txn) => (
              <div key={txn._id} className="bg-white rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">₹{txn.amount.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    {format(parseISO(txn.date), 'dd MMM yyyy')}
                    {txn.dueDate && ` • Due: ${format(parseISO(txn.dueDate), 'dd MMM')}`}
                  </p>
                </div>
                <button
                  onClick={() => handleMarkPaid(txn._id)}
                  className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors"
                >
                  Mark Paid
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Transactions ({summary.totalTransactions})
          </h3>
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No transactions found</h3>
            <p className="text-slate-500 font-medium text-sm">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <>
            {transactions.map((txn) => {
              const isExpanded = expandedTxn === txn._id;
              const isIncome = txn.type === 'income';
              const isPaidStatus = txn.isPaid;

              return (
                <div
                  key={txn._id}
                  className="bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-lg transition-all"
                >
                  <button
                    onClick={() => setExpandedTxn(isExpanded ? null : txn._id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${isIncome ? 'bg-green-500' : 'bg-rose-500'}`}></span>
                          <p className="text-sm font-bold text-slate-900">
                            {format(parseISO(txn.date), 'dd MMM yyyy, hh:mm a')}
                          </p>
                        </div>
                        
                        {txn.description && (
                          <p className="text-xs text-slate-500 font-medium mb-2">{txn.description}</p>
                        )}
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                            isIncome ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {isIncome ? 'Income' : 'Expense'}
                          </span>
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                            txn.mode === 'cash' ? 'bg-blue-50 text-blue-700' :
                            txn.mode === 'upi' ? 'bg-purple-50 text-purple-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {txn.mode.toUpperCase()}
                          </span>
                          {txn.mode === 'credit' && (
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                              isPaidStatus ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {isPaidStatus ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {isPaidStatus ? 'Paid' : 'Unpaid'}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right flex flex-col items-end gap-2">
                        <p className={`text-xl font-black ${isIncome ? 'text-green-600' : 'text-rose-600'}`}>
                          {isIncome ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                        </p>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
                      {txn.eventType && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 font-medium">Event Type:</span>
                          <span className="font-bold text-slate-900 capitalize">{txn.eventType}</span>
                        </div>
                      )}
                      {txn.dueDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 font-medium">Due Date:</span>
                          <span className="font-bold text-slate-900">{format(parseISO(txn.dueDate), 'dd MMM yyyy')}</span>
                        </div>
                      )}
                      {txn.mode === 'credit' && !isPaidStatus && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkPaid(txn._id);
                          }}
                          className="w-full py-2 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors text-sm"
                        >
                          Mark as Paid
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  disabled={pagination.currentPage === 1}
                  onClick={() => setFilters(prev => ({ ...prev, page: pagination.currentPage - 1 }))}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm font-medium text-slate-600">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.currentPage === pagination.totalPages}
                  onClick={() => setFilters(prev => ({ ...prev, page: pagination.currentPage + 1 }))}
                  className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">Record Payment</h2>
                <button onClick={() => setShowPaymentModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Amount Received</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-slate-900 font-bold"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Note (Optional)</label>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-slate-900 font-medium h-24 resize-none"
                />
              </div>

              <button
                onClick={handleRecordPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                className="w-full py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Reminder Modal */}
      <WhatsAppReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        customer={{
          _id: customer.name,
          customerName: customer.name,
          balance: summary.unpaidAmount,
          phone: customer.phone
        }}
      />
    </div>
  );
}
