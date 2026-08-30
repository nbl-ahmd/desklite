'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ledger } from '@/lib/api';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import ReportExportMenu from '@/components/ReportExportMenu';

const ranges = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

export default function ReportsSummaryPage() {
  const { status } = useSession();
  const [range, setRange] = useState('daily');
  const [data, setData] = useState([]);
  const [modeData, setModeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, modeRes] = await Promise.all([
        ledger.summary({ range }),
        ledger.modeSplit({})
      ]);
      setData(summaryRes.data.data || []);
      setModeData(modeRes.data.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, range]);

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports Dashboard</h1>
            <p className="text-sm text-gray-600">Summaries by period and payment mode</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ReportExportMenu payload={{ kind: 'transactions' }} title="Reports Dashboard" />
            {ranges.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border ${range === r.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={load}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Refresh
            </button>
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">{range.charAt(0).toUpperCase() + range.slice(1)} Totals</h3>
            <div className="space-y-3">
              {data.map((row) => (
                <div key={row._id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                  <div className="text-sm text-gray-700">{format(new Date(row._id), range === 'monthly' ? 'MMM yyyy' : range === 'weekly' ? 'wo yyyy' : 'dd MMM')}</div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-emerald-700 font-semibold">+₹{row.income?.toFixed(2)}</span>
                    <span className="text-rose-700 font-semibold">-₹{row.expense?.toFixed(2)}</span>
                    <span className="font-bold text-gray-900">₹{row.total?.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {!data.length && <p className="text-sm text-gray-500">No data</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Mode Split (Cash / UPI / Credit)</h3>
            <div className="space-y-3">
              {modeData.map((row) => (
                <div key={row._id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                  <div className="text-sm uppercase text-gray-700">{row._id}</div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-emerald-700 font-semibold">Inflow ₹{row.inflow?.toFixed(2)}</span>
                    <span className="text-rose-700 font-semibold">Outflow ₹{row.outflow?.toFixed(2)}</span>
                    <span className={`font-bold ${row.net >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>Net ₹{row.net?.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {!modeData.length && <p className="text-sm text-gray-500">No data</p>}
            </div>
          </div>
        </div>
      </div>
  );
}
