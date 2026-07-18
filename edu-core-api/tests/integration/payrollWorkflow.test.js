process.env.NODE_ENV = 'test';

import request from 'supertest';
import mongoose from 'mongoose';

import { connectDB, closeDB, clearDB } from './setup.js';
import app from '../../src/app.js';
import User from '../../src/modules/users/user.model.js';
import Teacher from '../../src/modules/teachers/teacher.model.js';
import PayrollRecord from '../../src/modules/payroll/payrollRecord.model.js';
import FinancialLedger from '../../src/modules/ledger/ledger.model.js';

beforeAll(async () => await connectDB(), 20000);
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Teacher Settlement Workflow Integration', () => {
  let adminToken;
  let adminUser;
  let teacherUser;
  let teacherDoc;

  beforeEach(async () => {
    // 1. Create Admin
    adminUser = await User.create({
      email: 'admin-payroll@rakan.com',
      passwordHash: 'password123',
      firstName: 'System',
      lastName: 'Admin',
      phone: '11112222',
      role: 'ADMIN',
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin-payroll@rakan.com', password: 'password123' });

    adminToken = loginRes.body.data.accessToken;

    // 2. Create Teacher User & Teacher profile
    teacherUser = await User.create({
      email: 'teacher@rakan.com',
      passwordHash: 'password123',
      firstName: 'Ahmad',
      lastName: 'Ali',
      phone: '22223333',
      role: 'TEACHER',
    });

    teacherDoc = await Teacher.create({
      userId: teacherUser._id,
      employeeCode: 'TEA-101',
      commissionModel: 'SEVENTY_THIRTY',
      teacherPercentage: 0.70,
      institutePercentage: 0.30,
      compensationType: 'PER_LESSON', // Non-hourly so payroll recalculation is allowed
      usesInstituteCar: true,
      isActive: true,
    });
  });

  test('should execute complete settlement workflow and record ledger entry', async () => {
    // 1. Recalculate payroll (generate initial DRAFT -> CALCULATED record)
    const generateRes = await request(app)
      .post('/api/v1/payroll/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        teacherId: teacherDoc._id.toString(),
        month: 5,
        year: 2026,
      });

    expect(generateRes.status).toBe(200);
    expect(generateRes.body.success).toBe(true);
    expect(generateRes.body.data.status).toBe('CALCULATED');
    const recordId = generateRes.body.data._id;

    // 2. Submit for Approval
    const submitRes = await request(app)
      .patch(`/api/v1/payroll/${recordId}/submit-approval`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('PENDING_APPROVAL');

    // 3. Approve Payroll
    const approveRes = await request(app)
      .patch(`/api/v1/payroll/${recordId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // 4. Pay Payroll & sync with Ledger
    const payRes = await request(app)
      .patch(`/api/v1/payroll/${recordId}/paid`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.status).toBe('PAID');
    expect(payRes.body.data.paid).toBe(true);
    expect(payRes.body.data.paidDate).toBeDefined();

    // Verify Financial Ledger Entry
    const ledgerEntries = await FinancialLedger.find({
      referenceId: recordId,
      type: 'TEACHER_PAYMENT',
    });

    expect(ledgerEntries.length).toBe(1);
    expect(ledgerEntries[0].amount).toBe(payRes.body.data.finalAmount);
    expect(ledgerEntries[0].direction).toBe('OUT');
  });
});
