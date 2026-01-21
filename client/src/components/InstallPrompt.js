'use client';

import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredVisibleAt, setDeferredVisibleAt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after a delay (better UX)
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed) return;
      const timer = setTimeout(() => {
        setDeferredVisibleAt(Date.now());
        setShowPrompt(true);
      }, 2500);

      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA installed');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  const secondsSinceVisible = deferredVisibleAt ? Math.round((Date.now() - deferredVisibleAt) / 1000) : 0;

  return (
    <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-[360px] bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-200 z-50 animate-slide-up">
      <div className="p-4 flex gap-3 items-start">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 text-white flex items-center justify-center font-black text-lg shadow-md">
          PWA
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Install</p>
          <h3 className="text-base font-black text-slate-900">Add Desklite to Home</h3>
          <p className="text-sm text-slate-600 mt-1">Fast launch, offline-ready, and full-screen.</p>
          <div className="mt-3 flex gap-2 items-center">
            <button
              onClick={handleInstall}
              className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors"
            >
              Install now
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-slate-500 font-semibold text-sm hover:text-slate-900"
            >
              Later
            </button>
          </div>
        </div>
        <div className="flex flex-col items-end text-[11px] text-slate-400">
          <span>Offline ready</span>
          {secondsSinceVisible > 0 && <span>{secondsSinceVisible}s</span>}
        </div>
      </div>
    </div>
  );
}
