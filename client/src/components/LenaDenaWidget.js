'use client';

import { useState, useEffect } from 'react';
import { getApiToken } from '@/utils/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowDownCircle, ArrowUpCircle, Users, Phone, MessageCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import WhatsAppReminderModal from './WhatsAppReminderModal';

export default function LenaDenaWidget() {
  const { t, language } = useLanguage();
  const [receivables, setReceivables] = useState({ customers: [], total: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showReminderModal, setShowReminderModal] = useState(false);

  useEffect(() => {
    const fetchReceivables = async () => {
      try {
        const token = await getApiToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/receivables`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReceivables(data);
        }
      } catch (err) {
        console.error('Error fetching receivables:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReceivables();
  }, []);

  const openReminderModal = (customer) => {
    setSelectedCustomer({
      _id: customer.name,
      customerName: customer.name,
      balance: customer.amount,
      phone: customer.phone
    });
    setShowReminderModal(true);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-100 rounded w-1/3"></div>
          <div className="h-10 bg-slate-100 rounded w-1/2"></div>
          <div className="h-16 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (receivables.count === 0) {
    return null; // Don't show if no receivables
  }

  const topCustomers = receivables.customers.slice(0, 3);

  return (
    <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute right-[-30px] top-[-30px] w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white/80 text-sm uppercase tracking-wider">
                {t('toReceive')} ({t('lena')})
              </h3>
            </div>
          </div>
        </div>

        {/* Total Amount */}
        <p className="text-4xl font-black mb-1">₹{receivables.total.toLocaleString('en-IN')}</p>
        <p className="text-rose-200 text-sm font-medium mb-5">
          {language === 'ml' 
            ? `${receivables.count} കസ്റ്റമേഴ്സിൽ നിന്ന്` 
            : `from ${receivables.count} customers`
          }
        </p>

        {/* Top Customers */}
        <div className="space-y-2">
          {topCustomers.map((customer) => (
            <div 
              key={customer.name} 
              className="flex items-center justify-between bg-white/10 rounded-2xl p-3 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-sm font-bold">
                  {customer.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm">{customer.name}</p>
                  <p className="text-rose-200 text-xs">₹{customer.amount?.toLocaleString('en-IN')}</p>
                </div>
              </div>
              
              {customer.phone && (
                <button
                  onClick={() => openReminderModal(customer)}
                  className="p-2 bg-green-500 rounded-xl hover:bg-green-400 transition-colors"
                  title={t('sendReminder')}
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* View All Link */}
        {receivables.count > 3 && (
          <Link 
            href="/dashboard/customers?tab=receivables"
            className="mt-4 flex items-center justify-center gap-2 py-3 bg-white/20 rounded-2xl font-bold text-sm hover:bg-white/30 transition-colors"
          >
            {language === 'ml' 
              ? `${receivables.count} കസ്റ്റമേഴ്സ് കാണുക`
              : `View All ${receivables.count} Customers`
            }
            <ChevronRight className="w-4 h-4" />
          </Link>
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
