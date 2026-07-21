import mongoose from 'mongoose';
import logger from './logger.js';
import { notificationService } from './notification.service.js';
import Lesson from '../../modules/lessons/lesson.model.js';
import Payment from '../../modules/payments/payment.model.js';
import Tenant from '../../modules/tenants/tenant.model.js';
import { runWithTenant } from '../utils/tenantContext.js';
import BackgroundJobLog from '../mongoose/backgroundJobLog.model.js';

/**
 * Claim daily job lock in a cluster deployment to guarantee single execution
 */
const claimDailyJobLock = async (jobName) => {
  const todayStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  const workerId = process.env.NODE_APP_INSTANCE || 'single_instance';

  try {
    const log = await BackgroundJobLog.create({
      jobName,
      executionDate: todayStr,
      status: 'RUNNING',
      workerId,
    });
    return log;
  } catch (err) {
    if (err.code === 11000) {
      logger.info(
        `[BackgroundJob] Job [${jobName}] already claimed/executed for date ${todayStr} by another cluster worker.`
      );
      return null;
    }
    logger.error(`[BackgroundJob] Lock claiming error for [${jobName}]: ${err.message}`);
    return null;
  }
};

/**
 * Update claimed daily job lock status
 */
const finalizeJobLock = async (lockDoc, status) => {
  if (!lockDoc) return;
  try {
    lockDoc.status = status;
    lockDoc.completedAt = new Date();
    await lockDoc.save();
  } catch (err) {
    logger.error(`[BackgroundJob] Failed to finalize lock for [${lockDoc.jobName}]: ${err.message}`);
  }
};

/**
 * Scoped daily Lesson Reminders (executed exactly once, isolated per tenant)
 */
export const triggerLessonReminders = async () => {
  const lock = await claimDailyJobLock('LESSON_REMINDERS');
  if (!lock) return;

  try {
    // 1. Fetch all tenants unscoped
    const tenants = await Tenant.find().setOptions({ bypassTenant: true });

    for (const tenant of tenants) {
      // 2. Execute scoped reminders under each tenant context
      await runWithTenant(tenant._id, null, async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);

        const dayEnd = new Date(tomorrow);
        dayEnd.setUTCHours(23, 59, 59, 999);

        const upcomingLessons = await Lesson.find({
          lessonDate: { $gte: tomorrow, $lte: dayEnd },
          status: 'SCHEDULED',
        }).populate('studentId teacherId');

        if (upcomingLessons.length > 0) {
          logger.info(
            `[Tenant: ${tenant._id}] Triggering reminders for ${upcomingLessons.length} lessons`
          );
        }

        for (const lesson of upcomingLessons) {
          // Notify Teacher
          if (lesson.teacherId && lesson.teacherId.userId) {
            await notificationService.notify({
              userId: lesson.teacherId.userId,
              title: 'تذكير بحصة غداً',
              message: `لديك حصة غداً: ${lesson.title} في تمام الساعة ${lesson.startTime}`,
              type: 'LESSON_REMINDER',
            });
          }

          // Notify Student (if they have a userId)
          if (lesson.studentId && lesson.studentId.userId) {
            await notificationService.notify({
              userId: lesson.studentId.userId,
              title: 'تذكير بحصة غداً',
              message: `لديك حصة غداً في تمام الساعة ${lesson.startTime}`,
              type: 'LESSON_REMINDER',
            });
          }
        }
      });
    }

    await finalizeJobLock(lock, 'SUCCESS');
  } catch (error) {
    logger.error('Error in triggerLessonReminders scheduled task:', error);
    await finalizeJobLock(lock, 'FAILED');
  }
};

/**
 * Scoped daily Payment Reminders (executed exactly once, isolated per tenant)
 */
export const triggerPaymentReminders = async () => {
  const lock = await claimDailyJobLock('PAYMENT_REMINDERS');
  if (!lock) return;

  try {
    // 1. Fetch all tenants unscoped
    const tenants = await Tenant.find().setOptions({ bypassTenant: true });

    for (const tenant of tenants) {
      // 2. Execute scoped payment reminders under each tenant context
      await runWithTenant(tenant._id, null, async () => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const overduePayments = await Payment.find({
          dueDate: { $lt: today },
          status: { $in: ['PENDING', 'PARTIALLY_PAID'] },
        }).populate('studentId');

        if (overduePayments.length > 0) {
          logger.info(
            `[Tenant: ${tenant._id}] Triggering reminders for ${overduePayments.length} overdue payments`
          );
        }

        for (const payment of overduePayments) {
          if (payment.studentId && payment.studentId.userId) {
            await notificationService.notify({
              userId: payment.studentId.userId,
              title: 'تنبيه دفع متأخر',
              message: `لديك دفعة متأخرة بمبلغ ${payment.amount} KD. يرجى السداد في أقرب وقت.`,
              type: 'PAYMENT_DUE',
            });
          }
        }
      });
    }

    await finalizeJobLock(lock, 'SUCCESS');
  } catch (error) {
    logger.error('Error in triggerPaymentReminders scheduled task:', error);
    await finalizeJobLock(lock, 'FAILED');
  }
};
