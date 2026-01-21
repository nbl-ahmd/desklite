"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getApiToken } from '@/utils/auth';
import { 
  Shield, Zap, MessageSquare, Check, Sparkles, ArrowRight,
  X, Crown, Star, Users, FileText, Bell, Cloud, Smartphone, 
  Camera, Calendar, Download, BarChart3
} from 'lucide-react';

const plans = [
  {
    id: 'free',
    name: 'Free',
    nameML: 'ഫ്രീ',
    price: 0,
    period: 'Forever',
    description: 'Perfect for getting started',
    descriptionML: 'തുടങ്ങാൻ പറ്റിയത്',
    color: 'slate',
    features: [
      { name: 'Up to 25 customers', included: true },
      { name: '30-day transaction history', included: true },
      { name: 'Basic ledger', included: true },
      { name: 'Daily summary', included: true },
      { name: '5 PDF exports/month', included: true },
      { name: '5 reminders/day', included: true },
      { name: 'WhatsApp reminders', included: false },
      { name: 'Bill photo attachments', included: false },
      { name: 'Excel export', included: false },
      { name: 'Scheduled reminders', included: false },
      { name: 'Cloud backup', included: false },
      { name: 'Multi-device sync', included: false },
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    nameML: 'പ്രോ',
    price: 999,
    period: '/year',
    description: 'For growing businesses',
    descriptionML: 'വളരുന്ന ബിസിനസ്സിന്',
    color: 'blue',
    popular: true,
    features: [
      { name: 'Up to 500 customers', included: true },
      { name: '1-year transaction history', included: true },
      { name: 'Full ledger with reports', included: true },
      { name: 'Daily + Monthly summary', included: true },
      { name: 'Unlimited PDF exports', included: true },
      { name: '50 reminders/day', included: true },
      { name: 'WhatsApp reminders', included: true },
      { name: 'Bill photo attachments', included: true },
      { name: 'Excel export', included: true },
      { name: 'Scheduled reminders', included: false },
      { name: 'Cloud backup', included: true },
      { name: 'Multi-device sync', included: true },
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    nameML: 'പ്രീമിയം',
    price: 2499,
    period: '/year',
    description: 'For established businesses',
    descriptionML: 'സ്ഥാപിത ബിസിനസ്സിന്',
    color: 'amber',
    features: [
      { name: 'Unlimited customers', included: true },
      { name: 'Unlimited transaction history', included: true },
      { name: 'Advanced reports & analytics', included: true },
      { name: 'All summary types', included: true },
      { name: 'Unlimited exports', included: true },
      { name: 'Unlimited reminders', included: true },
      { name: 'WhatsApp reminders', included: true },
      { name: 'Bill photo attachments', included: true },
      { name: 'Excel export', included: true },
      { name: 'Scheduled reminders', included: true },
      { name: 'Priority cloud backup', included: true },
      { name: 'Multi-device + Priority sync', included: true },
    ]
  }
];

export default function UpgradePage() {
  const { t, language } = useLanguage();
  const { subscription, refreshSubscription } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [loading, setLoading] = useState(false);

  const currentPlan = subscription?.plan || 'free';

  const handleUpgrade = async (planId) => {
    if (planId === 'free' || planId === currentPlan) return;
    
    setLoading(true);
    try {
      // In production, this would redirect to payment gateway
      // For now, we'll simulate activation
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: planId, daysValid: 365 })
      });
      
      if (res.ok) {
        await refreshSubscription();
        alert(`Successfully upgraded to ${planId.toUpperCase()} plan!`);
      } else {
        throw new Error('Failed to upgrade');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upgrade. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl lg:max-w-full mx-auto pb-24">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {language === 'ml' ? 'പ്ലാൻ അപ്ഗ്രേഡ് ചെയ്യുക' : 'Upgrade Your Plan'}
        </h1>
        <p className="text-slate-500 font-bold mt-2">
          {language === 'ml' ? 'നിങ്ങളുടെ ബിസിനസ്സിന് അനുയോജ്യമായ പ്ലാൻ തിരഞ്ഞെടുക്കൂ' : 'Choose the plan that fits your business'}
        </p>
        {currentPlan !== 'free' && (
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold">
            <Crown className="w-4 h-4" />
            Current Plan: {currentPlan.toUpperCase()}
          </div>
        )}
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan;
          const isPro = plan.id === 'pro';
          
          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-6 border-2 transition-all ${
                plan.popular 
                  ? 'border-blue-500 bg-blue-50/50 shadow-xl shadow-blue-500/10' 
                  : isCurrentPlan
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                  {language === 'ml' ? 'ഏറ്റവും ജനപ്രിയം' : 'MOST POPULAR'}
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                  {language === 'ml' ? 'നിലവിലെ പ്ലാൻ' : 'CURRENT PLAN'}
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6 pt-2">
                <h3 className="text-xl font-black text-slate-900">
                  {language === 'ml' ? plan.nameML : plan.name}
                </h3>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  {language === 'ml' ? plan.descriptionML : plan.description}
                </p>
                <div className="mt-4">
                  <span className="text-4xl font-black text-slate-900">
                    {plan.price === 0 ? (language === 'ml' ? 'സൗജന്യം' : 'Free') : `₹${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-slate-500 font-bold">{plan.period}</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    {feature.included ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Check className="w-3 h-3 text-emerald-600" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                        <X className="w-3 h-3 text-slate-400" strokeWidth={3} />
                      </div>
                    )}
                    <span className={`text-sm font-medium ${feature.included ? 'text-slate-700' : 'text-slate-400'}`}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrentPlan || plan.id === 'free' || loading}
                className={`w-full py-3.5 rounded-2xl font-bold transition-all ${
                  isCurrentPlan
                    ? 'bg-emerald-100 text-emerald-700 cursor-default'
                    : plan.id === 'free'
                      ? 'bg-slate-100 text-slate-500 cursor-default'
                      : plan.popular
                        ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {isCurrentPlan 
                  ? (language === 'ml' ? 'നിലവിലെ പ്ലാൻ' : 'Current Plan')
                  : plan.id === 'free'
                    ? (language === 'ml' ? 'സൗജന്യം' : 'Free Forever')
                    : loading
                      ? 'Processing...'
                      : (language === 'ml' ? 'അപ്ഗ്രേഡ് ചെയ്യുക' : 'Upgrade Now')
                }
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <h3 className="text-lg font-black text-slate-900 mb-4">
          {language === 'ml' ? 'എന്തുകൊണ്ട് അപ്ഗ്രേഡ് ചെയ്യണം?' : 'Why Upgrade?'}
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: MessageSquare, title: 'WhatsApp Reminders', titleML: 'വാട്ട്സ്ആപ്പ് റിമൈൻഡർ', desc: 'Send payment reminders directly via WhatsApp' },
            { icon: Camera, title: 'Bill Photos', titleML: 'ബിൽ ഫോട്ടോസ്', desc: 'Attach bill/receipt photos to transactions' },
            { icon: Cloud, title: 'Cloud Backup', titleML: 'ക്ലൗഡ് ബാക്കപ്പ്', desc: 'Never lose your data with automatic backups' },
            { icon: BarChart3, title: 'Advanced Reports', titleML: 'വിശദ റിപ്പോർട്ടുകൾ', desc: 'Get detailed insights into your business' },
          ].map((item, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-2xl">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-3">
                <item.icon className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900">{language === 'ml' ? item.titleML : item.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-slate-900 rounded-3xl p-6 text-center text-white">
        <h3 className="text-lg font-bold mb-2">
          {language === 'ml' ? 'സഹായം വേണോ?' : 'Need Help?'}
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          {language === 'ml' ? 'ഞങ്ങളെ ബന്ധപ്പെടുക' : 'Contact us for any questions'}
        </p>
        <a
          href="mailto:support@desklite.com"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          support@desklite.com
        </a>
      </div>
    </div>
  );
}
