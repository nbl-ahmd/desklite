'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { getApiToken } from '@/utils/auth';
import {
  ArrowLeft,
  Banknote,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Filter,
  MessageCircle,
  Phone,
  Receipt,
  Store,
  X
} from 'lucide-react';

export default function VendorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { status } = useSession();
  const vendorName = decodeURIComponent(params.name);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    mode: '',
    status: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  const fetchVendorData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getApiToken();
      const queryParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customer-details/vendor/${encodeURIComponent(vendorName)}?${queryParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Failed to fetch vendor details');
      setData(await response.json());
    } catch (err) {
      console.error('Error fetching vendor details:', err);
      setError('Failed to load vendor details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters, vendorName]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchVendorData();
    }
  }, [fetchVendorData, router, status]);

  const applyQuickFilter = (preset) => {
    const today = new Date();

    if (preset === 'unpaid') {
      setFilters((prev) => ({ ...prev, status: 'unpaid', startDate: '', endDate: '' }));
      return;
    }

    if (preset === 'all') {
      setFilters({
        startDate: '',
        endDate: '',
        mode: '',
        status: '',
        sortBy: 'date',
        sortOrder: 'desc'
      });
      return;
    }

    const start = preset === 'thisMonth'
      ? startOfMonth(today)
      : preset === 'lastMonth'
        ? startOfMonth(subMonths(today, 1))
        : subMonths(today, 3);
    const end = preset === 'lastMonth' ? endOfMonth(subMonths(today, 1)) : today;

    setFilters((prev) => ({
      ...prev,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    }));
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 font-medium">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { vendor, summary, transactions, outstandingCredits, monthlyBreakdown } = data;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.back()}
            className="mt-1 p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-emerald-700 font-black text-sm uppercase">
              <Store className="w-4 h-4" />
              Vendor
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">{vendor.name}</h1>
            <p className="text-slate-500 font-bold mt-1">Purchases, payments, and payable balance</p>
          </div>
        </div>

        <div className="flex gap-2">
          {vendor.phone && (
            <>
              <a
                href={`tel:${vendor.phone}`}
                className="p-3 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <Phone className="w-5 h-5" />
              </a>
              <a
                href={`https://wa.me/${vendor.phone}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl bg-green-500 text-white hover:bg-green-600 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Expense" value={summary.totalExpense} icon={Receipt} tone="slate" />
        <SummaryCard label="Payable" value={summary.netPayable} icon={Clock} tone="rose" />
        <SummaryCard label="Cash" value={summary.totalCash} icon={Banknote} tone="emerald" />
        <SummaryCard label="UPI" value={summary.totalUPI} icon={CreditCard} tone="indigo" />
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900">Filters</h3>
            <p className="text-sm font-semibold text-slate-500">{transactions.length} transactions shown</p>
          </div>
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center gap-2"
          >
            {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
            {showFilters ? 'Close' : 'Filter'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <QuickButton label="This month" onClick={() => applyQuickFilter('thisMonth')} />
          <QuickButton label="Last month" onClick={() => applyQuickFilter('lastMonth')} />
          <QuickButton label="Last 3 months" onClick={() => applyQuickFilter('last3Months')} />
          <QuickButton label="Unpaid" onClick={() => applyQuickFilter('unpaid')} />
          <QuickButton label="All" onClick={() => applyQuickFilter('all')} />
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
            <FilterInput
              label="Start"
              type="date"
              value={filters.startDate}
              onChange={(value) => setFilters((prev) => ({ ...prev, startDate: value }))}
            />
            <FilterInput
              label="End"
              type="date"
              value={filters.endDate}
              onChange={(value) => setFilters((prev) => ({ ...prev, endDate: value }))}
            />
            <FilterSelect
              label="Mode"
              value={filters.mode}
              onChange={(value) => setFilters((prev) => ({ ...prev, mode: value }))}
              options={[
                ['', 'All'],
                ['cash', 'Cash'],
                ['upi', 'UPI'],
                ['credit', 'Credit']
              ]}
            />
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
              options={[
                ['', 'All'],
                ['paid', 'Paid'],
                ['unpaid', 'Unpaid']
              ]}
            />
            <FilterSelect
              label="Sort"
              value={filters.sortOrder}
              onChange={(value) => setFilters((prev) => ({ ...prev, sortOrder: value }))}
              options={[
                ['desc', 'Newest'],
                ['asc', 'Oldest']
              ]}
            />
          </div>
        )}
      </div>

      {outstandingCredits.length > 0 && (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-4">
          <h3 className="text-lg font-black text-rose-800 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Outstanding Credits
          </h3>
          <div className="space-y-2 mt-3">
            {outstandingCredits.map((tx) => (
              <TransactionRow key={tx._id} tx={tx} highlight />
            ))}
          </div>
        </div>
      )}

      {monthlyBreakdown.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Monthly Spend
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            {monthlyBreakdown.map((month) => (
              <div key={`${month._id.year}-${month._id.month}`} className="p-3 rounded-2xl bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase">
                  {format(new Date(month._id.year, month._id.month - 1, 1), 'MMM yyyy')}
                </p>
                <p className="text-lg font-black text-slate-900">₹{month.totalExpense?.toLocaleString('en-IN')}</p>
                <p className="text-xs font-semibold text-slate-500">{month.count} entries</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-black text-slate-900">Transactions</h3>
        {transactions.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 text-center text-slate-500 font-semibold">
            No transactions found.
          </div>
        ) : (
          transactions.map((tx) => <TransactionRow key={tx._id} tx={tx} />)
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, tone }) {
  const tones = {
    slate: 'bg-slate-50 border-slate-100 text-slate-900',
    rose: 'bg-rose-50 border-rose-100 text-rose-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700'
  };

  return (
    <div className={`p-4 rounded-3xl border ${tones[tone]}`}>
      <Icon className="w-5 h-5 mb-3" />
      <p className="text-xs font-bold uppercase opacity-75">{label}</p>
      <p className="text-2xl font-black">₹{(value || 0).toLocaleString('en-IN')}</p>
    </div>
  );
}

function QuickButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors"
    >
      {label}
    </button>
  );
}

function FilterInput({ label, type, value, onChange }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900"
      />
    </label>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function TransactionRow({ tx, highlight = false }) {
  const date = tx.date ? format(parseISO(tx.date), 'dd MMM yyyy') : 'No date';
  const dueDate = tx.dueDate ? format(parseISO(tx.dueDate), 'dd MMM yyyy') : null;

  return (
    <div className={`bg-white border rounded-3xl p-4 flex items-center justify-between gap-4 shadow-sm ${highlight ? 'border-rose-100' : 'border-slate-100'}`}>
      <div className="min-w-0">
        <p className="font-black text-slate-900 truncate">{tx.description || 'Expense'}</p>
        <p className="text-sm font-semibold text-slate-500">
          {date} · {tx.mode || 'mode'}{dueDate ? ` · Due ${dueDate}` : ''}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-black text-slate-900">₹{tx.amount?.toLocaleString('en-IN')}</p>
        <p className={`text-xs font-bold flex items-center justify-end gap-1 ${tx.isPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
          <CheckCircle className="w-3 h-3" />
          {tx.isPaid ? 'Paid' : 'Unpaid'}
        </p>
      </div>
    </div>
  );
}
