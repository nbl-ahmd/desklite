'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import { format } from 'date-fns';
import { getSession } from 'next-auth/react';

const DEFAULT_TYPE_KEY = 'dashboardDefaultType';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    amount: '',
    mode: 'cash',
    customerName: '',
    customerPhone: '',
  });
  const [expenseData, setExpenseData] = useState({
    amount: '',
    customerName: '',
    description: '',
    customerPhone: '',
  });
  const [totalAmount, setTotalAmount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedForm, setSelectedForm] = useState('received');
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [defaultType, setDefaultType] = useState('received');

  useEffect(() => {
    // Load default type from localStorage
    const stored = localStorage.getItem(DEFAULT_TYPE_KEY);
    if (stored === 'expense' || stored === 'received') {
      setDefaultType(stored);
      setSelectedForm(stored);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    fetchTotalAmount();
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, [status, router]);

  const getApiToken = async () => {
    const session = await getSession();
    const token = session?.apiToken;
    if (!token) {
      throw new Error('No access token found. Please log in again.');
    }
    return token;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = await getApiToken();
      if (!token) {
        throw new Error('No access token found. Please log in again.');
      }
      const response = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          type: 'income',
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add transaction');
      }
      setFormData({
        amount: '',
        type:'income',
        mode: 'cash',
        customerName: '',
        customerPhone: '',
      });
      fetchTotalAmount();
    } catch (error) {
      console.error('Error adding transaction:', error.message);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = await getApiToken();
      if (!token) {
        throw new Error('No access token found. Please log in again.');
      }
      // You may want to POST to a different endpoint for expenses, or add a type field
      const response = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: (parseFloat(expenseData.amount)),
          type: 'expense',
          customerName: expenseData.customerName,
          descrption: expenseData.description,
          customerPhone: expenseData.customerPhone,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add expense');
      }
      setExpenseData({
        amount: '',
        customerName: '',
        description: '',
        customerPhone: '',
      });
      fetchTotalAmount();
      setSelectedForm('received'); // Switch back to received
    } catch (error) {
      console.error('Error adding expense:', error.message);
    }
  };

  const fetchTotalAmount = async () => {
    try {
      const token = await getApiToken();
      const response = await fetch('http://localhost:5000/api/transactions/total', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch total');
      }
      const data = await response.json();
      setTotalAmount(data.total);
    } catch (error) {
      console.error('Error fetching total:', error);
    }
  };

  const handleTabChange = (tab) => {
    setSelectedForm(tab);
  };

  const handleDefaultTypeChange = (type) => {
    setDefaultType(type);
    localStorage.setItem(DEFAULT_TYPE_KEY, type);
    setSelectedForm(type);
  };

  // Hamburger menu and settings
  const HamburgerMenu = () => (
    <div className="relative">
      <button
        className="p-2 rounded hover:bg-gray-200"
        onClick={() => setShowMenu((v) => !v)}
        aria-label="Open menu"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {showMenu && (
        <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-50">
          <button
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            onClick={() => { setShowSettings(true); setShowMenu(false); }}
          >
            Settings
          </button>
        </div>
      )}
    </div>
  );

  const SettingsModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-6 w-80 relative">
        <h2 className="text-lg font-semibold mb-4">Settings</h2>
        <div className="mb-4">
          <label className="block mb-2 font-medium">Default Entry Type</label>
          <div className="flex gap-4">
            <button
              className={`px-3 py-1 rounded ${defaultType === 'received' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
              onClick={() => handleDefaultTypeChange('received')}
            >
              Received
            </button>
            <button
              className={`px-3 py-1 rounded ${defaultType === 'expense' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
              onClick={() => handleDefaultTypeChange('expense')}
            >
              Expense
            </button>
          </div>
        </div>
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={() => setShowSettings(false)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );

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
        {/* Header with time, total, and hamburger menu */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">{format(currentTime, 'h:mm a, MMMM d, yyyy')}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Transactions</p>
              <p className="text-2xl font-bold text-primary-600">₹{totalAmount}</p>
            </div>
            <HamburgerMenu />
          </div>
        </div>

        {/* Toggle Menu */}
        <div className="flex justify-center gap-4 mb-2">
          <button
            className={`px-4 py-2 rounded-t-lg font-semibold border-b-4 transition-colors duration-150 ${selectedForm === 'received' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-transparent bg-gray-100 text-gray-500'}`}
            onClick={() => handleTabChange('received')}
          >
            + Received
          </button>
          <button
            className={`px-4 py-2 rounded-t-lg font-semibold border-b-4 transition-colors duration-150 ${selectedForm === 'expense' ? 'border-red-500 bg-red-50 text-red-700' : 'border-transparent bg-gray-100 text-gray-500'}`}
            onClick={() => handleTabChange('expense')}
          >
            - Expense
          </button>
        </div>

        {/* Forms */}
        {selectedForm === 'received' ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6 border-2 border-primary-200">
            <h2 className="text-lg font-bold text-primary-700 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Received Transaction
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              {formData.mode === 'credit' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Phone</label>
                    <input
                      type="tel"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    />
                  </div>
                </>
              )}
              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Add Transaction
              </button>
            </form>
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-red-50 rounded-lg shadow p-6 border-2 border-red-300">
            <h2 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20V4m8 8H4" /></svg>
              Add Expense
            </h2>
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-red-700">Expense Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="mt-1 block w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-red-700">Customer Name (optional)</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  value={expenseData.customerName}
                  onChange={(e) => setExpenseData({ ...expenseData, customerName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-red-700">Note (optional)</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  value={expenseData.description}
                  onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-red-700">Phone Number (optional)</label>
                <input
                  type="tel"
                  className="mt-1 block w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  value={expenseData.customerPhone}
                  onChange={(e) => setExpenseData({ ...expenseData, customerPhone: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Add Expense
              </button>
            </form>
          </div>
        )}

        {/* Floating Action Button */}
        <button
          onClick={() => router.push('/dashboard/transactions')}
          className="fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </button>
        {showSettings && <SettingsModal />}
      </div>
    </DashboardLayout>
  );
} 