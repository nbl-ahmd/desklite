"use client";

import Link from 'next/link';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function SubscriptionBanner() {
  const { subscription, loading } = useSubscription();

  if (loading || !subscription) return null;

  const { status, plan, graceUntil } = subscription;
  const isExpired = status === 'expired';
  const isGrace = status === 'grace';

  const bannerClasses = isExpired
    ? 'bg-rose-50 border-rose-200 text-rose-800'
    : isGrace
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-emerald-50 border-emerald-200 text-emerald-800';

  const icon = isExpired ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />;

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border ${bannerClasses}`}>
      <div className="flex items-center gap-3">
        {icon}
        <div className="text-sm">
          <p className="font-semibold capitalize">{plan} plan — {status}</p>
          {isGrace && graceUntil && (
            <p className="text-xs opacity-80">Grace period until {new Date(graceUntil).toLocaleDateString()}</p>
          )}
          {isExpired && <p className="text-xs opacity-80">Write actions are blocked. Upgrade to continue.</p>}
        </div>
      </div>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition-colors"
      >
        Upgrade plan
      </Link>
    </div>
  );
}
