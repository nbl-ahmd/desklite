'use client';

import { useEffect, useMemo, useState } from 'react';
import { getApiToken } from '@/utils/auth';
import ReportExportMenu from '@/components/ReportExportMenu';
import { CalendarDays, Check, Plus, Save, Trash2, X } from 'lucide-react';

const apiUrl = () => `${process.env.NEXT_PUBLIC_API_URL}/api/expense-splits`;
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getSettlementMaps = (result) => {
  const moves = [...(result?.combinedSettlements || []), ...(result?.fundAllocations || []), ...(result?.settlements || [])];
  const incoming = new Map();
  const outgoing = new Map();

  moves.forEach((move) => {
    const amount = Number(move.amount || 0);
    if (!amount) return;
    if (move.to) incoming.set(move.to, (incoming.get(move.to) || 0) + amount);
    if (move.from) outgoing.set(move.from, (outgoing.get(move.from) || 0) + amount);
  });

  return { incoming, outgoing };
};

export default function ExpenseSplitPage() {
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
  const [incomeSourceMode, setIncomeSourceMode] = useState('all');
  const settlementMaps = result ? getSettlementMaps(result) : { incoming: new Map(), outgoing: new Map() };

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
      const allSources = data.sources || [];
      const filteredSources = allSources.filter((source) => {
        if (source.type !== 'income') return true;
        if (incomeSourceMode === 'bills') {
          return source.kind === 'bill-item' || source.kind === 'bill-charge';
        }
        return true;
      });

      setSources(filteredSources);

      if (!keepSelection) {
        const validIds = new Set(filteredSources.map((s) => s.id));
        setSelected(new Set([...validIds]));
        setFundSources(new Set());
        setParticipants((data.participants || []).map((p) => ({ ...p, quantity: 1, enabled: true })));
      } else {
        const validIds = new Set(filteredSources.map((s) => s.id));
        setSelected((current) => new Set([...current].filter((id) => validIds.has(id))));
        setFundSources((current) => new Set([...current].filter((id) => validIds.has(id))));
      }
      setResult(null);
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadSources();
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedSources = useMemo(() => sources.filter((source) => selected.has(source.id)), [sources, selected]);

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
      const sourceData = await request(`/sources?from=${new Date(data.from).toISOString()}&to=${new Date(data.to).toISOString()}`); setSources(sourceData.sources || []);
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  const removeSaved = async (id) => {
    if (!window.confirm('Delete this saved split?')) return;
    try { await request(`/${id}`, { method: 'DELETE' }); if (currentId === id) setCurrentId(null); await loadSaved(); } catch (error) { setMessage(error.message); }
  };

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
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"><div className="flex items-center gap-2 text-sm font-black text-slate-700 mb-3"><CalendarDays size={18} /> Date range</div><div className="flex flex-col sm:flex-row gap-3"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="flex-1 bg-slate-50 rounded-xl px-4 py-3 font-bold" /><span className="hidden sm:flex items-center text-slate-400">to</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 bg-slate-50 rounded-xl px-4 py-3 font-bold" /><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><label className="text-xs font-bold uppercase tracking-wide text-slate-500">Income</label><select value={incomeSourceMode} onChange={(e) => setIncomeSourceMode(e.target.value)} className="bg-transparent px-1 py-3 text-sm font-bold text-slate-700 outline-none"><option value="all">All</option><option value="bills">Bills only</option></select></div><button onClick={() => loadSources()} disabled={loading} className="px-4 py-3 rounded-xl bg-slate-100 font-bold">Load records</button></div></div>
    <div className="grid lg:grid-cols-2 gap-6">{sourceSection('income', 'Income and bill items', 'bg-emerald-500')}{sourceSection('expense', 'Expenses', 'bg-rose-500')}</div>
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5"><div className="flex items-center justify-between mb-4"><div><h2 className="font-black text-slate-900">Families / participants</h2><p className="text-xs text-slate-400">Quantity controls each participant’s share. Disabled people are excluded.</p></div><button onClick={addParticipant} className="flex items-center gap-1 text-sm font-bold text-blue-600"><Plus size={16} /> Add</button></div><div className="space-y-3">{participants.map((p, index) => <div key={`${p.name}-${index}`} className={`grid grid-cols-[44px_minmax(0,1fr)_84px_44px] gap-2 ${p.enabled === false ? 'opacity-50' : ''}`}><button onClick={() => updateParticipant(index, 'enabled', p.enabled === false)} className={`h-11 rounded-xl flex items-center justify-center ${p.enabled === false ? 'bg-slate-200 text-slate-400' : 'bg-emerald-100 text-emerald-700'}`} title="Enable or disable participant">{p.enabled === false ? <X size={17} /> : <Check size={17} />}</button><input value={p.name} onChange={(e) => updateParticipant(index, 'name', e.target.value)} placeholder="Family or person" className="min-w-0 bg-slate-50 rounded-xl px-4 py-3 font-bold" /><input type="number" min="0" step="1" value={p.quantity} onChange={(e) => updateParticipant(index, 'quantity', e.target.value)} className="bg-slate-50 rounded-xl px-3 py-3 font-bold text-center" title="Quantity" /><button onClick={() => removeParticipant(index)} className="h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><Trash2 size={18} /></button></div>)}</div><div className="mt-5 pt-5 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center"><label className="text-sm font-bold text-slate-600">Shared fund treatment</label><select value={groupFundMode} onChange={(e) => setGroupFundMode(e.target.value)} className="bg-slate-50 rounded-xl px-4 py-3 font-bold"><option value="participant">Show full family balance</option><option value="offset">Reduce split expense</option></select><span className="text-xs text-slate-400">Marked income is treated as the shared trip fund.</span></div></div>
    {result && (
      <div className="space-y-6">
        <div className="bg-slate-950 rounded-[28px] p-4 sm:p-6 text-white shadow-xl overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-black">Split result</h2>
              <p className="text-slate-400 text-sm">{result.selectedSourceCount} selected records · {result.reconciliation === 0 ? 'Reconciled' : 'Review rounding'}{result.reconciliation !== 0 ? ` · pending ${money(Math.abs(result.reconciliation))}` : ''}</p>
            </div>
            {currentId ? <ReportExportMenu payload={{ kind: 'split', splitId: currentId }} title={title || 'Expense Split'} tone="dark" /> : <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-slate-300">Save the split to enable PDF and image sharing.</div>}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[['Expenses', result.totalExpenses], ['Income', result.totalIncome], ['Fund balance', result.groupFundBeforeReimbursement ?? result.groupFund], ['To receive', [...settlementMaps.incoming.values()].reduce((sum, value) => sum + value, 0)], ['Quantity', result.totalQuantity]].map(([label, value]) => (
              <div key={label} className="bg-white/10 rounded-2xl p-3 sm:p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
                <p className="font-black mt-1 text-lg break-words">{label === 'Quantity' ? value : money(value)}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
            <span>Total received: <b className="text-white">{money([...settlementMaps.incoming.values()].reduce((sum, value) => sum + value, 0))}</b></span>
            <span>Total paid: <b className="text-white">{money([...settlementMaps.outgoing.values()].reduce((sum, value) => sum + value, 0))}</b></span>
            <span>Pending: <b className="text-white">{money(Math.abs(result.reconciliation || 0))}</b></span>
          </div>

          <div className="space-y-3">
            {result.participants.map((p) => {
              const personalSpend = Number(p.personalExpense || 0);
              const directPaid = Math.max(0, Number(p.paid || 0) - personalSpend);
              const receiveAmount = Number(settlementMaps.incoming.get(p.name) || 0);
              const payAmount = Number(settlementMaps.outgoing.get(p.name) || 0);
              const pendingAmount = p.balance > 0 ? Math.max(0, Number(p.balance || 0) - receiveAmount) : 0;
              const info = [
                `${p.quantity} qty`,
                personalSpend > 0 ? `paid ${money(directPaid)} + spend ${money(personalSpend)}` : `paid ${money(p.paid)}`,
                `share ${money(p.fairShare)}`,
              ].filter(Boolean).join(' · ');

              return (
                <div key={p.name} className="bg-white/10 rounded-2xl px-4 py-4 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-black text-lg truncate">{p.name}</div>
                    <div className="text-sm text-slate-400 mt-1">{info}</div>
                  </div>
                  <div className="text-xl font-black md:text-right">
                    {receiveAmount > 0 && <span className="text-emerald-400 block">Receives {money(receiveAmount)}</span>}
                    {pendingAmount > 0 && <span className="text-amber-300 block text-sm font-bold">Pending {money(pendingAmount)}</span>}
                    {p.balance < 0 && <span className="text-rose-400 block">Pays {money(payAmount || Math.abs(Number(p.balance || 0)))}</span>}
                    {receiveAmount === 0 && pendingAmount === 0 && p.balance >= 0 && <span className="text-slate-300 block">Settled</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5"><h2 className="font-black text-slate-900 mb-3">Saved splits</h2><div className="flex gap-2 mb-4"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Split title, e.g. Family trip" className="flex-1 bg-slate-50 rounded-xl px-4 py-3 font-bold" /></div>{savedSplits.length === 0 ? <p className="text-sm text-slate-400">No saved splits yet.</p> : <div className="space-y-2">{savedSplits.map((split) => <div key={split._id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50"><button onClick={() => openSaved(split._id)} className="flex-1 text-left"><p className="font-bold text-slate-800">{split.title}</p><p className="text-xs text-slate-400">{new Date(split.from).toLocaleDateString('en-IN')} – {new Date(split.to).toLocaleDateString('en-IN')}</p></button><button onClick={() => removeSaved(split._id)} className="p-2 text-rose-500"><Trash2 size={17} /></button></div>)}</div>}</div>
  </div>;
}
