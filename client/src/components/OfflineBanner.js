'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { getNetworkStatus, isNativePlatform, watchNetwork } from '@/lib/native';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let nativeWatcher;

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    const bootstrapStatus = async () => {
      // Prefer Capacitor network status when running natively
      if (isNativePlatform()) {
        const status = await getNetworkStatus();
        setIsOffline(!status.connected);
        nativeWatcher = await watchNetwork((state) => setIsOffline(!state.connected));
      } else {
        setIsOffline(!navigator.onLine);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
      }
    };

    bootstrapStatus();

    return () => {
      if (nativeWatcher?.remove) nativeWatcher.remove();
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
