'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { getApiToken } from '@/utils/auth';
import { Plus, Filter, Calendar, User, Banknote, Smartphone, CreditCard, Edit2, Trash2, MoreVertical, ArrowDownCircle, ArrowUpCircle, Download, X, Search } from 'lucide-react';


export default function TransactionsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [selectedMode, setSelectedMode] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRefs = useRef({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchTransactions();
    }
  }, [status, router]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, selectedMode, dateRange, customStartDate, customEndDate, selectedCustomer]);

  const fetchTransactions = async () => {
    try {
      const token = await getApiToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // ✅ Send JWT in header
        },});
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      setTransactions(data);
      setFilteredTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Filter by payment mode
    if (selectedMode !== 'all') {
      filtered = filtered.filter(t => t.mode === selectedMode);
    }

    // Filter by customer name
    if (selectedCustomer !== 'all') {
      filtered = filtered.filter(t => t.customerName === selectedCustomer);
    }

    // Filter by date range
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
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = startOfDay(new Date(customStartDate));
          endDate = endOfDay(new Date(customEndDate));
        }
        break;
      default:
        startDate = null;
        endDate = null;
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
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      const token = await getApiToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      // Remove the deleted transaction from the state
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
      
      // Ensure expense transactions have a default mode
      const updateData = {
        ...editingTransaction,
        mode: editingTransaction.type === 'expense' && !editingTransaction.mode ? 'cash' : editingTransaction.mode
      };
      
      console.log('Sending update data:', updateData);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${editingTransaction._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        console.error('Validation errors:', errorData.errors);
        throw new Error('Failed to update transaction');
      }

      const updatedTransaction = await response.json();
      console.log('Updated transaction response:', updatedTransaction);
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

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Add Transaction
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedMode('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                selectedMode === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedMode('cash')}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                selectedMode === 'cash'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cash
            </button>
            <button
              onClick={() => setSelectedMode('upi')}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                selectedMode === 'upi'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              UPI
            </button>
            <button
              onClick={() => setSelectedMode('credit')}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                selectedMode === 'credit'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Credit
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>

            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">All Customers</option>
              {Array.from(new Set(transactions.filter(t => t.customerName).map(t => t.customerName))).sort().map(customer => (
                <option key={customer} value={customer}>{customer}</option>
              ))}
            </select>

            {dateRange === 'custom' && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Note
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(transaction.date), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>₹{transaction.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.type === 'income' ? (
                        <>
                          {transaction.mode?.charAt(0).toUpperCase() + transaction.mode?.slice(1)}
                        </>
                      ) : (
                        transaction.mode ? transaction.mode.charAt(0).toUpperCase() + transaction.mode.slice(1) : 'Cash'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.customerName ? (
                        <>
                          {transaction.customerName}
                          {transaction.customerPhone && (
                            <>
                              <br />
                              <span className="text-xs text-gray-400">{transaction.customerPhone}</span>
                            </>
                          )}
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-primary-600 hover:text-primary-900 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(transaction._id)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredTransactions.length === 0 && (
              <div className="p-4 text-center text-gray-400">No transactions found.</div>
            )}
            {filteredTransactions.map((transaction) => (
              <div key={transaction._id} className="p-3 flex items-center hover:bg-gray-50 transition-colors relative">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{format(new Date(transaction.date), 'MMM d, yyyy h:mm a')}</span>
                    <span className={`text-sm font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>₹{transaction.amount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <span className="font-medium">
                      {transaction.type === 'income' 
                        ? (transaction.mode?.charAt(0).toUpperCase() + transaction.mode?.slice(1))
                        : (transaction.mode ? transaction.mode.charAt(0).toUpperCase() + transaction.mode.slice(1) : 'Cash')
                      }
                    </span>
                    {transaction.customerName && (
                      <span className="text-xs text-gray-500">{transaction.customerName} {transaction.customerPhone && <><span className="text-gray-300">|</span> {transaction.customerPhone}</>}</span>
                    )}
                  </div>
                  {transaction.description && (
                    <div className="text-xs text-gray-500 mt-1">
                      {transaction.description}
                    </div>
                  )}
                </div>
                {/* Three dots menu */}
                <div className="ml-2 relative flex-shrink-0">
                  <button
                    aria-label="Open actions"
                    className="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onClick={() => setOpenMenuId(openMenuId === transaction._id ? null : transaction._id)}
                    ref={el => menuRefs.current[transaction._id] = el}
                  >
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>
                  {/* Popover menu */}
                  {openMenuId === transaction._id && (
                    <div className="absolute right-0 z-20 mt-2 w-28 bg-white rounded shadow-lg ring-1 ring-black ring-opacity-5 animate-fade-in">
                      <button
                        onClick={() => { setOpenMenuId(null); handleEdit(transaction); }}
                        className="block w-full text-left px-4 py-2 text-sm text-primary-700 hover:bg-primary-50 rounded-t"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { setOpenMenuId(null); handleDelete(transaction._id); }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Modal */}
        {isEditModalOpen && editingTransaction && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-lg font-semibold mb-4">Edit Transaction</h2>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={editingTransaction.amount}
                    onChange={(e) => setEditingTransaction({
                      ...editingTransaction,
                      amount: parseFloat(e.target.value)
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={editingTransaction.customerName || ''}
                    onChange={(e) => setEditingTransaction({
                      ...editingTransaction,
                      customerName: e.target.value
                    })}
                    placeholder="Enter customer name (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Phone</label>
                  <input
                    type="tel"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={editingTransaction.customerPhone || ''}
                    onChange={(e) => setEditingTransaction({
                      ...editingTransaction,
                      customerPhone: e.target.value
                    })}
                    placeholder="Enter customer phone (optional)"
                  />
                </div>

                {editingTransaction.mode === 'credit' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        value={editingTransaction.customerName}
                        onChange={(e) => setEditingTransaction({
                          ...editingTransaction,
                          customerName: e.target.value
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer Phone</label>
                      <input
                        type="tel"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        value={editingTransaction.customerPhone}
                        onChange={(e) => setEditingTransaction({
                          ...editingTransaction,
                          customerPhone: e.target.value
                        })}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Note/Description (optional)</label>
                  <textarea
                    rows="3"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={editingTransaction.description || ''}
                    onChange={(e) => setEditingTransaction({
                      ...editingTransaction,
                      description: e.target.value
                    })}
                    placeholder="Add a note or description for this transaction..."
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingTransaction(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 