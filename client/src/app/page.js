'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, BarChart3, ShieldCheck, Zap } from 'lucide-react';

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-slate-900 tracking-tight">Desklite</div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Log in
            </Link>
            <Link href="/register" className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-all shadow-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10 mb-8 animate-fade-in">
            v1.0 is now live
          </span>
          <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 tracking-tight mb-8 leading-[1.1]">
            Modern Financial Management for <span className="text-primary-600">Smart Businesses</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Track transactions, manage customer credit, and generate reports with a simple, secure, and blazing fast ledger.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
            <Link href="/register" className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary-600 text-white text-base font-bold hover:bg-primary-700 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2">
              Start Free Trial <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-base font-bold hover:bg-slate-50 transition-all">
              Live Demo
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          {[
            {
              icon: BarChart3,
              title: "Real-time Analytics",
              desc: "Get instant insights into your cash flow with beautiful, interactive charts."
            },
            {
              icon: ShieldCheck,
              title: "Bank-grade Security",
              desc: "Your financial data is encrypted and backed up securely in the cloud."
            },
            {
              icon: Zap,
              title: "Lightning Fast",
              desc: "Optimized for speed. Works offline and syncs automatically when you're back online."
            }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary-600 mb-6 group-hover:scale-110 transition-transform">
                <feature.icon size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Social Proof */}
        <div className="mt-24 text-center">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">Trusted by growing businesses</p>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Placeholders for logos */}
            <div className="text-xl font-bold text-slate-400">Acme Corp</div>
            <div className="text-xl font-bold text-slate-400">Global Tech</div>
            <div className="text-xl font-bold text-slate-400">Nebula</div>
            <div className="text-xl font-bold text-slate-400">FoxRun</div>
          </div>
        </div>
      </div>
    </div>
  );
} 