import fs from 'fs';
import path from 'path';

import jwt from 'jsonwebtoken';
import request from 'supertest';

import app from '../../../src/app.js';
import { env } from '../../../src/config/env.js';
import User from '../../../src/modules/users/user.model.js';
import { UserRole } from '../../../src/shared/constants/enums.js';
import { connectDB, closeDB, clearDB } from '../setup.js';

describe('Integration: New Features (Upload & PDF)', () => {
  let adminId;

  beforeAll(async () => {
    await connectDB();
    await clearDB();

    // Create admin for testing
    const admin = await User.create({
      email: 'test-admin-features@rakan.com',
      passwordHash: 'password123',
      firstName: 'Admin',
      lastName: 'Test',
      phone: '99999999',
      role: UserRole.ADMIN,
    });
    adminId = admin._id;

    await request(app).post('/api/v1/auth/login').send({
      email: 'test-admin-features@rakan.com',
      password: 'password123',
    });
  });

  afterAll(async () => {
    await closeDB();
  });

  describe('File Uploads', () => {
    it('should upload a user avatar successfully', async () => {
      const testImagePath = path.join(
        process.cwd(),
        'tests/fixtures/test-image.png'
      );
      if (!fs.existsSync(path.dirname(testImagePath))) {
        fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
      }
      // Write a real 1x1 transparent PNG file with valid magic bytes
      const pngBuffer = Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
        'hex'
      );
      fs.writeFileSync(testImagePath, pngBuffer);

      // Manual sign for debug
      const manualToken = jwt.sign(
        { id: adminId, role: 'ADMIN', tokenVersion: 0 },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      const res = await request(app)
        .patch(`/api/v1/users/${adminId}/avatar`)
        .set('Authorization', `Bearer ${manualToken}`)
        .attach('avatar', testImagePath);

      if (res.status === 401) {
        console.log(
          'Failing Auth with manual token:',
          JSON.stringify(res.body)
        );
      }

      expect(res.status).toBe(200);
    });
  });

  describe('PDF Generation', () => {
    it('should generate a PDF report with correct headers', async () => {
      const manualToken = jwt.sign(
        { id: adminId, role: 'ADMIN', tokenVersion: 0 },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
      const res = await request(app)
        .get('/api/v1/reports/export-pdf?month=1&year=2024')
        .set('Authorization', `Bearer ${manualToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
    });
  });

  describe('Multi-Format Report Exports', () => {
    let manualToken;

    beforeEach(() => {
      manualToken = jwt.sign(
        { id: adminId, role: 'ADMIN', tokenVersion: 0 },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
    });

    it('should export Teacher Performance Report as Excel', async () => {
      const res = await request(app)
        .get('/api/v1/reports/export-excel?month=5&year=2026')
        .set('Authorization', `Bearer ${manualToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    it('should export Student Report as CSV', async () => {
      const res = await request(app)
        .get('/api/v1/reports/export-students?format=csv')
        .set('Authorization', `Bearer ${manualToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
    });

    it('should export Student Report as PDF', async () => {
      const res = await request(app)
        .get('/api/v1/reports/export-students?format=pdf')
        .set('Authorization', `Bearer ${manualToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
    });

    it('should export Attendance Report as Excel', async () => {
      const res = await request(app)
        .get('/api/v1/reports/export-attendance?format=excel')
        .set('Authorization', `Bearer ${manualToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    it('should export Financial Ledger Report as Excel', async () => {
      const res = await request(app)
        .get('/api/v1/reports/export-ledger?format=excel')
        .set('Authorization', `Bearer ${manualToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });
  });

  describe('StudentRegistration Code Generation', () => {
    it('should generate a sparse unique registrationId automatically upon registration creation', async () => {
      const manualToken = jwt.sign(
        { id: adminId, role: 'ADMIN', tokenVersion: 0 },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      // 1. Create a dummy student first
      const studentRes = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${manualToken}`)
        .send({
          studentName: 'أحمد الفارابي',
          parentName: 'Al-Farabi Parent',
          parentPhone: '96512345',
          governorate: 'العاصمة',
          area: 'الروضة',
          address: 'Kuwait City',
          grade: 'ابتدائي',
          classYear: 'الصف الأول',
          curriculum: 'مخرجات حكومي',
        });

      expect(studentRes.status).toBe(201);
      const studentId = studentRes.body.data._id;

      // 2. Register a new package/subject for this student
      const regRes = await request(app)
        .post(`/api/v1/students/${studentId}/registrations`)
        .set('Authorization', `Bearer ${manualToken}`)
        .send({
          subject: 'Mathmatics',
          purchasedHours: 10,
          pricePerHour: 10, // 10 KD
        });

      expect(regRes.status).toBe(201);
      expect(regRes.body.data.registrationId).toBeDefined();
      expect(regRes.body.data.registrationId).toMatch(/^REG-\d{4}$/);
    });
  });
});
