const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { requireFeature } = require('../middleware/subscription');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const ExpenseSplit = require('../models/ExpenseSplit');

const router = express.Router();
router.use(auth, requireFeature('expenseSplitting'));

const objectId = (id) => new mongoose.Types.ObjectId(id);
const shopFilter = (req) => ({ shopId: objectId(req.user.shopId) });

function range(req) {
  const from = new Date(req.query.from || req.body?.from);
  const to = new Date(req.query.to || req.body?.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new Error('Valid from and to dates are required');
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

async function loadSources(req, from, to) {
  const filter = { ...shopFilter(req), date: { $gte: from, $lte: to } };
  const [transactions, bills] = await Promise.all([
    Transaction.find(filter).sort({ date: -1 }).lean(),
    Bill.find({ ...shopFilter(req), billDate: { $gte: from, $lte: to } }).sort({ billDate: -1 }).lean()
  ]);

  const linkedBillTransactions = new Set(bills.map((b) => String(b.transactionId)).filter(Boolean));
  const sources = [];
  for (const tx of transactions) {
    if (tx.type === 'income' && linkedBillTransactions.has(String(tx._id))) continue;
    sources.push({
      id: `transaction:${tx._id}`,
      recordId: String(tx._id),
      kind: 'transaction',
      type: tx.type,
      date: tx.date,
      amount: Number(tx.amount) || 0,
      name: tx.customerName || '',
      description: tx.description || (tx.type === 'income' ? 'Income' : 'Expense'),
      mode: tx.mode || null,
    });
  }
  for (const bill of bills) {
    const base = `bill:${bill._id}`;
    (bill.items || []).forEach((item, index) => sources.push({
      id: `${base}:item:${index}`,
      recordId: String(bill._id),
      kind: 'bill-item',
      type: 'income',
      date: bill.billDate,
      amount: Number(item.total) || 0,
      name: bill.customerName || '',
      description: `${bill.billNumber} · ${item.name}`,
      mode: bill.paymentMode || null,
    }));
    const charges = [
      ['shipping', bill.shippingCharges],
      ['other', bill.otherCharges],
      ['round-off', bill.roundOff],
    ];
    charges.forEach(([label, amount]) => {
      if (Number(amount)) sources.push({
        id: `${base}:charge:${label}`,
        recordId: String(bill._id),
        kind: 'bill-charge',
        type: 'income',
        date: bill.billDate,
        amount: Number(amount),
        name: bill.customerName || '',
        description: `${bill.billNumber} · ${label}`,
        mode: bill.paymentMode || null,
      });
    });
  }
  return sources;
}

function money(value) { return Math.round((Number(value) || 0) * 100); }
function currency(cents) { return Number((cents / 100).toFixed(2)); }

function calculate(sources, input) {
  const selected = sources.filter((s) => input.selectedSourceIds.includes(s.id));
  const fundIds = new Set(input.fundSourceIds || []);
  const activeParticipants = (input.participants || [])
    .filter((p) => p.enabled !== false && String(p.name || '').trim() && Number(p.quantity) > 0)
    .map((p) => ({ name: String(p.name).trim(), referenceId: p.referenceId || null, quantity: Number(p.quantity) }));
  const familyParticipants = activeParticipants.filter((p) => p.name.toLowerCase() !== 'group fund');
  const expenses = selected.filter((s) => s.type === 'expense');
  const incomes = selected.filter((s) => s.type === 'income');
  const totalExpenseCents = expenses.reduce((sum, s) => sum + money(s.amount), 0);
  const fundCents = incomes.filter((s) => fundIds.has(s.id)).reduce((sum, s) => sum + money(s.amount), 0);
  const paidBy = Object.fromEntries(familyParticipants.map((p) => [p.name, 0]));
  for (const income of incomes) {
    if (fundIds.has(income.id)) continue;
    const name = income.name || '';
    if (Object.prototype.hasOwnProperty.call(paidBy, name)) paidBy[name] += money(income.amount);
  }
  const splitExpenseCents = input.groupFundMode === 'offset' ? Math.max(0, totalExpenseCents - fundCents) : totalExpenseCents;
  const quantityTotal = familyParticipants.reduce((sum, p) => sum + p.quantity, 0);
  const shares = {};
  let assigned = 0;
  familyParticipants.forEach((p, index) => {
    const share = index === familyParticipants.length - 1
      ? splitExpenseCents - assigned
      : Math.round(splitExpenseCents * p.quantity / quantityTotal);
    shares[p.name] = share;
    assigned += share;
  });
  const balances = familyParticipants.map((p) => ({
    name: p.name,
    quantity: p.quantity,
    paid: paidBy[p.name] || 0,
    fairShare: shares[p.name] || 0,
    balance: (paidBy[p.name] || 0) - (shares[p.name] || 0),
  }));

  // Fund-first: use a fund balance to cover deficits before family-to-family transfers.
  let availableFund = input.groupFundMode === 'participant' ? fundCents : 0;
  for (const item of balances) {
    if (item.balance < 0 && availableFund > 0) {
      const used = Math.min(availableFund, -item.balance);
      item.fundApplied = used;
      item.balance += used;
      availableFund -= used;
    } else item.fundApplied = 0;
  }
  const creditors = balances.filter((b) => b.balance > 0).map((b) => ({ ...b }));
  const debtors = balances.filter((b) => b.balance < 0).map((b) => ({ ...b, balance: -b.balance }));
  const settlements = [];
  for (const debtor of debtors) {
    for (const creditor of creditors) {
      if (!debtor.balance || !creditor.balance) continue;
      const amount = Math.min(debtor.balance, creditor.balance);
      settlements.push({ from: debtor.name, to: creditor.name, amount: currency(amount) });
      debtor.balance -= amount;
      creditor.balance -= amount;
    }
  }
  const remainingCredits = creditors.reduce((sum, item) => sum + item.balance, 0);
  const remainingDebts = debtors.reduce((sum, item) => sum + item.balance, 0);
  return {
    totalExpenses: currency(totalExpenseCents),
    totalIncome: currency(incomes.reduce((sum, s) => sum + money(s.amount), 0)),
    groupFund: currency(fundCents),
    groupFundRemaining: currency(availableFund),
    groupFundMode: input.groupFundMode,
    totalQuantity: quantityTotal,
    costPerPerson: quantityTotal ? currency(splitExpenseCents / quantityTotal) : 0,
    participants: balances.map((b) => ({ ...b, paid: currency(b.paid), fairShare: currency(b.fairShare), balance: currency(b.balance), fundApplied: currency(b.fundApplied || 0) })),
    settlements,
    selectedSourceCount: selected.length,
    reconciliation: currency(remainingCredits - remainingDebts),
    reconciliationStatus: remainingCredits === remainingDebts ? 'reconciled' : 'unbalanced'
  };
}

async function payload(req) {
  const { from, to } = range(req);
  const sources = await loadSources(req, from, to);
  const input = req.body || {};
  if (!Array.isArray(input.selectedSourceIds) || !Array.isArray(input.participants)) throw new Error('selectedSourceIds and participants are required');
  const validIds = new Set(sources.map((s) => s.id));
  const selectedSourceIds = input.selectedSourceIds.filter((id) => validIds.has(id));
  const fundSourceIds = (input.fundSourceIds || []).filter((id) => validIds.has(id) && selectedSourceIds.includes(id));
  return { from, to, sources, input: { ...input, selectedSourceIds, fundSourceIds } };
}

router.get('/sources', async (req, res) => {
  try {
    const { from, to } = range(req);
    const sources = await loadSources(req, from, to);
    const names = [...new Set(sources.map((s) => s.name).filter(Boolean))];
    res.json({ from, to, sources, participants: names.map((name) => ({ name, quantity: 1, enabled: true })) });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.post('/calculate', async (req, res) => {
  try { const { sources, input } = await payload(req); res.json(calculate(sources, input)); }
  catch (error) { res.status(400).json({ message: error.message }); }
});

router.get('/', async (req, res) => {
  const splits = await ExpenseSplit.find(shopFilter(req)).sort({ updatedAt: -1 }).lean();
  res.json(splits);
});

router.post('/', async (req, res) => {
  try {
    const { sources, input, from, to } = await payload(req);
    const calculation = calculate(sources, input);
    const split = await ExpenseSplit.create({ ...shopFilter(req), userId: req.user.id, title: input.title || 'Expense split', from, to, selectedSourceIds: input.selectedSourceIds, fundSourceIds: input.fundSourceIds, groupFundMode: input.groupFundMode || 'participant', participants: input.participants, calculation });
    res.status(201).json(split);
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.get('/:id', async (req, res) => {
  const split = await ExpenseSplit.findOne({ _id: req.params.id, ...shopFilter(req) }).lean();
  if (!split) return res.status(404).json({ message: 'Split not found' });
  res.json(split);
});

router.put('/:id', async (req, res) => {
  try {
    const { sources, input, from, to } = await payload(req);
    const calculation = calculate(sources, input);
    const split = await ExpenseSplit.findOneAndUpdate({ _id: req.params.id, ...shopFilter(req) }, { $set: { title: input.title || 'Expense split', from, to, selectedSourceIds: input.selectedSourceIds, fundSourceIds: input.fundSourceIds, groupFundMode: input.groupFundMode || 'participant', participants: input.participants, calculation } }, { new: true, runValidators: true }).lean();
    if (!split) return res.status(404).json({ message: 'Split not found' });
    res.json(split);
  } catch (error) { res.status(400).json({ message: error.message }); }
});

router.delete('/:id', async (req, res) => {
  const result = await ExpenseSplit.deleteOne({ _id: req.params.id, ...shopFilter(req) });
  if (!result.deletedCount) return res.status(404).json({ message: 'Split not found' });
  res.json({ success: true });
});

module.exports = router;
