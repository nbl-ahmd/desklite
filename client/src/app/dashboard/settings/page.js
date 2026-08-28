'use client';

import Link from 'next/link';
import { User, Bell, Shield, Lock, Smartphone, LogOut, ChevronRight, Users } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import UpiQrWidget from '@/components/UpiQrWidget';
import { getApiToken } from '@/utils/auth';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { subscription } = useSubscription();
  const [savingSplitFeature, setSavingSplitFeature] = useState(false);

  const toggleExpenseSplitting = async (enabled) => {
    setSavingSplitFeature(true);
    try {
      const token = await getApiToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/features`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ expenseSplittingEnabled: enabled }),
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new Error(payload.message || payload.error || 'Unable to update feature');
      }

      window.location.reload();
    } catch (error) {
      alert(error.message || 'Unable to update feature');
    } finally {
      setSavingSplitFeature(false);
    }
  };

  const sections = [
    {
      title: 'Profile & Account',
      items: [
        { icon: User, label: 'Personal Information', value: user?.name, action: () => {} },
        { icon: Smartphone, label: 'Phone Number', value: user?.phone, action: () => {} },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: Bell, label: 'Notifications', value: 'On', action: () => {} },
        { icon: Shield, label: 'Security', action: () => {} },
      ]
    },
    {
      title: 'Data & Privacy',
      items: [
        { icon: Lock, label: 'Privacy Policy', action: () => {} },
      ]
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl lg:max-w-full mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 font-bold mt-1">Manage your account preferences</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="md:col-span-2 lg:col-span-1 bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 blur-3xl rounded-full opacity-20 translate-x-10 -translate-y-10"></div>
            
            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center text-3xl font-black mb-4 border border-white/10 shadow-inner">
              {user?.name?.[0] || 'U'}
            </div>
            
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <p className="text-slate-400 font-medium mb-6">{user?.phone}</p>
            
            <div className="w-full space-y-2">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-sm font-bold text-slate-300">Plan</span>
                    <span className="text-xs font-black bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg uppercase tracking-wider">{subscription?.plan || 'Free'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                   <span className="text-sm font-bold text-slate-300">Shop ID</span>
                   <span className="text-xs font-mono text-slate-400">{user?.shopName || 'N/A'}</span>
                </div>
                <Link
                  href="/dashboard/upgrade"
                  className="mt-1 inline-flex items-center justify-center w-full px-4 py-3 bg-white text-slate-900 font-bold rounded-2xl shadow-sm hover:shadow transition-all text-sm"
                >
                  Upgrade plan
                </Link>
            </div>
        </div>

        {/* Settings Lists */}
        <div className="md:col-span-2 space-y-6">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* UPI QR Setup */}
            <UpiQrWidget />

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">Optional Features</h3>
              </div>
              <div className="px-6 py-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600"><Users size={20} /></div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Expense Splitting</p>
                    <p className="text-xs font-medium text-slate-400">Available to everyone</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={savingSplitFeature}
                  onClick={() => toggleExpenseSplitting(!subscription?.features?.expenseSplitting?.enabled)}
                  aria-label="Toggle Expense Splitting"
                  className={`group relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${subscription?.features?.expenseSplitting?.enabled ? 'border-purple-500 bg-purple-600 shadow-[0_0_0_3px_rgba(168,85,247,0.12)]' : 'border-slate-200 bg-slate-300'}`}
                >
                  <span
                    className={`pointer-events-none absolute left-1 h-6 w-6 rounded-full bg-white shadow-md ring-1 ring-slate-200 transition-transform duration-200 ease-out ${subscription?.features?.expenseSplitting?.enabled ? 'translate-x-6' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>

            {sections.map((section) => (
                <div key={section.title} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900">{section.title}</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {section.items.map((item) => (
                            <button 
                                key={item.label}
                                onClick={item.action}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                        <item.icon size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-slate-900 text-sm">{item.label}</p>
                                        {item.value && <p className="text-xs font-medium text-slate-400">{item.value}</p>}
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500" />
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            
            <button 
              onClick={logout}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-4 rounded-3xl transition-colors flex items-center justify-center gap-2"
            >
               <LogOut size={20} />
               Sign Out
            </button>
        </div>
      </div>
    </div>
  );
}
