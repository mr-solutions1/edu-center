process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';

import Student from '../../src/modules/students/student.model.js';
import { runWithTenant } from '../../src/shared/utils/tenantContext.js';
import { connectDB, closeDB, clearDB } from '../integration/setup.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Tenant Isolation - Super Admin Overrides', () => {
  it('should bypass tenant isolation filters when calling ignoreTenant() or withoutTenantScope()', async () => {
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

    // Run query inside Tenant A, but calling .ignoreTenant()
    await runWithTenant(tenantA, null, async () => {
      const allStudents = await Student.find({}).ignoreTenant();
      expect(allStudents).toHaveLength(2); // Overridden: returns both Student A and Student B!
    });

    // Run query inside Tenant B, but calling .withoutTenantScope()
    await runWithTenant(tenantB, null, async () => {
      const allStudents = await Student.find({}).withoutTenantScope();
      expect(allStudents).toHaveLength(2); // Overridden: returns both Student A and Student B!
    });
  });
});
