'use client';

import { useEffect, useState } from 'react';
import { getApiToken } from '@/utils/auth';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');

  const fetchCategories = async () => {
    try {
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCategories(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    try {
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`, {
        method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name, type })
      });
      const created = await res.json();
      setCategories(c => [created, ...c]);
      setName('');
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input className="flex-1 p-2 border rounded" value={name} onChange={e => setName(e.target.value)} placeholder="Category name" />
        <select value={type} onChange={e => setType(e.target.value)} className="p-2 border rounded">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <button onClick={create} className="px-3 py-2 bg-primary-600 text-white rounded">Add</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {categories.map(c => (
          <div key={c._id} className="p-2 bg-white rounded shadow">{c.name} <span className="text-xs text-gray-500">{c.type}</span></div>
        ))}
      </div>
    </div>
  );
}
