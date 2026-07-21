process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';
import request from 'supertest';

import { connectDB, closeDB, clearDB } from './setup.js';
import app from '../../src/app.js';
import User from '../../src/modules/users/user.model.js';
import Student from '../../src/modules/students/student.model.js';
import Guardian from '../../src/modules/guardians/guardian.model.js';

beforeAll(async () => await connectDB(), 20000);
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Guardian Domain & Automated Synchronization Integration', () => {
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

  test('should automatically create and link a Guardian record when a Student is created', async () => {
    // Create first student
    const studentRes = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentName: 'عبدالرحمن محمد العتيبي',
        studentPhone: '965112233',
        parentName: 'عبدالرحمن العتيبي',
        parentPhone: '96590001122',
        whatsapp: '96590001122',
        governorate: 'حولي',
        area: 'الجابرية',
        address: 'الكويت، الجابرية',
        grade: 'متوسط',
        classYear: 'الصف السادس',
        curriculum: 'مخرجات حكومي',
        status: 'ACTIVE',
      });

    expect(studentRes.status).toBe(201);
    expect(studentRes.body.success).toBe(true);

    const studentId = studentRes.body.data._id;

    // Retrieve Guardians list
    const guardiansRes = await request(app)
      .get('/api/v1/guardians')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(guardiansRes.status).toBe(200);
    expect(guardiansRes.body.success).toBe(true);
    expect(guardiansRes.body.data.length).toBe(1);

    const guardian = guardiansRes.body.data[0];
    expect(guardian.phone).toBe('96590001122');
    expect(guardian.firstName).toBe('عبدالرحمن');
    expect(guardian.lastName).toBe('العتيبي');
    expect(guardian.students.map(s => s._id.toString())).toContain(studentId);
  });

  test('should link a second sibling student automatically to the same Guardian record', async () => {
    // 1. Create first student
    const firstRes = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentName: 'عبدالعزيز العتيبي',
        parentName: 'عبدالعزيز العتيبي',
        parentPhone: '96590003344',
        governorate: 'حولي',
        area: 'سلوى',
        address: 'الكويت، سلوى',
        grade: 'متوسط',
        classYear: 'الصف السابع',
        curriculum: 'مخرجات حكومي',
        status: 'ACTIVE',
      });

    expect(firstRes.status).toBe(201);
    const firstId = firstRes.body.data._id;

    // 2. Create second student (Sibling) with same parentPhone
    const secondRes = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentName: 'فاطمة العتيبي',
        parentName: 'فاطمة العتيبي',
        parentPhone: '96590003344',
        governorate: 'حولي',
        area: 'سلوى',
        address: 'الكويت، سلوى',
        grade: 'ابتدائي',
        classYear: 'الصف الأول',
        curriculum: 'مخرجات حكومي',
        status: 'ACTIVE',
      });

    expect(secondRes.status).toBe(201);
    const secondId = secondRes.body.data._id;

    // 3. Verify there is still only exactly ONE Guardian record with both students linked!
    const guardiansRes = await request(app)
      .get('/api/v1/guardians')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(guardiansRes.body.data.length).toBe(1);

    const guardian = guardiansRes.body.data[0];
    const linkedIds = guardian.students.map(s => s._id.toString());
    expect(linkedIds).toContain(firstId);
    expect(linkedIds).toContain(secondId);
  });
});
