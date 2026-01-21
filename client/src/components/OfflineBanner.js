'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
    }

    // Set initial state
    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 p-2">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-yellow-800 text-sm font-medium">
        <WifiOff className="h-4 w-4" />
        <span>You are currently offline. Changes will rely on local data.</span>
      </div>
    </div>
  );
}
