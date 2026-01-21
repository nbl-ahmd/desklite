'use client';

import { useState, useEffect } from 'react';
import { ArrowUpCircle, Clock } from 'lucide-react';
import { getApiToken } from '@/utils/auth';

export default function PayablesWidget() {
  const [payables, setPayables] = useState({ vendors: [], total: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayables = async () => {
      try {
        const token = await getApiToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/payables`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPayables(data);
        }
      } catch (err) {
        console.error('Error fetching payables:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayables();
  }, []);

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

  if (payables.count === 0) return null;

  const topVendors = payables.vendors.slice(0, 3);

  return (
    <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
      <div className="absolute right-[-30px] top-[-30px] w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
            <ArrowUpCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-white/80 text-sm uppercase tracking-wider">To Pay (Vendors)</p>
            <p className="text-xs text-white/70 font-semibold">Shop payables and vendor dues</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-4xl font-black">₹{payables.total.toLocaleString('en-IN')}</p>
          <p className="text-emerald-100 text-sm font-medium">
            {payables.count} vendor{payables.count === 1 ? '' : 's'}
          </p>
        </div>

        <div className="space-y-2">
          {topVendors.map((vendor) => {
            const days = vendor.daysSinceOldest ? Math.floor(vendor.daysSinceOldest) : null;
            return (
              <div
                key={vendor.name}
                className="flex items-center justify-between bg-white/10 rounded-2xl p-3 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-sm font-bold">
                    {vendor.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{vendor.name}</p>
                    <p className="text-emerald-100 text-xs">₹{vendor.amount?.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-emerald-50 text-xs font-semibold">
                  <Clock className="w-4 h-4" />
                  {days !== null ? `${days}d since oldest due` : 'No due date'}
                </div>
              </div>
            );
          })}
        </div>

        {payables.count > 3 && (
          <div className="mt-3 text-sm text-emerald-100 font-semibold">
            +{payables.count - 3} more vendors
          </div>
        )}
      </div>
    </div>
  );
}
