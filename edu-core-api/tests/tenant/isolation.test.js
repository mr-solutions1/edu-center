process.env.NODE_ENV = 'test';

import { connectDB, closeDB, clearDB } from '../integration/setup.js';
import { runWithTenant } from '../../src/shared/utils/tenantContext.js';
import mongoose from 'mongoose';
import Student from '../../src/modules/students/student.model.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Tenant Isolation - General Scoping', () => {
  it('should only return documents belonging to the active tenant context', async () => {
    const tenantA = new mongoose.Types.ObjectId();
    const tenantB = new mongoose.Types.ObjectId();

    // Create a student in Tenant A
    await runWithTenant(tenantA, null, async () => {
      await Student.create({
        studentCode: 'STD001',
        parentName: 'Parent A',
        parentPhone: '12345678',
        address: 'Addr A',
        grade: 'ابتدائي',
      });
    });

    // Create a student in Tenant B
    await runWithTenant(tenantB, null, async () => {
      await Student.create({
        studentCode: 'STD002',
        parentName: 'Parent B',
        parentPhone: '87654321',
        address: 'Addr B',
        grade: 'متوسط',
      });
    });

    // Query under Tenant A context
    await runWithTenant(tenantA, null, async () => {
      const students = await Student.find({});
      expect(students).toHaveLength(1);
      expect(students[0].studentCode).toBe('STD001');
      expect(students[0].tenantId.toString()).toBe(tenantA.toString());
    });

    // Query under Tenant B context
    await runWithTenant(tenantB, null, async () => {
      const students = await Student.find({});
      expect(students).toHaveLength(1);
      expect(students[0].studentCode).toBe('STD002');
      expect(students[0].tenantId.toString()).toBe(tenantB.toString());
    });
  });
});
