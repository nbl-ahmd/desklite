const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const auth = require('../middleware/auth');
const { requireFeature } = require('../middleware/subscription');
const Transaction = require('../models/Transaction');

router.use(auth);

const MAX_EXPORT_ROWS = 5000;

// Helper to get browser launch options based on environment
const getBrowserOptions = () => {
  const options = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ]
  };
  
  // Use bundled Chromium in production, allow custom path in development
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    options.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  return options;
};

// Helper to safely generate PDF
const generatePDF = async (html) => {
  let browser = null;
  try {
    browser = await puppeteer.launch(getBrowserOptions());
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close().catch(err => console.error('Browser close error:', err));
    }
  }
};

// POST /api/pdf/expense-split
router.post('/expense-split', requireFeature('exports', { consume: true }), async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    const { splitResults, expenseTransactions, customerExpenses } = body || {};

    if (!splitResults || !expenseTransactions || !customerExpenses) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    const resultRows = (splitResults.participants || splitResults.results || []).map((row) => {
      const balance = Number(row.balance ?? ((row.paid || 0) - (row.fairShare || 0)));
      return { ...row, paid: Number(row.paid || 0), owed: Math.abs(balance), status: balance > 0 ? 'gets' : balance < 0 ? 'owes' : 'settled' };
    });

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
              ${resultRows.map(r => `
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
                  <td>₹${Number(c.total ?? c.fairShare ?? 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const pdfBuffer = await generatePDF(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="expense_split_report.pdf"');
    res.end(pdfBuffer);
  } catch (err) {
    console.error('Puppeteer PDF error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Generate PDF from transactions (filtered by query params)
router.post('/export', requireFeature('exports', { consume: true }), async (req, res) => {
  try {
    const { from, to } = req.body;
    const filter = { shopId: req.user.shopId };
    if (from) filter.occurredAt = Object.assign({}, filter.occurredAt, { $gte: new Date(from) });
    if (to) filter.occurredAt = Object.assign({}, filter.occurredAt, { $lte: new Date(to) });

    let transactions = await Transaction.find(filter).sort({ date: -1 }).limit(MAX_EXPORT_ROWS + 1).lean();
    const truncated = transactions.length > MAX_EXPORT_ROWS;
    if (truncated) transactions = transactions.slice(0, MAX_EXPORT_ROWS);

    const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd}th{background:#f4f4f4}</style></head><body><h2>Expense Report</h2><table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Mode</th><th>Note</th></tr></thead><tbody>${transactions.map(t=>`<tr><td>${new Date(t.date).toLocaleString()}</td><td>${t.type}</td><td>${t.amount}</td><td>${t.mode||''}</td><td>${t.description||''}</td></tr>`).join('')}</tbody></table></body></html>`;

    const pdfBuffer = await generatePDF(html);

    res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdfBuffer.length });
    if (truncated) res.set('X-Export-Truncated', 'true');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF export failed', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
