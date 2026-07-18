process.env.NODE_ENV = 'test';

import request from 'supertest';
import mongoose from 'mongoose';

import { connectDB, closeDB, clearDB } from './setup.js';
import app from '../../src/app.js';
import User from '../../src/modules/users/user.model.js';
import FinancialLedger from '../../src/modules/ledger/ledger.model.js';

beforeAll(async () => await connectDB(), 20000);
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Financial Ledger Integration', () => {
  let adminToken;
  let adminUser;

  beforeEach(async () => {
    // Create an admin user and log in to get bearer token
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

  test('should create a manual adjustment ledger entry and retrieve it', async () => {
    const referenceId = new mongoose.Types.ObjectId();

    // Create entry
    const createRes = await request(app)
      .post('/api/v1/ledger')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 50000, // 50 KWD in fils
        type: 'MANUAL_ADJUSTMENT',
        direction: 'IN',
        referenceId: referenceId.toString(),
        referenceModel: 'ManualAdjustment',
        description: 'تعديل يدوي وارد للميزانية',
        notes: 'ملاحظات إضافية',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.amount).toBe(50000);

    // List entries
    const listRes = await request(app)
      .get('/api/v1/ledger')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0].type).toBe('MANUAL_ADJUSTMENT');

    // Get stats
    const summaryRes = await request(app)
      .get('/api/v1/ledger/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.success).toBe(true);
    expect(summaryRes.body.data.totalIncome).toBe(50000);
    expect(summaryRes.body.data.totalExpense).toBe(0);
    expect(summaryRes.body.data.netProfit).toBe(50000);
  });
});
