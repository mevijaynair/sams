// FMSS Contracts — football contract & fee management
// PORT=3002, reverse proxied via Caddy at contracts.fmss.ae

import express from 'express';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(import.meta.url).replace(/\/[^/]*$/, '');
const PORT = process.env.PORT || 3002;

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Mock data — replace with real DB (SQLite/Postgres)
const contracts = [
  {
    id: 'c1',
    playerName: 'John Doe',
    playerEmail: 'john@academy.dev',
    contractType: 'Monthly',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    monthlyFee: 450,
    status: 'active',
    signed: true,
    signingDate: '2024-12-20'
  }
];

const payments = [
  { id: 'p1', contractId: 'c1', amount: 450, dueDate: '2025-01-15', paidDate: '2025-01-10', status: 'paid' },
  { id: 'p2', contractId: 'c1', amount: 450, dueDate: '2025-02-15', paidDate: null, status: 'due' }
];

// ─── API Routes ───────────────────────────────────────────────────────────
app.get('/api/contracts', (req, res) => {
  res.json(contracts);
});

app.post('/api/contracts', (req, res) => {
  const { playerName, playerEmail, contractType, startDate, endDate, monthlyFee } = req.body;
  if (!playerName || !playerEmail || !monthlyFee) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const contract = {
    id: `c-${Date.now()}`,
    playerName,
    playerEmail,
    contractType: contractType || 'Monthly',
    startDate,
    endDate,
    monthlyFee: parseFloat(monthlyFee),
    status: 'draft',
    signed: false
  };
  contracts.push(contract);
  res.status(201).json(contract);
});

app.get('/api/contracts/:contractId', (req, res) => {
  const contract = contracts.find(c => c.id === req.params.contractId);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  const contractPayments = payments.filter(p => p.contractId === contract.id);
  res.json({ ...contract, payments: contractPayments });
});

app.patch('/api/contracts/:contractId/sign', (req, res) => {
  const contract = contracts.find(c => c.id === req.params.contractId);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  contract.signed = true;
  contract.signingDate = new Date().toISOString();
  contract.status = 'active';
  res.json(contract);
});

app.get('/api/payments', (req, res) => {
  const { status } = req.query;
  const filtered = status ? payments.filter(p => p.status === status) : payments;
  res.json(filtered);
});

app.post('/api/payments/:paymentId/record-payment', (req, res) => {
  const payment = payments.find(p => p.id === req.params.paymentId);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  payment.paidDate = new Date().toISOString();
  payment.status = 'paid';
  res.json(payment);
});

app.get('/api/dashboard', (req, res) => {
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const totalMonthlyFee = contracts.reduce((sum, c) => sum + (c.monthlyFee || 0), 0);
  const pendingPayments = payments.filter(p => p.status === 'due').length;
  const pendingAmount = payments
    .filter(p => p.status === 'due')
    .reduce((sum, p) => sum + p.amount, 0);
  res.json({
    totalContracts,
    activeContracts,
    totalMonthlyFee,
    pendingPayments,
    pendingAmount
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'contracts', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`📋 FMSS Contracts running on port ${PORT}`);
  console.log(`   → https://contracts.fmss.ae (via Caddy)`);
});
