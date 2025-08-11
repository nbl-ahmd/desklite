const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');

// POST /api/pdf/expense-split
router.post('/expense-split', async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    const { splitResults, expenseTransactions, customerExpenses } = body || {};

    if (!splitResults || !expenseTransactions || !customerExpenses) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    const html = `
      <html>
        <head>
          <title>Expense Split Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { color: #4F46E5; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Expense Split Report</h1>
          <h2>Split Results</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Paid</th>
                <th>Owed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${(splitResults.results || []).map(r => `
                <tr>
                  <td>${r.name}</td>
                  <td>₹${Number(r.paid).toFixed(2)}</td>
                  <td>${r.status === 'gets' ? 'Gets' : r.status === 'owes' ? 'Owes' : 'Settled'} ₹${Math.abs(Number(r.owed)).toFixed(2)}</td>
                  <td>${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <h2 style="margin-top:40px;">Expense Transactions</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${(expenseTransactions || []).map(t => `
                <tr>
                  <td>${t.date ? new Date(t.date).toLocaleString() : ''}</td>
                  <td>${t.customerName || ''}</td>
                  <td>₹${Number(t.amount).toFixed(2)}</td>
                  <td>${t.description || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <h2 style="margin-top:40px;">Customer Expenses</h2>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${(customerExpenses || []).map(c => `
                <tr>
                  <td>${c.name}</td>
                  <td>₹${Number(c.total).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // Send as a buffer, not as a string
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="expense_split_report.pdf"');
    res.end(pdfBuffer);
  } catch (err) {
    console.error('Puppeteer PDF error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
