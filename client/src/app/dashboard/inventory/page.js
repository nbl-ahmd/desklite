'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  X,
  RefreshCcw
} from 'lucide-react';
import { getApiToken } from '@/utils/auth';

export default function InventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState({ lowStockCount: 0, totalStockValue: 0, totalSkus: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterLow, setFilterLow] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    unit: 'pcs',
    purchasePrice: '',
    sellingPrice: '',
    openingStock: '',
    lowStockThreshold: ''
  });
  const [adjusting, setAdjusting] = useState(null);
  const [adjustData, setAdjustData] = useState({
    direction: 'in',
    quantity: 1,
    type: 'adjustment',
    note: '',
    unitCost: ''
  });
  const [adjustingSave, setAdjustingSave] = useState(false);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterLow]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = await getApiToken();
      const params = new URLSearchParams();
      if (filterLow) params.append('lowStock', '1');

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/inventory/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setSummary(data.summary || { lowStockCount: 0, totalStockValue: 0, totalSkus: 0 });
      }
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(term) ||
      (p.sku && p.sku.toLowerCase().includes(term))
    );
  }, [products, search]);

  const resetForm = () => {
    setForm({
      name: '',
      sku: '',
      unit: 'pcs',
      purchasePrice: '',
      sellingPrice: '',
      openingStock: '',
      lowStockThreshold: ''
    });
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      alert('Name is required');
      return;
    }

    try {
      setSaving(true);
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/inventory/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          purchasePrice: Number(form.purchasePrice) || 0,
          sellingPrice: Number(form.sellingPrice) || 0,
          openingStock: Number(form.openingStock) || 0,
          lowStockThreshold: Number(form.lowStockThreshold) || 0
        })
      });

      if (res.ok) {
        setShowForm(false);
        resetForm();
        await fetchProducts();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create product');
      }
    } catch (err) {
      console.error('Create failed', err);
      alert('Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const openAdjust = (product) => {
    setAdjusting(product);
    setAdjustData({ direction: 'in', quantity: 1, type: 'adjustment', note: '', unitCost: '' });
  };

  const handleAdjust = async () => {
    if (!adjusting) return;
    if (!adjustData.quantity || Number(adjustData.quantity) <= 0) {
      alert('Enter a valid quantity');
      return;
    }

    try {
      setAdjustingSave(true);
      const token = await getApiToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/inventory/products/${adjusting._id}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...adjustData,
          quantity: Number(adjustData.quantity),
          unitCost: Number(adjustData.unitCost) || 0
        })
      });

      if (res.ok) {
        setAdjusting(null);
        await fetchProducts();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to adjust stock');
      }
    } catch (err) {
      console.error('Adjust failed', err);
      alert('Failed to adjust stock');
    } finally {
      setAdjustingSave(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Inventory</p>
            <h1 className="text-xl font-bold text-gray-900">Products & Stock</h1>
          </div>
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-900 font-semibold"
          >
            Back
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 text-white">
          <p className="text-xs opacity-70 mb-1">SKUs</p>
          <p className="text-2xl font-bold">{summary.totalSkus || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-4 text-white">
          <p className="text-xs opacity-80 mb-1">Low Stock</p>
          <p className="text-2xl font-bold">{summary.lowStockCount || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-4 text-white">
          <p className="text-xs opacity-80 mb-1">Stock Value</p>
          <p className="text-2xl font-bold">₹{(summary.totalStockValue || 0).toFixed(0)}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterLow((v) => !v)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 ${
              filterLow ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-gray-200 text-gray-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Low stock only
          </button>
          <button
            onClick={fetchProducts}
            className="px-3 py-2 rounded-lg text-sm font-semibold border-2 border-gray-200 text-gray-700 flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No products yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium"
            >
              Add Product
            </button>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isLow = product.lowStockThreshold > 0 && product.stock <= product.lowStockThreshold;
            return (
              <div
                key={product._id}
                className={`bg-white rounded-lg p-4 border-2 ${isLow ? 'border-amber-200 bg-amber-50' : 'border-gray-100'} shadow-sm`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-500" />
                      <p className="text-lg font-bold text-gray-900">{product.name}</p>
                    </div>
                    <p className="text-sm text-gray-600">SKU: {product.sku || '—'} • Unit: {product.unit || 'pcs'}</p>
                    <p className="text-sm text-gray-600">Cost ₹{product.purchasePrice || 0} • Sell ₹{product.sellingPrice || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{product.stock || 0}</p>
                    {isLow ? (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">Low stock</span>
                    ) : (
                      <span className="text-xs text-gray-500">Threshold {product.lowStockThreshold || 0}</span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {product.lastRestockedAt && <span>Restocked {new Date(product.lastRestockedAt).toLocaleDateString('en-IN')}</span>}
                    {product.lastSoldAt && <span>• Sold {new Date(product.lastSoldAt).toLocaleDateString('en-IN')}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openAdjust(product)}
                      className="px-3 py-1.5 rounded-lg border-2 border-gray-200 text-sm font-semibold text-gray-700 flex items-center gap-1"
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                      Adjust
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating button */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center z-20"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-30 flex items-end sm:items-center sm:justify-center">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">New product</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                  placeholder="Milk packet"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">SKU</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Unit</label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                  placeholder="pcs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Cost Price</label>
                <input
                  type="number"
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Selling Price</label>
                <input
                  type="number"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Opening Stock</label>
                <input
                  type="number"
                  value={form.openingStock}
                  onChange={(e) => setForm({ ...form, openingStock: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Low Stock Alert At</label>
                <input
                  type="number"
                  value={form.lowStockThreshold}
                  onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                  placeholder="5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 rounded-lg border-2 border-gray-200 text-gray-700 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjusting && (
        <div className="fixed inset-0 bg-black/40 z-30 flex items-end sm:items-center sm:justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Adjust stock for</p>
                <h2 className="text-lg font-bold text-gray-900">{adjusting.name}</h2>
              </div>
              <button onClick={() => setAdjusting(null)} className="p-2 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Direction</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAdjustData({ ...adjustData, direction: 'in' })}
                    className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-semibold flex items-center gap-2 justify-center ${
                      adjustData.direction === 'in'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    Add
                  </button>
                  <button
                    onClick={() => setAdjustData({ ...adjustData, direction: 'out' })}
                    className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-semibold flex items-center gap-2 justify-center ${
                      adjustData.direction === 'out'
                        ? 'border-rose-200 bg-rose-50 text-rose-800'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    <ArrowDownCircle className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Quantity</label>
                <input
                  type="number"
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Note</label>
                <input
                  type="text"
                  value={adjustData.note}
                  onChange={(e) => setAdjustData({ ...adjustData, note: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                  placeholder="Reason"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Unit Cost (optional)</label>
                <input
                  type="number"
                  value={adjustData.unitCost}
                  onChange={(e) => setAdjustData({ ...adjustData, unitCost: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setAdjusting(null)}
                className="px-4 py-2 rounded-lg border-2 border-gray-200 text-gray-700 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjust}
                disabled={adjustingSave}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50"
              >
                {adjustingSave ? 'Updating...' : 'Save Movement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
