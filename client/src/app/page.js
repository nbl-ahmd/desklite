'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg bg-white p-10 rounded shadow text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to Ledger Book</h1>
        <p className="mb-8 text-gray-600">A simple SaaS ledger book for small shopkeepers to log transactions and view analytics.</p>
        <div className="flex justify-center gap-4">
          <Link href="/login" className="btn btn-primary">Login</Link>
          <Link href="/register" className="btn btn-secondary">Register</Link>
        </div>
      </div>
    </div>
  );
} 