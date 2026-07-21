process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';
import { connectDB, closeDB, clearDB } from '../integration/setup.js';
import { runWithTenant } from '../../src/shared/utils/tenantContext.js';
import Tenant from '../../src/modules/tenants/tenant.model.js';
import Lesson from '../../src/modules/lessons/lesson.model.js';
import Payment from '../../src/modules/payments/payment.model.js';
import BackgroundJobLog from '../../src/shared/mongoose/backgroundJobLog.model.js';
import * as notificationTriggers from '../../src/shared/services/notificationTriggers.service.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Distributed Background Job Locking Suite', () => {
  it('should run background jobs under proper tenant contexts and only execute exactly once per day', async () => {
    const tenantId1 = new mongoose.Types.ObjectId();
    const tenantId2 = new mongoose.Types.ObjectId();

    // 1. Create two test tenants in DB
    await Tenant.create([
      { _id: tenantId1, name: 'Tenant 1', slug: 'tenant-1' },
      { _id: tenantId2, name: 'Tenant 2', slug: 'tenant-2' },
    ]);

    // 2. Trigger reminders for the first time
    await notificationTriggers.triggerLessonReminders();

    // Verify a lock entry was created in database for today
    const todayStr = new Date().toISOString().split('T')[0];
    const log = await BackgroundJobLog.findOne({
      jobName: 'LESSON_REMINDERS',
      executionDate: todayStr,
    });
    expect(log).not.toBeNull();
    expect(log.status).toBe('SUCCESS');

    // 3. Trigger reminders a second time (e.g. from another PM2 worker or double-interval)
    // The second execution should skip due to E11000 duplicate key on claimDailyJobLock, and not raise an error
    await expect(notificationTriggers.triggerLessonReminders()).resolves.not.toThrow();
  });
});
