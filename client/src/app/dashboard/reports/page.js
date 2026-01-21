'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { getApiToken } from '@/utils/auth';
import { 
  Download, Users, TrendingUp, TrendingDown, 
  BarChart3, PieChart, Wallet, ArrowUpRight, ArrowDownLeft, Trash2, Plus
} from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Badge from '@/components/Badge';

export default function ReportsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  
  // Filters
  const [selectedMode, setSelectedMode] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  
  // Splitter State
  const [showExpenseSplitter, setShowExpenseSplitter] = useState(false);
  const [expenseSplitData, setExpenseSplitData] = useState({
    totalAmount: '',
    participants: [{ name: '', amount: '' }]
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchTransactions();
    }
  }, [status, router]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, selectedMode, dateRange]);

  const fetchTransactions = async () => {
    try {
      const token = await getApiToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      // Handle both old array format and new paginated format
      const txns = Array.isArray(data) ? data : (data.data || []);
      setTransactions(txns);
      setFilteredTransactions(txns);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
      setFilteredTransactions([]);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    if (selectedMode !== 'all') {
      filtered = filtered.filter(t => t.mode === selectedMode);
    }

    const now = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = startOfDay(subDays(now, 7));
        endDate = endOfDay(now);
        break;
      case 'month':
        startDate = startOfDay(subDays(now, 30));
        endDate = endOfDay(now);
        break;
    }

    if (startDate && endDate) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    setFilteredTransactions(filtered);
  };

  const calculateTotals = () => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return { income, expense, net: income - expense };
  };

  // Export Functions
  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Amount', 'Mode', 'Customer', 'Description'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t => [
        format(new Date(t.date), 'yyyy-MM-dd HH:mm'),
        t.type,
        t.amount,
        t.mode || 'N/A',
        t.customerName || 'N/A',
        t.description || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      await import('jspdf-autotable');
      const doc = new jsPDF();
      
      const totals = calculateTotals();
      
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('Financial Report', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 105, 30, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text('Summary', 14, 55);
      
      doc.setFontSize(10);
      const summaryData = [
        ['Total Income', `+ INR ${totals.income.toFixed(2)}`],
        ['Total Expenses', `- INR ${totals.expense.toFixed(2)}`],
        ['Net Balance', `INR ${totals.net.toFixed(2)}`]
      ];
      
      doc.autoTable({
        startY: 60,
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 }
      });
      
      doc.text('Detailed Transactions', 14, doc.lastAutoTable.finalY + 15);
      
      const tableData = filteredTransactions.map(t => [
        format(new Date(t.date), 'MMM d, yyyy'),
        t.type.toUpperCase(),
        `INR ${t.amount.toFixed(2)}`,
        t.customerName || '-',
        t.mode?.toUpperCase() || '-'
      ]);
      
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Date', 'Type', 'Amount', 'Customer', 'Mode']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }
      });
      
      doc.save('report.pdf');
    } catch (error) {
      console.error('PDF Error:', error);
      alert('Failed to generate PDF');
    }
  };

  // Expense Splitter Logic
  const addParticipant = () => {
    setExpenseSplitData(prev => ({
      ...prev,
      participants: [...prev.participants, { name: '', amount: '' }]
    }));
  };

  const removeParticipant = (index) => {
    setExpenseSplitData(prev => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index)
    }));
  };

  const updateParticipant = (index, field, value) => {
    setExpenseSplitData(prev => ({
      ...prev,
      participants: prev.participants.map((p, i) => 
        i === index ? { ...p, [field]: value } : p
      )
    }));
  };

  const calculateSplit = () => {
    const totalAmount = parseFloat(expenseSplitData.totalAmount) || 0;
    const participants = expenseSplitData.participants.filter(p => p.name && p.amount);
    const perPerson = totalAmount / (participants.length || 1);
    
    const results = participants.map(p => {
      const paid = parseFloat(p.amount) || 0;
      const owed = perPerson - paid;
      return {
        name: p.name,
        paid,
        owed,
        status: owed > 0 ? 'owes' : owed < 0 ? 'gets' : 'settled'
      };
    });

    return { results, perPerson };
  };

  const exportExpenseSplitPDF = async () => {
      try {
        const jsPDF = (await import('jspdf')).default;
        await import('jspdf-autotable');
        const doc = new jsPDF();
        
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255);
        doc.setFontSize(20);
        doc.text('Split Bill Report', 105, 18, { align: 'center' });
        
        const split = calculateSplit();
        
        doc.setTextColor(0);
        doc.setFontSize(12);
        doc.text(`Total Bill: INR ${parseFloat(expenseSplitData.totalAmount).toFixed(2)}`, 14, 45);
        doc.text(`Per Person: INR ${split.perPerson.toFixed(2)}`, 14, 52);
        
        const tableData = split.results.map(r => [
            r.name,
            `INR ${r.paid.toFixed(2)}`,
            r.status === 'owes' ? `Pays INR ${r.owed.toFixed(2)}` : 
            r.status === 'gets' ? `Gets INR ${Math.abs(r.owed).toFixed(2)}` : 'Settled'
        ]);
        
        doc.autoTable({
            startY: 60,
            head: [['Name', 'Paid', 'Result']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] }
        });
        
        doc.save('split-bill.pdf');
    } catch(e) {
        console.error(e);
        alert('Failed to generate Split PDF');
    }
  };

  const customerExpenses = () => {
    const expenses = filteredTransactions.filter(t => t.type === 'expense' && t.customerName);
    const customerMap = expenses.reduce((acc, t) => {
      acc[t.customerName] = (acc[t.customerName] || 0) + t.amount;
      return acc;
    }, {});
    
    return Object.entries(customerMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  };

  const totals = calculateTotals();
  const splitResults = calculateSplit();
  const topSpenders = Object.entries(
    filteredTransactions
      .filter(t => t.type === 'expense' && t.customerName)
      .reduce((acc, t) => {
        acc[t.customerName] = (acc[t.customerName] || 0) + t.amount;
        return acc;
      }, {})
  )
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  if (status === 'loading') {
    return (
      <div className="flex h-96 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 px-1">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reports</h1>
        <p className="text-slate-500 font-bold mt-1">Overview & Downloads</p>
      </div>

      {/* Filters - Horizontal Scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
         <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="flex-none appearance-none bg-slate-100 border-0 text-slate-900 text-sm font-bold py-3 px-5 rounded-full"
          >
              <option value="all">📅 All Time</option>
              <option value="today">📅 Today</option>
              <option value="week">📅 Last 7 Days</option>
              <option value="month">📅 Last 30 Days</option>
          </select>
           <button
            onClick={exportToPDF}
            className="flex-none flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-full font-bold shadow-lg active:scale-95 transition-transform"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
           <button
            onClick={() => setShowExpenseSplitter(!showExpenseSplitter)}
            className="flex-none flex items-center gap-2 px-5 py-3 bg-purple-100 text-purple-700 rounded-full font-bold active:scale-95 transition-transform"
          >
            <Users className="w-4 h-4" />
            <span>Splitter</span>
          </button>
      </div>

      {/* 3 Key Metrics Cards */}
      <div className="grid grid-cols-1 gap-4">
         {/* Net Balance (Featured) */}
         <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-[-20px] top-[-20px] opacity-10">
                  <BarChart3 size={150} />
              </div>
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-1">Net Balance</p>
              <p className="text-4xl font-black tracking-tight">₹{totals.net.toLocaleString('en-IN')}</p>
               <div className="mt-4 flex gap-4">
                  <div className="bg-white/10 px-3 py-1 rounded-lg">
                      <p className="text-xs text-slate-300">Income</p>
                      <p className="font-bold text-emerald-400">+₹{totals.income.toLocaleString('en-IN')}</p>
                  </div>
                   <div className="bg-white/10 px-3 py-1 rounded-lg">
                      <p className="text-xs text-slate-300">Expense</p>
                      <p className="font-bold text-rose-400">-₹{totals.expense.toLocaleString('en-IN')}</p>
                  </div>
              </div>
         </div>
      </div>

      {/* Expense Splitter */}
      {showExpenseSplitter && (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-slide-up">
          <div className="bg-purple-50 p-6 border-b border-purple-100">
             <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                  <Users size={24} />
               </div>
               <h3 className="text-xl font-black text-slate-900">Split Bill</h3>
             </div>
             <p className="text-sm text-slate-600">Add people and amount to calculate shares.</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bill Amount</label>
                <div className="relative mt-1">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                   <input
                      type="number"
                      placeholder="0.00"
                      value={expenseSplitData.totalAmount}
                      onChange={(e) => setExpenseSplitData(prev => ({ ...prev, totalAmount: e.target.value }))}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border-0 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
            </div>

             <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Who Paid What?</label>
                {expenseSplitData.participants.map((participant, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={participant.name}
                      onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                      className="flex-1 rounded-xl bg-slate-50 border-0 px-4 py-3 font-medium text-slate-900"
                      placeholder="Name"
                    />
                    <input
                      type="number"
                      value={participant.amount}
                      onChange={(e) => updateParticipant(index, 'amount', e.target.value)}
                      className="w-24 rounded-xl bg-slate-50 border-0 px-3 py-3 font-medium text-slate-900 text-right"
                      placeholder="0"
                    />
                     {index > 0 && (
                      <button onClick={() => removeParticipant(index)} className="p-3 text-rose-500 bg-rose-50 rounded-xl">
                          <Trash2 size={18} />
                      </button>
                     )}
                  </div>
                ))}
                <button
                  onClick={addParticipant}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700"
                >
                  + Add Person
                </button>
             </div>

              {/* Results */}
             {splitResults.results.length > 0 && parseFloat(expenseSplitData.totalAmount) > 0 && (
                <div className="bg-slate-900 rounded-2xl p-5 text-white">
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-slate-400 font-bold uppercase">Results</span>
                      <span className="text-xs text-slate-400">Per Head: ₹{splitResults.perPerson.toFixed(0)}</span>
                   </div>
                   <div className="space-y-3">
                      {splitResults.results.map((result, i) => (
                          <div key={i} className="flex justify-between items-center bg-white/10 p-3 rounded-xl">
                              <span className="font-bold">{result.name}</span>
                              <span className={`font-bold ${
                                  result.status === 'owes' ? 'text-rose-400' : 
                                  result.status === 'gets' ? 'text-emerald-400' : 'text-slate-400'
                              }`}>
                                  {result.status === 'owes' ? `Pays ₹${result.owed.toFixed(0)}` :
                                   result.status === 'gets' ? `Gets ₹${Math.abs(result.owed).toFixed(0)}` :
                                   'Settled'}
                              </span>
                          </div>
                      ))}
                   </div>
                    <button
                      onClick={exportExpenseSplitPDF}
                      className="w-full mt-4 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm"
                      >
                      Download Split PDF
                  </button>
                </div>
             )}
          </div>
        </div>
      )}

      {/* Top Expenses List (Simplified) */}
      {!showExpenseSplitter && customerExpenses().length > 0 && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 text-lg">Top Spenders</h3>
              </div>
              <div className="divide-y divide-slate-100">
                  {customerExpenses().slice(0, 5).map((customer) => (
                      <div key={customer.name} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                                  {customer.name.charAt(0)}
                              </div>
                              <span className="font-bold text-slate-900">{customer.name}</span>
                          </div>
                          <span className="font-bold text-rose-600">₹{customer.total.toLocaleString('en-IN')}</span>
                      </div>
                  ))}
              </div>
               <div className="p-4 text-center border-t border-slate-100">
                   <button onClick={exportToCSV} className="text-slate-500 font-bold text-sm hover:text-slate-800">
                       Download Full CSV Report
                   </button>
               </div>
          </div>
      )}

    </div>
  );
}