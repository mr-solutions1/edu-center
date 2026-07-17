process.env.NODE_ENV = 'test';

import { connectDB, closeDB, clearDB } from '../integration/setup.js';
import mongoose from 'mongoose';
import Student from '../../src/modules/students/student.model.js';
import { runWithTenant } from '../../src/shared/utils/tenantContext.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Tenant Isolation - Aggregations', () => {
  it('should automatically prepend $match for tenant isolation to aggregate pipelines', async () => {
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

    // Run aggregation under Tenant A context
    await runWithTenant(tenantA, null, async () => {
      const results = await Student.aggregate([
        {
          $group: {
            _id: '$grade',
            count: { $sum: 1 },
          },
        },
      ]);

      expect(results).toHaveLength(1);
      expect(results[0]._id).toBe('ابتدائي');
      expect(results[0].count).toBe(1);
    });

    // Run aggregation under Tenant B context
    await runWithTenant(tenantB, null, async () => {
      const results = await Student.aggregate([
        {
          $group: {
            _id: '$grade',
            count: { $sum: 1 },
          },
        },
      ]);

      expect(results).toHaveLength(1);
      expect(results[0]._id).toBe('متوسط');
      expect(results[0].count).toBe(1);
    });
  });
});
