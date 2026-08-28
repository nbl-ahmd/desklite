'use client';

import { useEffect, useMemo, useState } from 'react';
import { getApiToken } from '@/utils/auth';
import ReportExportMenu from '@/components/ReportExportMenu';

export default function Reports() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [type, setType] = useState('all');

  useEffect(() => { (async () => {
    try { const token = await getApiToken(); const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions?limit=500`, { headers: { Authorization: `Bearer ${token}` } }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Failed to load reports'); setTransactions(Array.isArray(data) ? data : data.data || []); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  })(); }, []);

  const rows = useMemo(() => transactions.filter((item) => type === 'all' || item.type === type), [transactions, type]);
  const total = rows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  if (loading) return <div className="p-6 text-slate-500">Loading reports…</div>;
  return <div className="space-y-5"><div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"><div><h2 className="text-2xl font-black text-slate-900">Expense Reports</h2><p className="text-sm text-slate-500">Export the current expense-tracker view as a PDF or image.</p></div><ReportExportMenu payload={{ kind: 'expenses', type }} title="Expense Report" /></div>{error && <p className="text-sm text-rose-600">{error}</p>}<div className="flex items-center justify-between"><select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold"><option value="all">All records</option><option value="income">Income</option><option value="expense">Expenses</option></select><p className="font-black text-slate-800">₹{total.toLocaleString('en-IN')}</p></div><div className="overflow-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Type</th><th className="p-3 text-right">Amount</th><th className="p-3 text-left">Mode</th><th className="p-3 text-left">Note</th></tr></thead><tbody>{rows.map((tx) => <tr key={tx._id} className="border-t"><td className="p-3">{new Date(tx.date).toLocaleDateString('en-IN')}</td><td className="p-3 capitalize">{tx.type}</td><td className="p-3 text-right font-bold">₹{Number(tx.amount).toLocaleString('en-IN')}</td><td className="p-3 uppercase text-xs">{tx.mode || '-'}</td><td className="p-3">{tx.description || '-'}</td></tr>)}</tbody></table></div></div>;
}
