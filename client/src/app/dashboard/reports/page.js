'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { getApiToken } from '@/utils/auth';

export default function ReportsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [selectedMode, setSelectedMode] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showExpenseSplitter, setShowExpenseSplitter] = useState(false);
  const [expenseSplitData, setExpenseSplitData] = useState({
    totalAmount: '',
    participants: [{ name: '', amount: '' }]
  });
  const [showAutoSplit, setShowAutoSplit] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchTransactions();
    }
  }, [status, router]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, selectedMode, dateRange, customStartDate, customEndDate, selectedCustomer, selectedType]);

  const fetchTransactions = async () => {
    try {
      const token = await getApiToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      setTransactions(data);
      setFilteredTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Filter by transaction type
    if (selectedType !== 'all') {
      filtered = filtered.filter(t => t.type === selectedType);
    }

    // Filter by payment mode
    if (selectedMode !== 'all') {
      filtered = filtered.filter(t => t.mode === selectedMode);
    }

    // Filter by customer name
    if (selectedCustomer !== 'all') {
      filtered = filtered.filter(t => t.customerName === selectedCustomer);
    }

    // Filter by date range
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
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = startOfDay(new Date(customStartDate));
          endDate = endOfDay(new Date(customEndDate));
        }
        break;
      default:
        startDate = null;
        endDate = null;
    }

    if (startDate && endDate) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    setFilteredTransactions(filtered);
  };

  // Calculate totals based on filtered transactions
  const calculateTotals = () => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const net = income - expense;
    
    return { income, expense, net, count: filteredTransactions.length };
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Amount', 'Mode', 'Customer', 'Phone', 'Description'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t => [
        format(new Date(t.date), 'yyyy-MM-dd HH:mm'),
        t.type,
        t.amount,
        t.mode || 'N/A',
        t.customerName || 'N/A',
        t.customerPhone || 'N/A',
        t.description || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculate statistics
  const calculateStatistics = () => {
    const incomeTransactions = filteredTransactions.filter(t => t.type === 'income');
    const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
    
    const incomeAmounts = incomeTransactions.map(t => t.amount);
    const expenseAmounts = expenseTransactions.map(t => t.amount);
    
    const calculateStats = (amounts) => {
      if (amounts.length === 0) return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
      
      const sorted = amounts.sort((a, b) => a - b);
      const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
      const median = sorted.length % 2 === 0 
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      const min = Math.min(...amounts);
      const max = Math.max(...amounts);
      const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      
      return { mean, median, min, max, stdDev };
    };
    
    return {
      income: calculateStats(incomeAmounts),
      expense: calculateStats(expenseAmounts),
      totalTransactions: filteredTransactions.length,
      uniqueCustomers: new Set(filteredTransactions.filter(t => t.customerName).map(t => t.customerName)).size,
      dateRange: {
        start: filteredTransactions.length > 0 ? Math.min(...filteredTransactions.map(t => new Date(t.date))) : null,
        end: filteredTransactions.length > 0 ? Math.max(...filteredTransactions.map(t => new Date(t.date))) : null
      }
    };
  };

  // Export to PDF
  const exportToPDF = async () => {
    try {
      console.log('Starting PDF generation...');
      
      // Dynamic imports to handle loading issues
      const jsPDF = (await import('jspdf')).default;
      await import('jspdf-autotable');
      
      const doc = new jsPDF();
      const stats = calculateStatistics();
      const customerExpensesData = customerExpenses();
      
      console.log('Statistics calculated:', stats);
      console.log('Customer expenses data:', customerExpensesData);
      
      // Page 1: Executive Summary
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Financial Report', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, 105, 30, { align: 'center' });
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      
      // Executive Summary Box
      doc.setFillColor(248, 249, 250);
      doc.rect(10, 50, 190, 80, 'F');
      doc.setDrawColor(222, 226, 230);
      doc.rect(10, 50, 190, 80, 'S');
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', 20, 65);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Income: ₹${totals.income.toFixed(2)}`, 20, 80);
      doc.text(`Total Expenses: ₹${totals.expense.toFixed(2)}`, 20, 90);
      doc.text(`Net Balance: ₹${totals.net.toFixed(2)}`, 20, 100);
      doc.text(`Total Transactions: ${totals.count}`, 20, 110);
      doc.text(`Unique Customers: ${stats.uniqueCustomers}`, 20, 120);
      
      // Date Range
      if (stats.dateRange.start && stats.dateRange.end) {
        doc.text(`Date Range: ${format(stats.dateRange.start, 'MMM d, yyyy')} - ${format(stats.dateRange.end, 'MMM d, yyyy')}`, 20, 130);
      }
      
      // Key Metrics Box
      doc.setFillColor(255, 255, 255);
      doc.rect(10, 140, 190, 60, 'F');
      doc.setDrawColor(222, 226, 230);
      doc.rect(10, 140, 190, 60, 'S');
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Performance Metrics', 20, 155);
      
      // Income vs Expense comparison
      const totalAmount = totals.income + totals.expense;
      const incomePercentage = totalAmount > 0 ? (totals.income / totalAmount * 100) : 0;
      const expensePercentage = totalAmount > 0 ? (totals.expense / totalAmount * 100) : 0;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Income Ratio: ${incomePercentage.toFixed(1)}%`, 20, 170);
      doc.text(`Expense Ratio: ${expensePercentage.toFixed(1)}%`, 20, 180);
      doc.text(`Average Transaction: ₹${totalAmount > 0 ? (totalAmount / totals.count).toFixed(2) : '0.00'}`, 20, 190);
      
      // Page 2: Detailed Statistics
      doc.addPage();
      
      // Header
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed Financial Analysis', 105, 18, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      
      // Income Statistics
      doc.setFillColor(220, 252, 231);
      doc.rect(10, 40, 95, 80, 'F');
      doc.setDrawColor(34, 197, 94);
      doc.rect(10, 40, 95, 80, 'S');
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74);
      doc.text('Income Statistics', 20, 55);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Mean: ₹${stats.income.mean.toFixed(2)}`, 20, 70);
      doc.text(`Median: ₹${stats.income.median.toFixed(2)}`, 20, 80);
      doc.text(`Min: ₹${stats.income.min.toFixed(2)}`, 20, 90);
      doc.text(`Max: ₹${stats.income.max.toFixed(2)}`, 20, 100);
      doc.text(`Std Dev: ₹${stats.income.stdDev.toFixed(2)}`, 20, 110);
      
      // Expense Statistics
      doc.setFillColor(254, 226, 226);
      doc.rect(105, 40, 95, 80, 'F');
      doc.setDrawColor(239, 68, 68);
      doc.rect(105, 40, 95, 80, 'S');
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text('Expense Statistics', 115, 55);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Mean: ₹${stats.expense.mean.toFixed(2)}`, 115, 70);
      doc.text(`Median: ₹${stats.expense.median.toFixed(2)}`, 115, 80);
      doc.text(`Min: ₹${stats.expense.min.toFixed(2)}`, 115, 90);
      doc.text(`Max: ₹${stats.expense.max.toFixed(2)}`, 115, 100);
      doc.text(`Std Dev: ₹${stats.expense.stdDev.toFixed(2)}`, 115, 110);
      
      // Payment Mode Analysis
      const modeAnalysis = {};
      filteredTransactions.forEach(t => {
        if (t.mode) {
          modeAnalysis[t.mode] = (modeAnalysis[t.mode] || 0) + 1;
        }
      });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Payment Mode Distribution', 20, 140);
      
      let yPos = 155;
      Object.entries(modeAnalysis).forEach(([mode, count]) => {
        const percentage = (count / totals.count * 100).toFixed(1);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${mode.charAt(0).toUpperCase() + mode.slice(1)}: ${count} transactions (${percentage}%)`, 20, yPos);
        yPos += 10;
      });
      
      // Page 3: Customer Analysis
      if (customerExpensesData.length > 0) {
        doc.addPage();
        
        // Header
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, 210, 30, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Customer Expense Analysis', 105, 18, { align: 'center' });
        
        doc.setTextColor(0, 0, 0);
        
        // Customer Expenses Table
        const customerTableData = customerExpensesData.map(customer => {
          const customerTransactions = filteredTransactions.filter(t => 
            t.type === 'expense' && t.customerName === customer.name
          );
          const avgAmount = customer.total / customerTransactions.length;
          return [
            customer.name,
            `₹${customer.total.toFixed(2)}`,
            customerTransactions.length.toString(),
            `₹${avgAmount.toFixed(2)}`
          ];
        });
        
        doc.autoTable({
          startY: 40,
          head: [['Customer Name', 'Total Expenses', 'Transaction Count', 'Average per Transaction']],
          body: customerTableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [41, 128, 185], 
            textColor: 255,
            fontSize: 11,
            fontStyle: 'bold'
          },
          styles: { 
            fontSize: 10,
            cellPadding: 5
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250]
          }
        });
        
        // Customer Insights
        const topSpender = customerExpensesData[0];
        const totalCustomerExpenses = customerExpensesData.reduce((sum, c) => sum + c.total, 0);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Key Insights:', 20, doc.lastAutoTable.finalY + 20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`• Top spender: ${topSpender.name} (₹${topSpender.total.toFixed(2)})`, 20, doc.lastAutoTable.finalY + 35);
        doc.text(`• Total customer expenses: ₹${totalCustomerExpenses.toFixed(2)}`, 20, doc.lastAutoTable.finalY + 45);
        doc.text(`• Average customer expense: ₹${(totalCustomerExpenses / customerExpensesData.length).toFixed(2)}`, 20, doc.lastAutoTable.finalY + 55);
      }
      
      // Page 4: Detailed Transactions
      doc.addPage();
      
      // Header
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed Transaction Report', 105, 18, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      
      // Transactions Table
      const transactionTableData = filteredTransactions.map(t => [
        format(new Date(t.date), 'MMM d, yyyy'),
        t.type.charAt(0).toUpperCase() + t.type.slice(1),
        `₹${t.amount.toFixed(2)}`,
        t.mode ? t.mode.charAt(0).toUpperCase() + t.mode.slice(1) : 'N/A',
        t.customerName || 'N/A',
        t.description || 'N/A'
      ]);
      
      doc.autoTable({
        startY: 40,
        head: [['Date', 'Type', 'Amount', 'Mode', 'Customer', 'Description']],
        body: transactionTableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [41, 128, 185], 
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 8,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 20 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20 },
          4: { cellWidth: 30 },
          5: { cellWidth: 50 }
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        didDrawPage: function (data) {
          // Add page numbers
          doc.setFontSize(10);
          doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
        }
      });
      
      console.log('PDF generation completed, saving file...');
      // Save PDF
      doc.save(`financial_report_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`);
      console.log('PDF saved successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check the console for details.');
    }
  };

  // Expense Splitter Functions
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
    const totalPaid = participants.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const perPerson = totalAmount / participants.length;
    
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

    return { results, totalAmount, totalPaid, perPerson };
  };

  // Auto-split based on transaction data
  const generateAutoSplit = () => {
    const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense' && t.customerName);
    const customerExpenses = {};
    
    expenseTransactions.forEach(t => {
      if (!customerExpenses[t.customerName]) {
        customerExpenses[t.customerName] = 0;
      }
      customerExpenses[t.customerName] += t.amount;
    });
    
    const totalAmount = Object.values(customerExpenses).reduce((sum, amount) => sum + amount, 0);
    const participants = Object.entries(customerExpenses).map(([name, amount]) => ({
      name,
      amount: amount.toString()
    }));
    
    setExpenseSplitData({
      totalAmount: totalAmount.toString(),
      participants: participants.length > 0 ? participants : [{ name: '', amount: '' }]
    });
    setShowAutoSplit(true);
  };

  // Export Expense Split PDF - Now calls Express backend
  const exportExpenseSplitPDF = async () => {
    try {
      console.log('🔄 Generating PDF with Puppeteer (Express backend)...');
      const token = await getApiToken();
      const splitResults = calculateSplit();
      const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense' && t.customerName);
      const custExpenses = customerExpenses();

      // Call the Express backend API endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pdf/expense-split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          splitResults,
          expenseTransactions,
          customerExpenses: custExpenses
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expense_split_report_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      console.log('✅ Modern PDF generated successfully with Puppeteer!');
    } catch (error) {
      console.error('❌ Error generating PDF with Puppeteer:', error);
      alert('Failed to generate PDF. Please check the console for details.');
    }
  };
  
  

  const totals = calculateTotals();
  const splitResults = calculateSplit();

  // Calculate customer-wise expenses
  const customerExpenses = () => {
    const customerMap = {};
    
    filteredTransactions
      .filter(t => t.type === 'expense' && t.customerName)
      .forEach(t => {
        if (!customerMap[t.customerName]) {
          customerMap[t.customerName] = 0;
        }
        customerMap[t.customerName] += t.amount;
      });
    
    return Object.entries(customerMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  };

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={exportToPDF}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF Report
            </button>
            <button
              onClick={() => setShowExpenseSplitter(!showExpenseSplitter)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Expense Splitter
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Income</p>
                <p className="text-2xl font-bold text-green-600">₹{totals.income.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20V4m8 8H4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Expense</p>
                <p className="text-2xl font-bold text-red-600">₹{totals.expense.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Net Balance</p>
                <p className={`text-2xl font-bold ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{totals.net.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Transactions</p>
                <p className="text-2xl font-bold text-gray-600">{totals.count}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="all">All Modes</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="all">All Customers</option>
                {Array.from(new Set(transactions.filter(t => t.customerName).map(t => t.customerName))).sort().map(customer => (
                  <option key={customer} value={customer}>{customer}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </div>

          {dateRange === 'custom' && (
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Expense Splitter */}
        {showExpenseSplitter && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Expense Splitter</h3>
              <div className="flex gap-2">
                <button
                  onClick={generateAutoSplit}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Auto-Split from Data
                </button>
                <button
                  onClick={exportExpenseSplitPDF}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Modern PDF
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Input Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={expenseSplitData.totalAmount}
                    onChange={(e) => setExpenseSplitData(prev => ({ ...prev, totalAmount: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Enter total amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Participants</label>
                  {expenseSplitData.participants.map((participant, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={participant.name}
                        onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="Name"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={participant.amount}
                        onChange={(e) => updateParticipant(index, 'amount', e.target.value)}
                        className="w-32 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="Amount paid"
                      />
                      {expenseSplitData.participants.length > 1 && (
                        <button
                          onClick={() => removeParticipant(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addParticipant}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    + Add Participant
                  </button>
                </div>
              </div>

              {/* Results Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Split Results</h4>
                
                {splitResults.results.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <p>Total Amount: ₹{splitResults.totalAmount.toFixed(2)}</p>
                      <p>Total Paid: ₹{splitResults.totalPaid.toFixed(2)}</p>
                      <p>Per Person: ₹{splitResults.perPerson.toFixed(2)}</p>
                    </div>
                    
                    <div className="space-y-2">
                      {splitResults.results.map((result, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="font-medium">{result.name}</span>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Paid: ₹{result.paid.toFixed(2)}</div>
                            <div className={`text-sm font-medium ${
                              result.status === 'owes' ? 'text-red-600' : 
                              result.status === 'gets' ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              {result.status === 'owes' ? `Owes: ₹${result.owed.toFixed(2)}` :
                               result.status === 'gets' ? `Gets: ₹${Math.abs(result.owed).toFixed(2)}` :
                               'Settled'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Customer Expenses Summary */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Customer Expenses Summary</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Expenses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average per Transaction</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customerExpenses().map((customer) => {
                  const customerTransactions = filteredTransactions.filter(t => 
                    t.type === 'expense' && t.customerName === customer.name
                  );
                  const avgAmount = customer.total / customerTransactions.length;
                  
                  return (
                    <tr key={customer.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                        ₹{customer.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customerTransactions.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{avgAmount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {customerExpenses().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No customer expenses found with the current filters.
            </div>
          )}
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Filtered Transactions</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(transaction.date), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.type === 'income' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₹{transaction.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.mode ? transaction.mode.charAt(0).toUpperCase() + transaction.mode.slice(1) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.customerName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {transaction.description || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No transactions found with the current filters.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}