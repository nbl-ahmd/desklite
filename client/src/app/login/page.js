'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { LogIn, User, Lock, Loader2 } from 'lucide-react';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Card from '@/components/Card';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        ...formData,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error || 'Login failed. Please try again.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('Login error', err);
      setError('Unable to sign in. Please check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-slate-900 z-0"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Desklite
          </h1>
          <p className="text-slate-300 text-sm font-medium">Professional Ledger for Modern Business</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-none">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-1">Please enter your credentials to access your dashboard.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Username"
              icon={User}
              type="text"
              placeholder="Enter your username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              disabled={loading}
            />

            <Input
              label="Password"
              icon={Lock}
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={loading}
            />

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-fade-in">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3"
              isLoading={loading}
              icon={LogIn}
            >
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-bold text-primary-600 hover:text-primary-700 transition-colors">
              Create an account
            </Link>
          </p>
        </Card>
        
        <div className="mt-8 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Desklite. Secure & Private.
        </div>
      </div>
    </div>
  );
}
