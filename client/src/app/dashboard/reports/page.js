'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { getApiToken } from '@/utils/auth';
import ReportExportMenu from '@/components/ReportExportMenu';
import { BarChart3, ExternalLink, ReceiptText } from 'lucide-react';

const rangeFor = (range) => {
  const now = new Date();
  if (range === 'today') return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
  if (range === 'week') return { from: startOfDay(subDays(now, 7)).toISOString(), to: endOfDay(now).toISOString() };
  if (range === 'month') return { from: startOfDay(subDays(now, 30)).toISOString(), to: endOfDay(now).toISOString() };
  return { from: undefined, to: undefined };
};

export default function ReportsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [transactions, setTransactions] = useState([]);
  const [mode, setMode] = useState('all');
  const [dateRange, setDateRange] = useState('month');
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status !== 'authenticated') return;
    (async () => {
      try {
        const token = await getApiToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions?limit=500`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load transactions');
        setTransactions(Array.isArray(data) ? data : data.data || []);
      } catch (err) { setError(err.message); }
    })();
  }, [status, router]);

  const filtered = useMemo(() => {
    const { from, to } = rangeFor(dateRange);
    return transactions.filter((item) => (!mode || mode === 'all' || item.mode === mode) && (!from || (new Date(item.date) >= new Date(from) && new Date(item.date) <= new Date(to))));
  }, [transactions, mode, dateRange]);
  const totals = useMemo(() => filtered.reduce((acc, item) => ({ ...acc, [item.type]: acc[item.type] + Number(item.amount || 0) }), { income: 0, expense: 0 }), [filtered]);
  const exportPayload = { kind: 'transactions', mode, ...rangeFor(dateRange) };

  return <div className="space-y-6 pb-24">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"><div><h1 className="text-3xl font-black text-slate-900">Financial Reports</h1><p className="mt-1 font-medium text-slate-500">Download or share a polished report for the active filters.</p></div><ReportExportMenu payload={exportPayload} title="Financial Report" /></div>
    {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
    <div className="flex flex-wrap gap-2"><select value={dateRange} onChange={(event) => setDateRange(event.target.value)} className="rounded-xl bg-white border border-slate-200 px-4 py-3 font-bold"><option value="today">Today</option><option value="week">Last 7 days</option><option value="month">Last 30 days</option><option value="all">All time</option></select><select value={mode} onChange={(event) => setMode(event.target.value)} className="rounded-xl bg-white border border-slate-200 px-4 py-3 font-bold"><option value="all">All payment modes</option><option value="cash">Cash</option><option value="upi">UPI</option><option value="credit">Credit</option></select><Link href="/dashboard/expense-split" className="inline-flex items-center gap-2 rounded-xl bg-purple-100 px-4 py-3 font-bold text-purple-700"><ReceiptText size={17} /> Expense splitting <ExternalLink size={15} /></Link></div>
    <div className="grid gap-4 sm:grid-cols-3"><Metric label="Income" value={totals.income} tone="emerald" /><Metric label="Expenses" value={totals.expense} tone="rose" /><Metric label="Net balance" value={totals.income - totals.expense} tone="blue" /></div>
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4"><BarChart3 className="text-blue-600" /><div><h2 className="font-black text-slate-900">Transaction details</h2><p className="text-xs text-slate-400">{filtered.length} records in this view</p></div></div><div className="max-h-[520px] overflow-auto"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-4">Date</th><th className="p-4">Type</th><th className="p-4">Person / note</th><th className="p-4">Mode</th><th className="p-4 text-right">Amount</th></tr></thead><tbody>{filtered.map((item) => <tr key={item._id} className="border-t border-slate-50"><td className="p-4 font-medium">{format(new Date(item.date), 'dd MMM yyyy')}</td><td className="p-4 capitalize">{item.type}</td><td className="p-4 text-slate-600">{item.customerName || item.description || '-'}</td><td className="p-4 uppercase text-xs font-bold text-slate-500">{item.mode || '-'}</td><td className={`p-4 text-right font-black ${item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>{item.type === 'income' ? '+' : '-'}₹{Number(item.amount).toLocaleString('en-IN')}</td></tr>)}{!filtered.length && <tr><td colSpan="5" className="p-10 text-center text-slate-400">No transactions found for these filters.</td></tr>}</tbody></table></div></section>
  </div>;
}

function Metric({ label, value, tone }) { return <div className={`rounded-3xl p-6 text-white shadow-lg ${tone === 'emerald' ? 'bg-emerald-600' : tone === 'rose' ? 'bg-rose-600' : 'bg-slate-900'}`}><p className="text-sm font-bold opacity-75">{label}</p><p className="mt-2 text-3xl font-black">₹{Number(value).toLocaleString('en-IN')}</p></div>; }
