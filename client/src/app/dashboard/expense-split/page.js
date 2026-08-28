'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getApiToken } from '@/utils/auth';
import { useSubscription } from '@/contexts/SubscriptionContext';
import ReportExportMenu from '@/components/ReportExportMenu';
import { CalendarDays, Check, Download, Plus, Save, Trash2, X } from 'lucide-react';

const apiUrl = () => `${process.env.NEXT_PUBLIC_API_URL}/api/expense-splits`;
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ExpenseSplitPage() {
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const [from, setFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [sources, setSources] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [fundSources, setFundSources] = useState(new Set());
  const [participants, setParticipants] = useState([]);
  const [groupFundMode, setGroupFundMode] = useState('participant');
  const [title, setTitle] = useState('');
  const [result, setResult] = useState(null);
  const [savedSplits, setSavedSplits] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const enabled = subscription?.features?.expenseSplitting?.enabled === true;

  const request = async (path, options = {}) => {
    const token = await getApiToken();
    const response = await fetch(`${apiUrl()}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Request failed');
    return body;
  };

  const loadSaved = async () => {
    try { setSavedSplits(await request('')); } catch (error) { setMessage(error.message); }
  };

  const loadSources = async (keepSelection = false) => {
    setLoading(true); setMessage('');
    try {
      const data = await request(`/sources?from=${from}&to=${to}`);
      setSources(data.sources || []);
      if (!keepSelection) setSelected(new Set((data.sources || []).map((s) => s.id)));
      if (!keepSelection) setFundSources(new Set());
      if (!keepSelection) setParticipants((data.participants || []).map((p) => ({ ...p, quantity: 1, enabled: true })));
      setResult(null);
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!subscriptionLoading && !enabled) return;
    if (!subscriptionLoading && enabled) { loadSources(); loadSaved(); }
    // The subscription context is the access gate; initial loading should not fetch prematurely.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionLoading, enabled]);

  const selectedSources = useMemo(() => sources.filter((source) => selected.has(source.id)), [sources, selected]);
  const selectedExpenses = selectedSources.filter((s) => s.type === 'expense');

  const updateParticipant = (index, field, value) => setParticipants((items) => items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  const removeParticipant = (index) => setParticipants((items) => items.filter((_, i) => i !== index));
  const addParticipant = () => setParticipants((items) => [...items, { name: '', quantity: 1, enabled: true, referenceId: null }]);
  const toggleSource = (id) => setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleFund = (id) => setFundSources((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const selectAll = (type, value) => setSelected((current) => { const next = new Set(current); sources.filter((s) => s.type === type).forEach((s) => value ? next.add(s.id) : next.delete(s.id)); return next; });

  const calculationPayload = () => ({
    title: title || 'Expense split', from, to, selectedSourceIds: [...selected], fundSourceIds: [...fundSources], groupFundMode,
    participants: participants.map((p) => ({ ...p, quantity: Number(p.quantity) || 0 }))
  });

  const calculate = async () => {
    setLoading(true); setMessage('');
    try { setResult(await request('/calculate', { method: 'POST', body: JSON.stringify(calculationPayload()) })); }
    catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  const save = async () => {
    setLoading(true); setMessage('');
    try {
      const data = await request(currentId ? `/${currentId}` : '', { method: currentId ? 'PUT' : 'POST', body: JSON.stringify(calculationPayload()) });
      setCurrentId(data._id); setResult(data.calculation); setTitle(data.title); setMessage('Split saved'); await loadSaved();
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  const openSaved = async (id) => {
    setLoading(true);
    try {
      const data = await request(`/${id}`);
      setCurrentId(data._id); setTitle(data.title); setFrom(new Date(data.from).toISOString().slice(0, 10)); setTo(new Date(data.to).toISOString().slice(0, 10)); setSelected(new Set(data.selectedSourceIds)); setFundSources(new Set(data.fundSourceIds)); setGroupFundMode(data.groupFundMode); setParticipants(data.participants); setResult(data.calculation);
      // Source refresh is explicit so saved selections remain authoritative.
      const sourceData = await request(`/sources?from=${new Date(data.from).toISOString()}&to=${new Date(data.to).toISOString()}`); setSources(sourceData.sources || []);
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  const removeSaved = async (id) => {
    if (!window.confirm('Delete this saved split?')) return;
    try { await request(`/${id}`, { method: 'DELETE' }); if (currentId === id) setCurrentId(null); await loadSaved(); } catch (error) { setMessage(error.message); }
  };

  const exportPdf = async () => {
    if (!currentId) setMessage('Save this split to enable production exports and sharing.');
  };

  if (subscriptionLoading) return <div className="p-10 text-center">Loading feature access…</div>;
  if (!enabled) return <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 text-center shadow-sm"><h1 className="text-2xl font-black text-slate-900">Expense splitting is disabled</h1><p className="text-slate-500 mt-2">Enable it from Settings on a Pro or Premium plan.</p><Link href="/dashboard/settings" className="inline-flex mt-6 px-5 py-3 rounded-xl bg-slate-900 text-white font-bold">Open Settings</Link></div>;

  const sourceSection = (type, label, color) => {
    const rows = sources.filter((s) => s.type === type);
    return <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"><div><h2 className="font-black text-slate-900">{label}</h2><p className="text-xs text-slate-400">{rows.length} records · {money(rows.filter((s) => selected.has(s.id)).reduce((sum, s) => sum + s.amount, 0))} selected</p></div><div className="flex gap-2"><button onClick={() => selectAll(type, true)} className="text-xs font-bold text-blue-600">All</button><button onClick={() => selectAll(type, false)} className="text-xs font-bold text-slate-400">None</button></div></div>
      <div className="divide-y divide-slate-100">{rows.map((source) => <div key={source.id} className={`px-5 py-4 flex items-center gap-3 ${selected.has(source.id) ? '' : 'opacity-50'}`}><button onClick={() => toggleSource(source.id)} className={`w-6 h-6 rounded-lg border flex items-center justify-center ${selected.has(source.id) ? `${color} text-white border-transparent` : 'border-slate-300'}`}>{selected.has(source.id) && <Check size={15} />}</button><div className="flex-1 min-w-0"><p className="font-bold text-slate-800 truncate">{source.description}</p><p className="text-xs text-slate-400">{new Date(source.date).toLocaleDateString('en-IN')} {source.name ? `· ${source.name}` : ''} {source.mode ? `· ${source.mode.toUpperCase()}` : ''}</p></div><div className="text-right"><p className={`font-black ${type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>{money(source.amount)}</p>{type === 'income' && selected.has(source.id) && <button onClick={() => toggleFund(source.id)} className={`text-[10px] font-bold ${fundSources.has(source.id) ? 'text-purple-700' : 'text-slate-400'}`}>{fundSources.has(source.id) ? 'Group fund' : 'Mark as fund'}</button>}</div></div>)}</div>
      {rows.length === 0 && <p className="p-6 text-sm text-slate-400">No {label.toLowerCase()} in this range.</p>}
    </section>;
  };

  return <div className="space-y-6 pb-24">
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"><div><h1 className="text-3xl font-black text-slate-900 tracking-tight">Expense Splitting</h1><p className="text-slate-500 font-bold mt-1">Select the trip records and settle each family fairly.</p></div><div className="flex gap-2"><button onClick={calculate} disabled={loading} className="px-4 py-3 rounded-xl bg-blue-600 text-white font-bold">Calculate</button><button onClick={save} disabled={loading} className="px-4 py-3 rounded-xl bg-slate-900 text-white font-bold flex gap-2 items-center"><Save size={17} /> Save</button></div></div>
    {message && <div className="px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm">{message}</div>}
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"><div className="flex items-center gap-2 text-sm font-black text-slate-700 mb-3"><CalendarDays size={18} /> Date range</div><div className="flex flex-col sm:flex-row gap-3"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="flex-1 bg-slate-50 rounded-xl px-4 py-3 font-bold" /><span className="hidden sm:flex items-center text-slate-400">to</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 bg-slate-50 rounded-xl px-4 py-3 font-bold" /><button onClick={() => loadSources()} disabled={loading} className="px-4 py-3 rounded-xl bg-slate-100 font-bold">Load records</button></div></div>
    <div className="grid lg:grid-cols-2 gap-6">{sourceSection('income', 'Income and bill items', 'bg-emerald-500')}{sourceSection('expense', 'Expenses', 'bg-rose-500')}</div>
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5"><div className="flex items-center justify-between mb-4"><div><h2 className="font-black text-slate-900">Families / participants</h2><p className="text-xs text-slate-400">Quantity controls each participant’s share. Disabled people are excluded.</p></div><button onClick={addParticipant} className="flex items-center gap-1 text-sm font-bold text-blue-600"><Plus size={16} /> Add</button></div><div className="space-y-3">{participants.map((p, index) => <div key={`${p.name}-${index}`} className={`flex gap-2 ${p.enabled === false ? 'opacity-50' : ''}`}><button onClick={() => updateParticipant(index, 'enabled', p.enabled === false)} className={`w-11 rounded-xl flex items-center justify-center ${p.enabled === false ? 'bg-slate-200 text-slate-400' : 'bg-emerald-100 text-emerald-700'}`} title="Enable or disable participant">{p.enabled === false ? <X size={17} /> : <Check size={17} />}</button><input value={p.name} onChange={(e) => updateParticipant(index, 'name', e.target.value)} placeholder="Family or person" className="flex-1 bg-slate-50 rounded-xl px-4 py-3 font-bold" /><input type="number" min="0" step="1" value={p.quantity} onChange={(e) => updateParticipant(index, 'quantity', e.target.value)} className="w-24 bg-slate-50 rounded-xl px-3 py-3 font-bold text-center" title="Quantity" /><button onClick={() => removeParticipant(index)} className="p-3 rounded-xl bg-rose-50 text-rose-600"><Trash2 size={18} /></button></div>)}</div><div className="mt-5 pt-5 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center"><label className="text-sm font-bold text-slate-600">Group fund treatment</label><select value={groupFundMode} onChange={(e) => setGroupFundMode(e.target.value)} className="bg-slate-50 rounded-xl px-4 py-3 font-bold"><option value="participant">Fund-first reimbursement</option><option value="offset">Fund offsets expenses</option></select><span className="text-xs text-slate-400">Mark selected income rows as Group fund above.</span></div></div>
    {result && <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl"><div className="flex flex-col sm:flex-row justify-between gap-3 mb-5"><div><h2 className="text-xl font-black">Split result</h2><p className="text-slate-400 text-sm">{result.selectedSourceCount} selected records · {result.reconciliation === 0 ? 'Reconciled' : 'Review rounding'}</p></div><button onClick={exportPdf} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-sm"><Download size={16} /> PDF</button></div><div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">{[['Expenses', result.totalExpenses], ['Income', result.totalIncome], ['Fund', result.groupFund], ['Per person', result.costPerPerson], ['Quantity', result.totalQuantity]].map(([label, value]) => <div key={label} className="bg-white/10 rounded-2xl p-3"><p className="text-xs text-slate-400">{label}</p><p className="font-black mt-1">{label === 'Quantity' ? value : money(value)}</p></div>)}</div><div className="space-y-2">{result.participants.map((p) => <div key={p.name} className="bg-white/10 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1"><div><span className="font-black">{p.name}</span><span className="text-xs text-slate-400 ml-2">{p.quantity} qty · paid {money(p.paid)} · share {money(p.fairShare)}</span></div><span className={p.balance >= 0 ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>{p.balance >= 0 ? `Receives ${money(p.balance)}` : `Pays ${money(Math.abs(p.balance))}`}</span></div>)}</div><h3 className="font-black mt-6 mb-2">Settlement transfers</h3>{result.settlements.length ? result.settlements.map((s, i) => <div key={i} className="flex items-center gap-2 text-sm py-2"><span className="font-bold">{s.from}</span><span className="text-slate-400">pays</span><span className="font-bold">{s.to}</span><span className="ml-auto text-emerald-300 font-black">{money(s.amount)}</span></div>) : <p className="text-slate-400 text-sm">No family-to-family transfer is required.</p>}</div>}
    {result && currentId && <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="mb-3 font-black text-slate-900">Download or share split</h2><ReportExportMenu payload={{ kind: 'split', splitId: currentId }} title={title || 'Expense Split'} /></div>}
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5"><h2 className="font-black text-slate-900 mb-3">Saved splits</h2><div className="flex gap-2 mb-4"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Split title, e.g. Family trip" className="flex-1 bg-slate-50 rounded-xl px-4 py-3 font-bold" /></div>{savedSplits.length === 0 ? <p className="text-sm text-slate-400">No saved splits yet.</p> : <div className="space-y-2">{savedSplits.map((split) => <div key={split._id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50"><button onClick={() => openSaved(split._id)} className="flex-1 text-left"><p className="font-bold text-slate-800">{split.title}</p><p className="text-xs text-slate-400">{new Date(split.from).toLocaleDateString('en-IN')} – {new Date(split.to).toLocaleDateString('en-IN')}</p></button><button onClick={() => removeSaved(split._id)} className="p-2 text-rose-500"><Trash2 size={17} /></button></div>)}</div>}</div>
  </div>;
}
