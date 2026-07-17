process.env.NODE_ENV = 'test';

import { connectDB, closeDB, clearDB } from '../integration/setup.js';
import mongoose from 'mongoose';
import Student from '../../src/modules/students/student.model.js';
import User from '../../src/modules/users/user.model.js';
import { runWithTenant } from '../../src/shared/utils/tenantContext.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Tenant Isolation - Populate Scoping', () => {
  it('should restrict populated references to the current tenant context', async () => {
    const tenantA = new mongoose.Types.ObjectId();
    const tenantB = new mongoose.Types.ObjectId();

    let userAId;
    let studentAId;

    // Create User & Student in Tenant A
    await runWithTenant(tenantA, null, async () => {
      const userA = await User.create({
        email: 'userA@tenantA.com',
        passwordHash: 'pass123',
        firstName: 'User',
        lastName: 'A',
        phone: '11111111',
        tenantId: tenantA,
      });
      userAId = userA._id;

      const studentA = await Student.create({
        studentCode: 'STD001',
        parentName: 'Parent A',
        parentPhone: '12345678',
        address: 'Addr A',
        grade: 'ابتدائي',
        userId: userAId,
      });
      studentAId = studentA._id;
    });

    // Verify populating Student in Tenant A context succeeds
    await runWithTenant(tenantA, null, async () => {
      const student = await Student.findById(studentAId).populate('userId');
      expect(student).not.toBeNull();
      expect(student.userId).not.toBeNull();
      expect(student.userId.email).toBe('usera@tenanta.com');
    });

    // Attempting to query Student A from Tenant B context should return null due to query isolation
    await runWithTenant(tenantB, null, async () => {
      const student = await Student.findById(studentAId).populate('userId');
      expect(student).toBeNull();
    });
  });
});
