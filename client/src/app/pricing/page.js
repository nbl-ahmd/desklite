'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getSession } from 'next-auth/react';
import { ArrowLeft, Headphones, CheckCircle2, Crown, Zap, Shield } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    id: 'free',
    name: 'Free Starter',
    price: '0.00',
    period: 'forever',
    icon: Shield,
    features: ['Basic ledger', '5 Exports/mo', 'No WhatsApp'],
    description: 'Perfect for testing the waters.',
  },
  {
    id: 'basic',
    name: 'Standard Growth',
    price: '499.00',
    period: 'per year',
    icon: Zap,
    features: ['Full Reports', '30 Exports/mo', 'Email Support'],
    description: 'For growing shops giving credit.',
    popular: true
  },
  {
    id: 'pro',
    name: 'Pro Business',
    price: '1499.00',
    period: 'per year',
    icon: Crown,
    features: ['Unlimited', 'WhatsApp Auto', 'Priority Sync'],
    description: 'For serious businesses.',
  }
];

export default function PricingPage() {
  const router = useRouter();
  const { subscription, refreshSubscription } = useSubscription();
  const [loading, setLoading] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('basic');

  const handleUpgrade = async () => {
    const planId = selectedPlan;
    if (planId === subscription?.plan) return;
    
    setLoading(planId);
    try {
      const session = await getSession();
      const token = session?.apiToken;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan: planId, daysValid: 365 })
      });

      if (!response.ok) throw new Error('Failed to upgrade');

      await refreshSubscription();
      // alert(`Activated ${planId.toUpperCase()} plan!`); // Removed for cleaner UI
      router.push('/dashboard');
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Failed to upgrade. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative flex flex-col">
        
        {/* Header (Like Image) */}
        <div className="px-6 pt-12 pb-6 flex items-center justify-between">
          <Link href="/dashboard" className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-900" />
          </Link>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Select Plan</h1>
          <button className="p-2 -mr-2 hover:bg-slate-50 rounded-full transition-colors opacity-60">
            <Headphones className="w-6 h-6 text-slate-900" />
          </button>
        </div>

        {/* Current Status Card (Like "Billing History" top card) */}
        <div className="px-6 mb-8">
           <div className="bg-slate-50 rounded-[32px] p-6 relative overflow-hidden">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current Plan</p>
                   <h2 className="text-2xl font-black text-slate-900 capitalize">{subscription?.plan || 'Free'}</h2>
                </div>
                <div className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Active
                </div>
             </div>
             <p className="text-sm font-medium text-slate-500">
               {subscription?.plan === 'free' ? 'Upgrade to unlock full potential' : 'Your service is currently active.'}
             </p>
           </div>
        </div>

        {/* Plan Selection (Like "Payment Method") */}
        <div className="px-6 flex-1 space-y-4">
           <h3 className="text-md font-bold text-slate-900 mb-2">Available Plans</h3>
           
           <div className="space-y-4">
             {plans.map((plan) => {
               const isSelected = selectedPlan === plan.id;
               const Icon = plan.icon;
               
               return (
                 <div 
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`
                      relative p-4 rounded-[24px] cursor-pointer transition-all duration-200 border-2
                      ${isSelected ? 'border-slate-900 bg-slate-50' : 'border-transparent bg-slate-50 hover:bg-slate-100'}
                    `}
                 >
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSelected ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
                          <Icon size={20} />
                       </div>
                       <div className="flex-1">
                          <div className="flex justify-between items-center mb-0.5">
                             <h4 className="font-bold text-slate-900">{plan.name}</h4>
                             {plan.popular && <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-md">Popular</span>}
                          </div>
                          <p className="text-xs font-medium text-slate-500">{plan.description}</p>
                       </div>
                       <div className="text-right">
                          <p className="font-bold text-slate-900">₹{plan.price}</p>
                          <div className={`w-5 h-5 rounded-full border-2 ml-auto mt-1 flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                             {isSelected && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                       </div>
                    </div>
                 </div>
               );
             })}
           </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 mt-auto">
           <button
             onClick={handleUpgrade}
             disabled={loading || selectedPlan === subscription?.plan}
             className="w-full bg-slate-900 text-white font-bold text-md py-4 rounded-[20px] shadow-lg shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
           >
              {loading ? 'Processing...' : selectedPlan === subscription?.plan ? 'Current Plan' : `Upgrade to ${plans.find(p => p.id === selectedPlan)?.name}`}
           </button>
           <p className="text-center text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest flex items-center justify-center gap-2">
              <Shield size={10} /> Secure Payments via SSL
           </p>
        </div>

      </div>
    </div>
  );
}