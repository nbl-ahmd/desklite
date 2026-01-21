'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, LayoutDashboard, PieChart, Tag, CreditCard } from 'lucide-react';

export default function ExpensesLayout({ children }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    // { name: 'Overview', href: '/expenses', icon: LayoutDashboard }, // Should probably link to expenses dashboard logic if different
    { name: 'Tracker', href: '/expenses', icon: CreditCard },
    { name: 'Reports', href: '/expenses/reports', icon: PieChart },
    { name: 'Categories', href: '/expenses/categories', icon: Tag },
  ];

  const isActive = (path) => pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center">
                 <CreditCard className="text-white w-5 h-5" />
              </div>
              <span className="text-lg font-black text-slate-900 tracking-tight">Expense Tracker</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all
                    ${isActive(link.href) 
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}
                  `}
                >
                  <link.icon className="w-4 h-4" />
                  {link.name}
                </Link>
              ))}
              <div className="h-6 w-px bg-slate-200 mx-2" />
              <Link href="/dashboard" className="text-sm font-bold text-slate-500 hover:text-slate-900">
                Back to POS
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                onClick={() => setOpen(!open)} 
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"
              >
                {open ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {open && (
           <div className="md:hidden border-t border-slate-100 bg-white absolute w-full left-0 px-4 py-4 shadow-xl">
            <div className="space-y-2">
               {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl font-bold
                    ${isActive(link.href) 
                      ? 'bg-slate-900 text-white' 
                      : 'text-slate-500 hover:bg-slate-50'}
                  `}
                >
                  <link.icon className="w-5 h-5" />
                  {link.name}
                </Link>
              ))}
               <div className="pt-2 mt-2 border-t border-slate-100">
                <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-500">
                  Back to POS System
                </Link>
               </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto pt-24 px-4 sm:px-6 lg:px-8 animate-fade-in relative z-0">
        {children}
      </main>
      
    </div>
  );
}
