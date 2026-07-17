process.env.NODE_ENV = 'test';

import { connectDB, closeDB, clearDB } from '../integration/setup.js';
import mongoose from 'mongoose';
import Student from '../../src/modules/students/student.model.js';
import { runWithTenant } from '../../src/shared/utils/tenantContext.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Tenant Isolation - Update Operations', () => {
  it('should restrict updateOne/updateMany/findOneAndUpdate to current tenant context', async () => {
    const tenantA = new mongoose.Types.ObjectId();
    const tenantB = new mongoose.Types.ObjectId();

    // Create a student in Tenant B
    let studentBId;
    await runWithTenant(tenantB, null, async () => {
      const studentB = await Student.create({
        studentCode: 'STD002',
        parentName: 'Parent B',
        parentPhone: '87654321',
        address: 'Addr B',
        grade: 'متوسط',
      });
      studentBId = studentB._id;
    });

    // Attempt to update Tenant B student under Tenant A context
    await runWithTenant(tenantA, null, async () => {
      const result = await Student.updateOne(
        { _id: studentBId },
        { parentName: 'Hacked Parent Name' }
      );
      expect(result.matchedCount).toBe(0);

      const findOneAndUpdateRes = await Student.findOneAndUpdate(
        { _id: studentBId },
        { parentName: 'Hacked Parent' }
      );
      expect(findOneAndUpdateRes).toBeNull();
    });

    // Verify student B was NOT updated
    await runWithTenant(tenantB, null, async () => {
      const studentB = await Student.findById(studentBId);
      expect(studentB.parentName).toBe('Parent B');
    });
  });
});
