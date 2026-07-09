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
      fs.writeFileSync(testImagePath, 'fake image content');

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
});
