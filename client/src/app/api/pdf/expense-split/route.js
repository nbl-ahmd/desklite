export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import puppeteer from 'puppeteer';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { splitResults, expenseTransactions, customerExpenses } = await request.json();

    // Launch browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1200, height: 800 });

    // Generate HTML content
    const htmlContent = generateHTML(splitResults, expenseTransactions, customerExpenses);
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    await browser.close();

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="expense_split_report_${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

function generateHTML(splitResults, expenseTransactions, customerExpenses) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Expense Split Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background: #ffffff;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        /* Header */
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 30px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .header p {
          font-size: 14px;
          opacity: 0.9;
        }

        /* Summary Cards */
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }

        .card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          text-align: center;
          border: 1px solid #e5e7eb;
        }

        .card.total {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .card.participants {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
        }

        .card.per-person {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .card-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          opacity: 0.9;
        }

        .card-value {
          font-size: 24px;
          font-weight: 700;
        }

        /* Section Headers */
        .section-header {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          margin: 30px 0 15px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }

        /* Tables */
        .table-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          margin-bottom: 30px;
          border: 1px solid #e5e7eb;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #f8fafc;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }

        td {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr:nth-child(even) {
          background: #f9fafb;
        }

        .status-owes {
          color: #dc2626;
          font-weight: 600;
        }

        .status-gets {
          color: #059669;
          font-weight: 600;
        }

        .status-settled {
          color: #6b7280;
          font-weight: 600;
        }

        .amount {
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          font-weight: 600;
        }

        /* Footer */
        .footer {
          background: #f8fafc;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
          border: 1px solid #e5e7eb;
          margin-top: 30px;
        }

        .footer p {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
        }

        /* Responsive */
        @media print {
          .container {
            max-width: none;
            padding: 0;
          }
          
          .header {
            margin-bottom: 20px;
          }
          
          .summary-cards {
            margin-bottom: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>💰 Expense Split Report</h1>
          <p>Generated on ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>

        <!-- Summary Cards -->
        <div class="summary-cards">
          <div class="card total">
            <div class="card-label">Total Amount</div>
            <div class="card-value">${formatCurrency(splitResults.totalAmount)}</div>
          </div>
          <div class="card participants">
            <div class="card-label">Participants</div>
            <div class="card-value">${splitResults.results.length}</div>
          </div>
          <div class="card per-person">
            <div class="card-label">Per Person</div>
            <div class="card-value">${formatCurrency(splitResults.perPerson)}</div>
          </div>
        </div>

        <!-- Split Results -->
        <h2 class="section-header">📊 Split Results</h2>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>👤 Participant</th>
                <th>💰 Paid</th>
                <th>💸 Owes/Gets</th>
                <th>📋 Status</th>
              </tr>
            </thead>
            <tbody>
              ${splitResults.results.map(r => `
                <tr>
                  <td><strong>${r.name}</strong></td>
                  <td class="amount">${formatCurrency(r.paid)}</td>
                  <td class="amount ${r.owed > 0 ? 'status-owes' : r.owed < 0 ? 'status-gets' : 'status-settled'}">
                    ${r.owed === 0 ? formatCurrency(0) : (r.owed > 0 ? formatCurrency(r.owed) : formatCurrency(Math.abs(r.owed)))}
                  </td>
                  <td>
                    <span class="${r.status === 'owes' ? 'status-owes' : r.status === 'gets' ? 'status-gets' : 'status-settled'}">
                      ${r.status === 'owes' ? '🔴 Owes' : r.status === 'gets' ? '🟢 Gets Back' : '✅ Settled'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${customerExpenses && customerExpenses.length > 0 ? `
          <!-- Customer Expenses -->
          <h2 class="section-header">👥 Customer Expenses</h2>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Total Spent</th>
                  <th>Transaction Count</th>
                  <th>Average per Transaction</th>
                </tr>
              </thead>
              <tbody>
                ${customerExpenses.map(c => {
                  const trans = expenseTransactions.filter(t => t.customerName === c.name);
                  const avg = trans.length ? (c.total / trans.length) : 0;
                  return `
                    <tr>
                      <td><strong>${c.name}</strong></td>
                      <td class="amount">${formatCurrency(c.total)}</td>
                      <td>${trans.length}</td>
                      <td class="amount">${formatCurrency(avg)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- Recent Transactions -->
        <h2 class="section-header">📝 Recent Transactions</h2>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Customer</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${expenseTransactions.slice(0, 10).map(t => `
                <tr>
                  <td>${formatDate(t.date)}</td>
                  <td class="amount">${formatCurrency(t.amount)}</td>
                  <td>${t.customerName || 'N/A'}</td>
                  <td>${t.description ? (t.description.length > 30 ? t.description.substring(0, 30) + '...' : t.description) : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>Total Transactions:</strong> ${expenseTransactions.length} | <strong>Generated by:</strong> Ledger Book - Professional Expense Management</p>
          <p>This report was automatically generated for expense splitting and settlement purposes.</p>
        </div>
      </div>
    </body>
    </html>
  `;
} 