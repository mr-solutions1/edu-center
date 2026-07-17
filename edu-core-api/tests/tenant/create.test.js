process.env.NODE_ENV = 'test';

import { connectDB, closeDB, clearDB } from '../integration/setup.js';
import { runWithTenant } from '../../src/shared/utils/tenantContext.js';
import mongoose from 'mongoose';
import Student from '../../src/modules/students/student.model.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Tenant Isolation - Document Creation', () => {
  it('should automatically inject tenantId on save()', async () => {
    const tenantId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      const student = new Student({
        studentCode: 'STD001',
        parentName: 'Parent A',
        parentPhone: '12345678',
        address: 'Addr A',
        grade: 'ابتدائي',
      });
      await student.save();

      expect(student.tenantId).toBeDefined();
      expect(student.tenantId.toString()).toBe(tenantId.toString());
    });
  });

  it('should automatically inject tenantId on insertMany()', async () => {
    const tenantId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      const students = await Student.insertMany([
        {
          studentCode: 'STD001',
          parentName: 'Parent A',
          parentPhone: '12345678',
          address: 'Addr A',
          grade: 'ابتدائي',
        },
        {
          studentCode: 'STD002',
          parentName: 'Parent B',
          parentPhone: '87654321',
          address: 'Addr B',
          grade: 'متوسط',
        },
      ]);

      expect(students).toHaveLength(2);
      expect(students[0].tenantId.toString()).toBe(tenantId.toString());
      expect(students[1].tenantId.toString()).toBe(tenantId.toString());
    });
  });
});
