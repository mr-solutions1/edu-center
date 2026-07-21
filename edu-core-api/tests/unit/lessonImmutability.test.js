process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';
import { connectDB, closeDB, clearDB } from '../integration/setup.js';
import { runWithTenant } from '../../src/shared/utils/tenantContext.js';
import Lesson from '../../src/modules/lessons/lesson.model.js';
import PayrollRecord from '../../src/modules/payroll/payrollRecord.model.js';
import * as lessonService from '../../src/modules/lessons/lesson.service.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Lesson Immutability Lock Engine Suite', () => {
  it('should block editing lessons once they are linked to a finalized payroll record', async () => {
    const tenantId = new mongoose.Types.ObjectId();

    await runWithTenant(tenantId, null, async () => {
      // 1. Create a payroll record in PENDING_APPROVAL state (finalized)
      const pr = await PayrollRecord.create({
        teacherId: new mongoose.Types.ObjectId(),
        month: 5,
        year: 2026,
        status: 'PENDING_APPROVAL',
      });

      // 2. Create a lesson linked to that payroll record
      const lesson = await Lesson.create({
        studentId: new mongoose.Types.ObjectId(),
        teacherId: new mongoose.Types.ObjectId(),
        payrollRecordId: pr._id,
        title: 'Immutability test',
        dayOfWeek: 'Monday',
        startTime: '10:00',
        endTime: '11:00',
        lessonDate: new Date(),
        lessonPrice: 10000,
        status: 'COMPLETED',
      });

      // 3. Attempt to update lesson status - should throw an error because payroll is PENDING_APPROVAL
      let err = null;
      try {
        await lessonService.updateLessonStatus(lesson._id, 'SCHEDULED', 'notes', new mongoose.Types.ObjectId());
      } catch (e) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect(err.message).toContain('لا يمكن تعديل حصة مغلقة ومدرجة في كشف الرواتب المعتمد');

      // 4. Reset payroll status to CALCULATED (reopened)
      pr.status = 'CALCULATED';
      await pr.save();

      // 5. Attempt to update lesson status again - should succeed!
      const updated = await lessonService.updateLessonStatus(
        lesson._id,
        'SCHEDULED',
        'notes',
        new mongoose.Types.ObjectId()
      );
      expect(updated.status).toBe('SCHEDULED');
      expect(updated.payrollRecordId).toBeNull(); // Transitioning away from COMPLETED clears the lock link!
    });
  });
});
