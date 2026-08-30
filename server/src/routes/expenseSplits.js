const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const ExpenseSplit = require('../models/ExpenseSplit');

const router = express.Router();
router.use(auth);

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

function normalizeDisplayName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesParticipantName(sourceName, participantName) {
  const sourceText = normalizeDisplayName(sourceName);
  const participantText = normalizeDisplayName(participantName);
  if (!sourceText || !participantText) return false;

  if (sourceText === participantText) return true;

  const sourceWords = new Set(sourceText.split(' '));
  const participantWords = new Set(participantText.split(' '));
  const commonWords = [...sourceWords].filter((word) => word.length > 1 && participantWords.has(word));
  if (commonWords.length > 0) return true;

  return sourceText.includes(participantText) || participantText.includes(sourceText);
}

function calculate(sources, input) {
  const selected = sources.filter((s) => input.selectedSourceIds.includes(s.id));
  const fundIds = new Set(input.fundSourceIds || []);
  const activeParticipants = (input.participants || [])
    .filter((p) => p.enabled !== false && String(p.name || '').trim() && Number(p.quantity) > 0)
    .map((p) => ({ name: String(p.name).trim(), referenceId: p.referenceId || null, quantity: Number(p.quantity) }));
  const familyParticipants = activeParticipants.filter((p) => normalizeDisplayName(p.name) !== 'group fund');
  const expenses = selected.filter((s) => s.type === 'expense');
  const incomes = selected.filter((s) => s.type === 'income');
  const totalExpenseCents = expenses.reduce((sum, s) => sum + money(s.amount), 0);
  const totalIncomeCents = incomes.reduce((sum, s) => sum + money(s.amount), 0);
  const fundCents = incomes.filter((s) => fundIds.has(s.id)).reduce((sum, s) => sum + money(s.amount), 0);
  const paidBy = Object.fromEntries(familyParticipants.map((p) => [p.name, 0]));
  const personalExpenseClaims = Object.fromEntries(familyParticipants.map((p) => [p.name, 0]));
  const creditExpenseClaims = Object.fromEntries(familyParticipants.map((p) => [p.name, 0]));

  let personalCreditCents = 0;

  for (const expense of expenses) {
    const participantName = familyParticipants.find((p) => matchesParticipantName(`${expense.name || ''} ${expense.description || ''}`, p.name));
    if (participantName) {
      const amount = money(expense.amount);
      paidBy[participantName.name] += amount;
      if (expense.mode === 'credit') {
        creditExpenseClaims[participantName.name] += amount;
        personalCreditCents += amount;
      } else {
        personalExpenseClaims[participantName.name] += amount;
      }
    }
  }

  const sharedExpenseCents = Math.max(0, totalExpenseCents - personalCreditCents);
  const groupFundBaseCents = fundCents > 0 ? fundCents : Math.max(0, totalIncomeCents - sharedExpenseCents);

  for (const income of incomes) {
    if (fundIds.has(income.id)) continue;
    const name = income.name || '';
    if (Object.prototype.hasOwnProperty.call(paidBy, name)) paidBy[name] += money(income.amount);
  }

  const splitExpenseCents = input.groupFundMode === 'offset' ? Math.max(0, sharedExpenseCents - groupFundBaseCents) : sharedExpenseCents;
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
    personalExpense: personalExpenseClaims[p.name] || 0,
    balance: (paidBy[p.name] || 0) - (shares[p.name] || 0),
  }));

  const fundBeforeReimbursement = groupFundBaseCents;
  const fundAllocationByName = Object.fromEntries(familyParticipants.map((p) => [p.name, 0]));
  let availableFund = input.groupFundMode === 'participant' ? groupFundBaseCents : 0;
  const fundAllocations = [];

  for (const item of balances.filter((entry) => entry.balance > 0).sort((a, b) => b.balance - a.balance)) {
    if (availableFund <= 0) break;
    const used = Math.min(availableFund, item.balance);
    if (used <= 0) continue;
    availableFund -= used;
    fundAllocationByName[item.name] = used;
    fundAllocations.push({ from: 'Group Fund', to: item.name, amount: currency(used) });
  }

  const settlementBalances = balances.map((item) => {
    const fundApplied = fundAllocationByName[item.name] || 0;
    return {
      ...item,
      fundApplied,
      remainingBalance: item.balance > 0 ? item.balance - fundApplied : item.balance,
    };
  });

  const finalReceivers = settlementBalances
    .filter((b) => (b.remainingBalance || 0) > 0)
    .map((b) => ({ ...b, remaining: b.remainingBalance }));
  const finalPayers = settlementBalances
    .filter((b) => b.balance < 0)
    .map((b) => ({ ...b, remaining: Math.abs(b.balance) }));

  const settlements = [];
  for (const debtor of finalPayers) {
    let remainingDebt = debtor.remaining;
    for (const creditor of finalReceivers) {
      if (remainingDebt <= 0 || creditor.remaining <= 0) continue;
      const amount = Math.min(remainingDebt, creditor.remaining);
      if (amount <= 0) continue;
      settlements.push({ from: debtor.name, to: creditor.name, amount: currency(amount) });
      remainingDebt -= amount;
      creditor.remaining -= amount;
    }
  }

  const reimbursements = balances
    .filter((entry) => (entry.personalExpense || 0) > 0)
    .map((entry) => ({
      name: entry.name,
      amount: currency(entry.personalExpense),
      reason: 'Personal expense reimbursement',
    }));

  const remainingCredits = finalReceivers.reduce((sum, item) => sum + item.remainingBalance, 0);
  const remainingDebts = finalPayers.reduce((sum, item) => sum + Math.abs(item.balance), 0);
  const groupPayouts = fundAllocations.map((item) => ({ from: 'Group Fund', to: item.to, amount: item.amount }));
  const combinedSettlements = [...groupPayouts, ...settlements];

  return {
    totalExpenses: currency(sharedExpenseCents),
    totalIncome: currency(totalIncomeCents),
    creditExpenses: currency(personalCreditCents),
    groupFund: currency(fundCents),
    groupFundBeforeReimbursement: currency(fundBeforeReimbursement),
    groupFundRemaining: currency(fundBeforeReimbursement),
    groupFundAfterReimbursement: currency(availableFund),
    groupFundUsed: currency(Math.max(0, fundBeforeReimbursement - availableFund)),
    groupFundMode: input.groupFundMode,
    groupFundAllocations: fundAllocations,
    groupPayouts,
    reimbursements,
    totalQuantity: quantityTotal,
    costPerPerson: quantityTotal ? currency(splitExpenseCents / quantityTotal) : 0,
    participants: balances.map((b) => ({
      ...b,
      paid: currency(b.paid),
      fairShare: currency(b.fairShare),
      personalExpense: currency(b.personalExpense),
      creditExpense: currency(creditExpenseClaims[b.name] || 0),
      balance: currency(b.balance),
      fundApplied: currency(b.fundApplied || 0),
    })),
    settlements,
    combinedSettlements,
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
