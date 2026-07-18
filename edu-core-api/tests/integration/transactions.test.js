process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';
import request from 'supertest';

import { connectDB, closeDB, clearDB } from './setup.js';
import app from '../../src/app.js';
import FinancialLedger from '../../src/modules/ledger/ledger.model.js';
import Transaction from '../../src/modules/ledger/transaction.model.js';
import User from '../../src/modules/users/user.model.js';

beforeAll(async () => await connectDB(), 20000);
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Financial Transactions Module Integration', () => {
  let adminToken;
  let adminUser;

  beforeEach(async () => {
    adminUser = await User.create({
      email: 'admin@example.com',
      passwordHash: 'password123',
      firstName: 'System',
      lastName: 'Admin',
      phone: '87654321',
      role: 'ADMIN',
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });

    adminToken = loginRes.body.data.accessToken;
  });

  test('should validate transaction parameters server-side', async () => {
    // 1. Check Amount > 0 validation
    const res1 = await request(app)
      .post('/api/v1/ledger/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'EXPENSE',
        expenseItem: 'Rent',
        amount: -5,
      });
    expect(res1.status).toBe(400);

    // 2. Check Name required for payments
    const res2 = await request(app)
      .post('/api/v1/ledger/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'STUDENT_PAYMENT',
        amount: 10,
      });
    expect(res2.status).toBe(400);

    // 3. Check Expense Item required for expenses
    const res3 = await request(app)
      .post('/api/v1/ledger/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'EXPENSE',
        amount: 50,
      });
    expect(res3.status).toBe(400);
  });

  test('should create expense transaction and ledger entry, and compute live running balances', async () => {
    // Record first transaction (STUDENT_PAYMENT) which increases balance
    const txn1 = await request(app)
      .post('/api/v1/ledger/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'STUDENT_PAYMENT',
        name: 'Mohammed Ali',
        amount: 100, // 100 KD
        paymentMethod: 'K-NET',
      });
    expect(txn1.status).toBe(201);
    expect(txn1.body.data.transactionId).toBeDefined();

    // Record second transaction (EXPENSE) which decreases balance
    const txn2 = await request(app)
      .post('/api/v1/ledger/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'EXPENSE',
        expenseItem: 'Rent',
        amount: 40, // 40 KD
        paymentMethod: 'TRANSFER',
      });
    expect(txn2.status).toBe(201);

    // List transactions to check running balance column
    const listRes = await request(app)
      .get('/api/v1/ledger/transactions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(2);

    // Dynamic running balance:
    // First transaction (STUDENT_PAYMENT: +100000 fils) -> remainingBalance = 100000 (100 KD)
    // Second transaction (EXPENSE: -40000 fils) -> remainingBalance = 60000 (60 KD)
    // Sorted by date descending, so newest (EXPENSE) is first in array
    const newest = listRes.body.data[0];
    const oldest = listRes.body.data[1];

    expect(oldest.remainingBalance).toBe(100000);
    expect(newest.remainingBalance).toBe(60000);

    // Verify corresponding FinancialLedger entries exist
    const ledgerList = await FinancialLedger.find();
    expect(ledgerList.length).toBe(2);
  });
});
