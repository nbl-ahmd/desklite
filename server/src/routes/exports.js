const express = require('express');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');
const auth = require('../middleware/auth');
const { requireFeature } = require('../middleware/subscription');
const { consumeExport } = require('../services/subscriptionService');
const Transaction = require('../models/Transaction');
const ExpenseSplit = require('../models/ExpenseSplit');
const User = require('../models/User');

const router = express.Router();
const MAX_ROWS = 5000;
router.use(auth, requireFeature('exports'));

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
const dateText = (value) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
const objectId = (value) => new mongoose.Types.ObjectId(value);
const labels = {
  en: { income: 'Income', expense: 'Expenses', net: 'Net balance', records: 'Records', generated: 'Generated', details: 'Transaction details', mode: 'Payment mode', noData: 'No records in this period', settlement: 'Settlement transfers', share: 'Expense Split' },
  ml: { income: 'വരുമാനം', expense: 'ചെലവ്', net: 'ബാക്കി', records: 'റെക്കോർഡുകൾ', generated: 'തയ്യാറാക്കിയത്', details: 'ഇടപാട് വിവരങ്ങൾ', mode: 'പേയ്‌മെന്റ് രീതി', noData: 'ഈ കാലയളവിൽ രേഖകളില്ല', settlement: 'തീർപ്പാക്കൽ കൈമാറ്റങ്ങൾ', share: 'ചെലവ് വിഭജനം' },
};

function range(value = {}) {
  const from = value.from ? new Date(value.from) : new Date(new Date().setHours(0, 0, 0, 0));
  const to = value.to ? new Date(value.to) : new Date();
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new Error('Invalid date range');
  from.setHours(0, 0, 0, 0); to.setHours(23, 59, 59, 999);
  return { from, to };
}

async function reportData(req) {
  const body = req.body || {};
  const { kind = 'transactions', mode, type, customerName } = body;
  const user = await User.findById(req.user.id).select('shopName name language').lean();
  const language = user?.language || 'en';
  const text = labels[language] || labels.en;
  if (kind === 'split') {
    if (!mongoose.Types.ObjectId.isValid(body.splitId)) throw new Error('A saved split is required');
    const split = await ExpenseSplit.findOne({ _id: body.splitId, shopId: objectId(req.user.shopId) }).lean();
    if (!split) throw new Error('Split not found');
    const result = split.calculation || {};
    return { kind, title: split.title || text.share, subtitle: `${dateText(split.from)} – ${dateText(split.to)}`, user, language, text,
      metrics: [{ label: text.expense, value: money(result.totalExpenses) }, { label: text.income, value: money(result.totalIncome) }, { label: 'Fund before reimbursement', value: money(result.groupFundRemaining ?? result.groupFund) }, { label: 'Per person', value: money(result.costPerPerson) }],
      rows: (result.participants || []).map((item) => ({ date: `${item.quantity || 0} people`, type: item.name, amount: item.fairShare, mode: `Paid ${money(item.paid)}`, note: item.balance >= 0 ? `Receives ${money(item.balance)}` : `Pays ${money(Math.abs(item.balance))}` })),
      settlements: result.settlements || [],
      fundBalance: result.groupFundAfterReimbursement != null ? money(result.groupFundAfterReimbursement) : money(result.groupFundRemaining ?? result.groupFund),
      fundAllocations: result.groupFundAllocations || [] };
  }
  const { from, to } = range(body);
  const query = { shopId: objectId(req.user.shopId), date: { $gte: from, $lte: to } };
  if (mode && mode !== 'all') query.mode = mode;
  if (type && type !== 'all') query.type = type;
  if (kind === 'ledger' && customerName) query.customerName = customerName;
  let transactions = await Transaction.find(query).sort({ date: -1 }).limit(MAX_ROWS + 1).lean();
  const truncated = transactions.length > MAX_ROWS;
  if (truncated) transactions = transactions.slice(0, MAX_ROWS);
  const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expense = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const modes = transactions.reduce((acc, item) => { acc[item.mode || 'cash'] = (acc[item.mode || 'cash'] || 0) + Number(item.amount || 0); return acc; }, {});
  const title = kind === 'daily' ? 'Daily Summary' : kind === 'ledger' ? `Ledger · ${customerName || ''}` : kind === 'expenses' ? 'Expense Report' : 'Financial Report';
  return { kind, title, subtitle: `${dateText(from)} – ${dateText(to)}${mode && mode !== 'all' ? ` · ${mode.toUpperCase()}` : ''}`, user, language, text, truncated,
    metrics: [{ label: text.income, value: money(income) }, { label: text.expense, value: money(expense) }, { label: text.net, value: money(income - expense) }, { label: text.records, value: String(transactions.length) }],
    modes, rows: transactions.map((item) => ({ date: dateText(item.date), type: item.type, amount: item.amount, mode: item.mode || '-', note: item.description || item.customerName || '-' })) };
}

function html(data, compact = false) {
  const metricHtml = data.metrics.map((item) => `<div class="metric"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join('');
  const modeHtml = Object.entries(data.modes || {}).map(([key, value]) => `<span>${escapeHtml(key.toUpperCase())}: <b>${money(value)}</b></span>`).join(' · ');
  const rows = compact ? [] : data.rows;
  const settlementHtml = (data.settlements || []).map((s) => `<div class="detail-row"><span>${escapeHtml(s.from)}</span><span class="divider">pays</span><span>${escapeHtml(s.to)}</span><strong>${money(s.amount)}</strong></div>`).join('');
  const allocationHtml = (data.fundAllocations || []).map((item) => `<div class="detail-row"><span>${escapeHtml(item.from)}</span><span class="divider">to</span><span>${escapeHtml(item.to)}</span><strong>${money(item.amount)}</strong></div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box} body{margin:0;font-family:Arial,sans-serif;color:#14213d;background:linear-gradient(180deg,#f8fafc,#edf3ff 100%);padding:32px}.report{max-width:${compact ? '760px' : '980px'};margin:auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 16px 36px rgba(15,23,42,.12)}.head{padding:30px 32px;background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);color:#fff}.brand{font-size:12px;font-weight:800;letter-spacing:1.25px;opacity:.82;text-transform:uppercase}.head h1{margin:10px 0 6px;font-size:30px;line-height:1.2}.head p{margin:0;opacity:.86;font-size:14px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:24px}.metric{border:1px solid #e2e8f0;border-radius:16px;padding:16px;background:linear-gradient(180deg,#fff,#f8fbff)}.metric span{display:block;color:#64748b;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.metric strong{display:block;margin-top:8px;font-size:20px;color:#0f172a}.section{padding:0 24px 24px}.section h2{font-size:16px;margin:0 0 12px;color:#0f172a}.modes{padding:14px 16px;background:#eff6ff;border-radius:12px;color:#334155;font-size:13px;border:1px solid #dbeafe}.table{width:100%;border-collapse:collapse;font-size:12px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}.table th{background:#f8fafc;text-align:left;padding:10px;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:.08em}.table td{padding:10px;border-top:1px solid #edf2f7;color:#0f172a}.income{color:#059669;font-weight:700}.expense{color:#e11d48;font-weight:700}.detail-box{padding:14px 16px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc}.detail-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:12px;color:#334155}.detail-row:last-child{border-bottom:none}.detail-row .divider{color:#94a3b8}.detail-row strong{margin-left:auto;color:#0f172a;font-weight:800}.footer{padding:18px 24px;color:#64748b;font-size:11px;border-top:1px solid #e2e8f0;background:#f8fafc}@media(max-width:600px){body{padding:0}.report{border-radius:0}.metrics{grid-template-columns:repeat(2,1fr)}.head{padding:24px 20px}.section{padding:0 20px 20px}} 
  </style></head><body><main class="report"><header class="head"><div class="brand">${escapeHtml(data.user?.shopName || data.user?.name || 'DESKLITE')}</div><h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.subtitle)}</p></header><section class="metrics">${metricHtml}</section>${modeHtml ? `<section class="section"><div class="modes">${modeHtml}</div></section>` : ''}${data.fundAllocations?.length ? `<section class="section"><h2>Fund allocation</h2><div class="detail-box">${allocationHtml}</div></section>` : ''}${data.settlements?.length ? `<section class="section"><h2>${escapeHtml(data.text.settlement)}</h2><div class="detail-box">${settlementHtml}</div></section>` : ''}${!compact ? `<section class="section"><h2>${escapeHtml(data.text.details)}</h2>${rows.length ? `<table class="table"><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>${escapeHtml(data.text.mode)}</th><th>Note</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.type)}</td><td class="${row.type === 'expense' ? 'expense' : 'income'}">${money(row.amount)}</td><td>${escapeHtml(row.mode)}</td><td>${escapeHtml(row.note)}</td></tr>`).join('')}</tbody></table>` : `<p>${escapeHtml(data.text.noData)}</p>`}</section>` : ''}<footer class="footer">${escapeHtml(data.text.generated)} · ${new Date().toLocaleString('en-IN')}${data.truncated ? ' · Detail rows truncated' : ''}</footer></main></body></html>`;
}

router.post('/report', async (req, res) => {
  let browser;
  try {
    const { format = 'pdf' } = req.body || {};
    if (!['pdf', 'png'].includes(format)) return res.status(400).json({ message: 'format must be pdf or png' });
    const data = await reportData(req);
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });
    await page.setContent(html(data, format === 'png'), { waitUntil: 'networkidle0' });
    const file = format === 'pdf' ? await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } }) : await page.screenshot({ type: 'png', fullPage: true });
    await consumeExport(req.subscription);
    const extension = format === 'pdf' ? 'pdf' : 'png';
    const filename = `${String(data.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report'}-${Date.now()}.${extension}`;
    res.set({ 'Content-Type': format === 'pdf' ? 'application/pdf' : 'image/png', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' });
    res.send(file);
  } catch (error) {
    console.error('Report export failed:', error);
    res.status(500).json({ message: 'Unable to generate report export' });
  } finally { if (browser) await browser.close().catch(() => {}); }
});

module.exports = router;
