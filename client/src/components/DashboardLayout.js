'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useSync } from '@/contexts/SyncContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import InstallPrompt from './InstallPrompt';
import OfflineBanner from './OfflineBanner';
import ErrorBoundary from './ErrorBoundary';
import PushRegistration from './PushRegistration';
import { 
  Home, 
  Users, 
  BookOpen, 
  BarChart3, 
  Menu, 
  X, 
  Wifi, 
  WifiOff, 
  RefreshCcw, 
  CloudOff,
  LogOut,
  Settings,
  Clock,
  Sparkles,
  Bell,
  Check,
  Package,
  Scale
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { subscription } = useSubscription();
  const { status: syncStatus, pendingCount } = useSync();
  const { t } = useLanguage();
  const { alerts, unreadCount, markAsRead, markAllRead, loading: notifLoading, readIds } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Primary Navigation (Bottom Bar on Mobile)
  const mainNavHelp = [
    { name: t('home'), href: '/dashboard', icon: Home },
    { name: t('khata'), href: '/dashboard/customers', icon: Users },
    { name: t('transactions'), href: '/dashboard/transactions', icon: BookOpen },
    { name: t('menu'), action: () => setIsSidebarOpen(true), icon: Menu },
  ];

  // Secondary/Sidebar Navigation (Desktop & Mobile Drawer)
  const sidebarNav = [
    { name: t('home'), href: '/dashboard', icon: Home },
    { name: t('customers'), href: '/dashboard/customers', icon: Users },
    { name: t('transactions'), href: '/dashboard/transactions', icon: BookOpen },
    { name: 'Bills', href: '/dashboard/bills', icon: BarChart3 },
    { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
    { name: t('ledger'), href: '/dashboard/ledger', icon: BookOpen },
    { name: t('overdue'), href: '/dashboard/overdue', icon: Clock },
    { name: t('reports'), href: '/dashboard/reports', icon: BarChart3 },
    ...(subscription?.features?.expenseSplitting?.enabled ? [{ name: 'Expense Splitting', href: '/dashboard/expense-split', icon: Scale }] : []),
    { name: t('notificationsTitle'), href: '/dashboard/notifications', icon: Bell },
    { name: t('upgrade'), href: '/dashboard/upgrade', icon: Sparkles },
    { name: t('settings'), href: '/dashboard/settings', icon: Settings },
  ];

  const recentAlerts = useMemo(() => alerts.slice(0, 5), [alerts]);

  const renderStatusIndicators = () => {
    return (
      <div className="flex items-center gap-2">
        {subscription?.plan === 'free' && (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold">
            <span>FREE</span>
          </div>
        )}

        {syncStatus === 'offline' && (
           <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
             <WifiOff size={16} />
             <span className="text-xs font-bold uppercase tracking-wider">Offline</span>
           </div>
        )}
        
        {syncStatus === 'syncing' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
            <RefreshCcw size={16} className="animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Syncing {pendingCount > 0 ? `(${pendingCount})` : ''}</span>
          </div>
        )}

        {syncStatus === 'synced' && (
          <div className="hidden xs:flex items-center gap-1.5 px-2 py-1 text-emerald-600">
             <Wifi size={16} />
             <span className="text-xs font-bold uppercase hidden sm:inline">Online</span>
          </div>
        )}

        {syncStatus === 'error' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full border border-red-100 animate-pulse">
            <CloudOff size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Error</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 lg:pb-0">
      
      {/* 1. TOP BAR (Global Status) */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 px-4 flex items-center justify-between shadow-sm backdrop-blur-md bg-white/90">
        <PushRegistration />
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-slate-900 leading-tight tracking-tight">
              {user?.shopName || 'My Shop'}
            </h1>
            <span className="text-xs text-slate-500 font-bold tracking-wide">
              {user?.phone || 'Desklite Ledger'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative">
          {renderStatusIndicators()}

          {/* Notification bell */}
          <button
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className="relative p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} className="text-slate-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 animate-slideDown">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('notificationsTitle')}</p>
                  <p className="text-sm font-semibold text-slate-900">{notifLoading ? 'Loading...' : `${alerts.length} ${t('recent')}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/dashboard/notifications" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                    {t('viewAllNotifications')}
                  </Link>
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    <Check size={14} />
                    {t('markAllRead')}
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {recentAlerts.length === 0 && (
                  <div className="px-4 py-6 text-sm text-slate-500 text-center">{t('notificationsEmpty')}</div>
                )}
                {recentAlerts.map((alert) => {
                  const isUnread = alert?.id ? !readIds.has(alert.id) : false;
                  return (
                    <div
                      key={alert.id}
                      className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50 cursor-pointer"
                      onClick={() => markAsRead(alert.id)}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1 ${alert.type === 'vendor' ? 'bg-emerald-500' : alert.type === 'stock' ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          {alert.name}
                          {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />}
                        </p>
                        <p className="text-xs text-slate-500">{alert.type === 'stock' ? `Qty ${alert.amount}` : `₹${Number(alert.amount).toLocaleString('en-IN')}`} • {alert.message}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{alert.dueDate ? new Date(alert.dueDate).toLocaleDateString('en-IN') : ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 2. SIDEBAR (Desktop Only) */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 bg-slate-900 text-white pt-16 z-30">
        <div className="flex-1 px-4 py-6 space-y-2">
          {sidebarNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                pathname === item.href 
                  ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 w-full transition-colors"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 3. MAIN CONTENT AREA */}
      <main className="lg:pl-64 pt-16 min-h-screen transition-all duration-200">
        {/* Offline Banner */}
        <OfflineBanner />
        
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
           <InstallPrompt />
           <ErrorBoundary>
             {children}
           </ErrorBoundary>
        </div>
      </main>

      {/* 4. BOTTOM NAVIGATION (Mobile Only) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 safe-bottom">
        <div className="grid grid-cols-4 h-16">
          {mainNavHelp.map((item, idx) => {
            const isActive = item.href ? pathname === item.href : false;
            return item.action ? (
              <button
                key={idx}
                onClick={item.action}
                className="flex flex-col items-center justify-center w-full h-full gap-1 active:bg-slate-50"
              >
                <item.icon size={24} className="text-slate-400" />
                <span className="text-[10px] font-medium text-slate-500">{item.name}</span>
              </button>
            ) : (
              <Link
                key={idx}
                href={item.href}
                className="flex flex-col items-center justify-center w-full h-full gap-1 active:bg-slate-50"
              >
                <div className={`
                  p-1 rounded-lg transition-all duration-200
                  ${isActive ? 'text-blue-600' : 'text-slate-400'}
                `}>
                  <item.icon 
                    size={24} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                <span className={`
                  text-[10px] font-bold tracking-wide transition-colors
                  ${isActive ? 'text-blue-600' : 'text-slate-400'}
                `}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 5. SIDE DRAWER (Mobile 'More' Menu) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
          
          <div className="absolute inset-y-0 right-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col animate-slide-in-right rounded-l-3xl border-l border-white/20 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between relative overflow-hidden">
              {/* Decorative Circle */}
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-600 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

              <div className="flex items-center gap-4 relative z-10">
                <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white font-black text-xl border border-white/10 shadow-inner">
                  {user?.name?.[0] || 'U'}
                </div>
                <div>
                  <p className="font-bold text-lg leading-tight">{user?.name}</p>
                  <p className="text-xs text-slate-400 font-medium capitalize mt-0.5 flex items-center gap-1">
                    <Sparkles size={10} className="text-yellow-500" />
                    {subscription?.plan || 'Free'} Plan
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-4 mt-2">Menu</div>
              {sidebarNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all border ${
                    pathname === item.href 
                      ? 'bg-white text-blue-600 font-bold shadow-md shadow-slate-200/50 border-slate-100 scale-[1.02]' 
                      : 'bg-transparent text-slate-500 font-medium hover:bg-white hover:text-slate-900 hover:shadow-sm border-transparent'
                  }`}
                >
                  <item.icon size={22} className={pathname === item.href ? 'text-blue-600' : 'text-slate-400'} />
                  <span>{item.name}</span>
                </Link>
              ))}
              
              <div className="h-px bg-slate-200 my-6 mx-4" />
              
              <div className="px-2">
                <button 
                  onClick={() => {
                    logout();
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-5 py-4 text-rose-600 font-bold bg-rose-50 hover:bg-rose-100 rounded-2xl transition-colors"
                >
                  <LogOut size={22} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 text-center">
              <p className="text-xs font-bold text-slate-300">Desklite v1.0.0</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
