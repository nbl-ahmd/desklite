'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, IndianRupee, CheckCircle, Clock, XCircle } from 'lucide-react';
import { getApiToken } from '@/utils/auth';

export default function BillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBills();
  }, [filter]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const token = await getApiToken();
      
      const params = new URLSearchParams({ limit: '50' });
      if (filter !== 'all') {
        params.append('paymentStatus', filter);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bills?${params}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBills(data.bills);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills.filter(bill =>
    bill.billNumber.toLowerCase().includes(search.toLowerCase()) ||
    bill.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusIcon = (status) => {
    if (status === 'paid') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (status === 'partial') return <Clock className="w-5 h-5 text-amber-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getStatusColor = (status) => {
    if (status === 'paid') return 'bg-green-50 border-green-200';
    if (status === 'partial') return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4">
          <h1 className="text-xl font-bold text-gray-900">Bills</h1>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="p-4 grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <p className="text-xs opacity-80 mb-1">Total Sales</p>
            <p className="text-xl font-bold">₹{summary.totalSales?.toFixed(0) || '0'}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
            <p className="text-xs opacity-80 mb-1">Collected</p>
            <p className="text-xl font-bold">₹{summary.totalPaid?.toFixed(0) || '0'}</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
            <p className="text-xs opacity-80 mb-1">Pending</p>
            <p className="text-xl font-bold">₹{summary.totalDue?.toFixed(0) || '0'}</p>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="px-4 pb-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search bills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: 'all', label: 'All' },
            { value: 'paid', label: 'Paid' },
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'partial', label: 'Partial' }
          ].map(item => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                filter === item.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border-2 border-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bills List */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No bills found</p>
            <button
              onClick={() => router.push('/dashboard/bills/create')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium"
            >
              Create First Bill
            </button>
          </div>
        ) : (
          filteredBills.map((bill) => (
            <button
              key={bill._id}
              onClick={() => router.push(`/dashboard/bills/${bill._id}`)}
              className={`w-full text-left bg-white rounded-lg p-4 border-2 ${getStatusColor(bill.paymentStatus)} hover:shadow-md transition-shadow`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs text-gray-500">{bill.billNumber}</p>
                  <p className="text-lg font-bold text-gray-900">{bill.customerName}</p>
                  {bill.customerPhone && (
                    <p className="text-sm text-gray-600">{bill.customerPhone}</p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">₹{bill.grandTotal.toFixed(0)}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {getStatusIcon(bill.paymentStatus)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(bill.billDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}</span>
                
                {bill.amountDue > 0 && (
                  <span className="font-medium text-red-600">
                    Due: ₹{bill.amountDue.toFixed(0)}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Floating Create Button */}
      <button
        onClick={() => router.push('/dashboard/bills/create')}
        className="fixed bottom-20 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center z-10"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}
