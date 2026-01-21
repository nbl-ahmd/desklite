'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';
import Link from 'next/link';

export default function FeatureGate({ feature, fallback, children }) {
  const { hasFeature, loading, subscription } = useSubscription();

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-32 rounded-lg" />;
  }

  if (!hasFeature(feature)) {
    return fallback || (
      <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg p-6 border-2 border-primary-200">
        <div className="flex items-start gap-4">
          <div className="text-3xl">🔒</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Premium Feature</h3>
            <p className="text-sm text-gray-600 mb-3">
              This feature is not available on the {subscription?.plan || 'free'} plan. Upgrade to unlock {feature}.
            </p>
            <Link
              href="/pricing"
              className="inline-block px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
