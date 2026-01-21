'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getApiToken } from '@/utils/auth';
import { format } from 'date-fns';
import WhatsAppReminderModal from '@/components/WhatsAppReminderModal';
import { 
  Users, Search, Phone, MessageCircle, ArrowDownCircle, 
  ArrowUpCircle, Clock, ChevronRight, Plus, Filter,
  TrendingUp, TrendingDown, AlertCircle
} from 'lucide-react';

export default function CustomersPage() {
  const router = useRouter();
  const { status } = useSession();
  const [customers, setCustomers] = useState([]);
  const [receivables, setReceivables] = useState({ customers: [], total: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'receivables'
  const [error, setError] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showReminderModal, setShowReminderModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getApiToken();
      
      const [customersRes, receivablesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/receivables`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!customersRes.ok || !receivablesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [customersData, receivablesData] = await Promise.all([
        customersRes.json(),
        receivablesRes.json()
      ]);

      setCustomers(customersData);
      setReceivables(receivablesData);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router, fetchData]);

  const filteredCustomers = (activeTab === 'receivables' ? receivables.customers : customers)
    .filter(c => 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)
    );

  const openReminderModal = (customer, amount) => {
    setSelectedCustomer({
      _id: customer.name,
      customerName: customer.name,
      balance: amount || customer.amount || 0,
      phone: customer.phone
    });
    setShowReminderModal(true);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customers</h1>
        <p className="text-slate-500 font-bold mt-1">Manage your customer khata</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{customers.length}</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Customers</p>
        </div>
        
        <div className="bg-rose-50 rounded-3xl p-5 border border-rose-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600">₹{receivables.total.toLocaleString('en-IN')}</p>
          <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Receivables</p>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search by name or phone..."
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-black transition-all ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white border border-slate-100 text-slate-500'
            }`}
          >
            All Customers
          </button>
          <button
            onClick={() => setActiveTab('receivables')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${
              activeTab === 'receivables'
                ? 'bg-rose-500 text-white shadow-lg'
                : 'bg-white border border-slate-100 text-slate-500'
            }`}
          >
            Receivables ({receivables.count})
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 font-medium">
          {error}
        </div>
      )}

      {/* Customer List */}
      <div className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No customers found</h3>
            <p className="text-slate-500 font-medium text-sm">
              {searchQuery ? 'Try a different search term' : 'Customers will appear here once you add transactions'}
            </p>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const isReceivable = activeTab === 'receivables' || customer.creditAmount > 0;
            const amount = activeTab === 'receivables' ? customer.amount : (customer.creditAmount || customer.balance || 0);
            
            return (
              <div
                key={customer.name}
                className="group bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 font-black text-lg flex-shrink-0">
                    {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{customer.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                      {customer.phone && (
                        <>
                          <Phone className="w-3 h-3" />
                          <span>{customer.phone}</span>
                        </>
                      )}
                      {customer.transactionCount && (
                        <span className="ml-2">• {customer.transactionCount} txns</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Amount & Actions */}
                  <div className="flex items-center gap-2">
                    {isReceivable && amount > 0 && (
                      <p className="text-lg font-black text-rose-600">
                        ₹{amount.toLocaleString('en-IN')}
                      </p>
                    )}
                    
                    {/* WhatsApp Button */}
                    {isReceivable && amount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openReminderModal(customer, amount);
                        }}
                        className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30"
                        title="Send WhatsApp Reminder"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Aging indicator for receivables */}
                {activeTab === 'receivables' && customer.daysSinceOldest > 30 && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg w-fit">
                    <Clock className="w-3 h-3" />
                    Overdue by {Math.floor(customer.daysSinceOldest)} days
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* WhatsApp Reminder Modal */}
      <WhatsAppReminderModal
        isOpen={showReminderModal}
        onClose={() => {
          setShowReminderModal(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
      />
    </div>
  );
}
