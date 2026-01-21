'use client';

import { useEffect, useState } from 'react';
import { getApiToken } from '@/utils/auth';

export default function Reports() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      setError(err.message || 'Error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  if (loading) return <div>Loading transactions...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Reports</h2>
        <button
          onClick={() => {
            // simple client-side CSV export
            const rows = transactions.map(t => [new Date(t.date).toLocaleString(), t.type, t.amount, t.mode || '-', t.description || '']);
            const csv = ['Date,Type,Amount,Mode,Note', ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'transactions.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-3 py-1 bg-primary-600 text-white rounded"
        >Export CSV</button>
      </div>

      <div className="overflow-auto border rounded max-h-96">
        <table className="min-w-full">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2 text-left">Mode</th>
              <th className="p-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx._id} className="border-t">
                <td className="p-2">{new Date(tx.date).toLocaleString()}</td>
                <td className="p-2">{tx.type}</td>
                <td className="p-2 text-right">{tx.amount}</td>
                <td className="p-2">{tx.mode || '-'}</td>
                <td className="p-2">{tx.description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}