'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    try {
      const session = await fetch('/api/auth/session').then(r => r.json());
      if (!session?.apiToken) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/plan`, {
        headers: { Authorization: `Bearer ${session.apiToken}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const hasFeature = (featureName) => {
    if (!subscription) return false;
    return subscription.features?.[featureName]?.enabled === true;
  };

  const refreshSubscription = () => {
    return fetchSubscription();
  };

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, hasFeature, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};
