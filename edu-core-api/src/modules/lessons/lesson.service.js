import * as lessonRepository from './lesson.repository.js';
import { ConflictError } from '../../shared/errors/ConflictError.js';
import { NotFoundError } from '../../shared/errors/NotFoundError.js';
import * as auditLogger from '../../shared/services/auditLogger.service.js';
import { notificationService } from '../../shared/services/notification.service.js';
import { toFils } from '../../shared/utils/money.js';
import { withTransaction } from '../../shared/utils/withTransaction.js';
import PayrollTransaction from '../payroll/payrollTransaction.model.js';
import {
  calculateLessonEarnings,
  recalculateStudentBalances,
} from '../students/studentBalance.service.js';
import * as teacherRepository from '../teachers/teacher.repository.js';
import HourLedgerService from '../students/hourLedger.service.js';
import HourTransaction from '../students/hourTransaction.model.js';
import StudentRegistration from '../students/registration.model.js';

/**
 * Check for scheduling conflicts
 * Returns true if conflict exists
 */
const checkConflict = async (
  entityId,
  entityType,
  lessonDate,
  startTime,
  endTime,
  excludeLessonId = null
) => {
  const query = {
    lessonDate: new Date(lessonDate),
    _id: { $ne: excludeLessonId },
    status: { $ne: 'CANCELLED' },
    $or: [
      // Starts during another lesson
      { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
      // Ends during another lesson
      { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
      // Wraps around another lesson
      { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
    ],
  };

  if (entityType === 'teacher') {
    query.teacherId = entityId;
  } else {
    query.studentId = entityId;
  }

  const conflict = await lessonRepository.findOne(query);
  return conflict;
};

/**
 * Create a new lesson
 */
export const createLesson = async (lessonData, userId) => {
  return withTransaction(async (session) => {
    const { teacherId, studentId, lessonDate, startTime, endTime } = lessonData;

    // Convert price to fils
    const lessonPrice = toFils(lessonData.lessonPrice);

    // 1. Check teacher conflict
    const teacherConflict = await checkConflict(
      teacherId,
      'teacher',
      lessonDate,
      startTime,
      endTime
    );
    if (teacherConflict) {
      throw new ConflictError('المعلم لديه حصة أخرى في هذا الوقت');
    }

    // 2. Check student conflict
    const studentConflict = await checkConflict(
      studentId,
      'student',
      lessonDate,
      startTime,
      endTime
    );
    if (studentConflict) {
      throw new ConflictError('الطالب لديه حصة أخرى في هذا الوقت');
    }

    // 3. Get teacher for commission split
    const teacher = await teacherRepository.findById(teacherId, session);
    if (!teacher) {
      throw new NotFoundError('المعلم غير موجود');
    }

    // Resolve registration and subject at creation time to prevent historical rate drift
    let registrationId = lessonData.registrationId || null;
    let subject = lessonData.subject || null;
    if (!registrationId) {
      const matchQuery = { studentId };
      if (teacherId) matchQuery.teacherId = teacherId;
      if (lessonData.subject) matchQuery.subject = lessonData.subject;

      const reg = await StudentRegistration.findOne({ ...matchQuery, status: 'ACTIVE' })
        .sort({ registrationDate: -1 })
        .session(session);

      const matchedReg = reg || await StudentRegistration.findOne(matchQuery)
        .sort({ registrationDate: -1 })
        .session(session);

      if (matchedReg) {
        registrationId = matchedReg._id;
        subject = matchedReg.subject;
      }
    } else {
      const matchedReg = await StudentRegistration.findById(registrationId).session(session);
      if (matchedReg) {
        subject = matchedReg.subject;
      }
    }

    const earningsResult = await calculateLessonEarnings({
      studentId,
      teacherId,
      registrationId,
      subject,
      lessonPrice,
      educationalLevel: lessonData.educationalLevel,
      durationHours: lessonData.durationHours,
    });

    // 4. Create lesson
    const [lesson] = await lessonRepository.create(
      {
        ...lessonData,
        lessonPrice,
        registrationId,
        subject,
        teacherPercentage: teacher.teacherPercentage,
        institutePercentage: teacher.institutePercentage,
        teacherEarnings: earningsResult.teacherEarnings,
        instituteRevenue: earningsResult.instituteRevenue,
      },
      session
    );

    // Activity Log
    await auditLogger.logActivity({
      userId,
      action: 'CREATE_LESSON',
      entityType: 'Lesson',
      entityId: lesson._id,
      details: { lessonDate: lesson.lessonDate, startTime: lesson.startTime },
    });

    // 5. Write audit transaction
    await PayrollTransaction.create(
      [
        {
          lessonId: lesson._id,
          teacherId,
          userId,
          lessonPrice,
          teacherPercentage: teacher.teacherPercentage,
          institutePercentage: teacher.institutePercentage,
          teacherEarnings: earningsResult.teacherEarnings,
          instituteRevenue: earningsResult.instituteRevenue,
          action: 'CREATE',
          newValue: lesson.toObject(),
        },
      ],
      { session }
    );

    // 6. Hook point: Notification
    notificationService.notify({
      userId: teacher.userId,
      title: 'حصة جديدة',
      message: `تم حجز حصة جديدة لك في تاريخ ${lesson.lessonDate.toLocaleDateString('ar-KW')} الساعة ${lesson.startTime}`,
      type: 'LESSON_BOOKED',
    });

    return lesson;
  });
};

/**
 * Get all lessons
 */
export const getAllLessons = async (query = {}) => {
  const { teacherId, studentId, date, status } = query;
  const filter = {};
  if (teacherId) {
    filter.teacherId = teacherId;
  }
  if (studentId) {
    filter.studentId = studentId;
  }
  if (status) {
    filter.status = status;
  }
  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    filter.lessonDate = { $gte: startOfDay, $lte: endOfDay };
  }

  const lessons = await lessonRepository.find(filter, {
    populate: ['teacherId', 'studentId'],
  });

  return lessons.sort(
    (a, b) =>
      a.lessonDate - b.lessonDate || a.startTime.localeCompare(b.startTime)
  );
};

/**
 * Update lesson status (Attendance)
 */
export const updateLessonStatus = async (id, status, notes, userId) => {
  return withTransaction(async (session) => {
    const lesson = await lessonRepository.findById(id, session);
    if (!lesson) {
      throw new NotFoundError('الحصة غير موجودة');
    }

    const previousValue = lesson.toObject();
    lesson.status = status;
    if (notes) {
      lesson.notes = notes;
    }

    // Ensure lesson has registrationId resolved if not already present
    if (!lesson.registrationId) {
      const matchQuery = { studentId: lesson.studentId };
      if (lesson.teacherId) matchQuery.teacherId = lesson.teacherId;
      if (lesson.subject) matchQuery.subject = lesson.subject;

      const reg = await StudentRegistration.findOne({ ...matchQuery, status: 'ACTIVE' })
        .sort({ registrationDate: -1 })
        .session(session);

      const matchedReg = reg || await StudentRegistration.findOne(matchQuery)
        .sort({ registrationDate: -1 })
        .session(session);

      if (matchedReg) {
        lesson.registrationId = matchedReg._id;
        lesson.subject = matchedReg.subject;
      }
    }

    // Recalculate lesson earnings dynamically when status is updated (specifically for completion)
    const earningsResult = await calculateLessonEarnings(lesson);
    lesson.teacherEarnings = earningsResult.teacherEarnings;
    lesson.instituteRevenue = earningsResult.instituteRevenue;

    await lesson.save({ session });

    // Record or clear Hour Ledger transaction based on the new status
    if (status === 'COMPLETED') {
      let targetReg = null;
      if (lesson.registrationId) {
        targetReg = await StudentRegistration.findById(lesson.registrationId).session(session);
      }

      if (!targetReg) {
        targetReg = await StudentRegistration.findOne({
          studentId: lesson.studentId,
          status: 'ACTIVE',
        }).sort({ registrationDate: 1 }).session(session);
      }

      if (!targetReg) {
        targetReg = await StudentRegistration.findOne({
          studentId: lesson.studentId,
        }).sort({ registrationDate: -1 }).session(session);
      }

      if (targetReg) {
        // Double-check: ensure we link to the actual matched registration
        if (!lesson.registrationId) {
          lesson.registrationId = targetReg._id;
          lesson.subject = targetReg.subject;
          await lesson.save({ session });
        }

        const existingTx = await HourTransaction.findOne({
          lessonId: lesson._id,
        }).session(session);

        if (!existingTx) {
          await HourLedgerService.recordHourEntry(
            {
              studentId: lesson.studentId,
              registrationId: targetReg._id,
              lessonId: lesson._id,
              amount: -lesson.durationHours,
              type: 'CONSUMED',
              description: `حضور حصة مادة ${lesson.subject || targetReg.subject}`,
              performedBy: userId,
              transactionDate: lesson.lessonDate,
            },
            session
          );
        }
      }
    } else {
      // If transitioned away from COMPLETED, remove the CONSUMED ledger transaction if it exists
      const existingTx = await HourTransaction.findOne({
        lessonId: lesson._id,
      }).session(session);

      if (existingTx) {
        const regId = existingTx.registrationId;
        await HourTransaction.deleteOne({ _id: existingTx._id }).session(session);
        await HourLedgerService.updateRegistrationStatus(regId, session);
      }

      lesson.payrollRecordId = null;
    }

    // Recalculate student balances when lesson status changes (e.g. COMPLETED affects consumed hours)
    await recalculateStudentBalances(lesson.studentId);

    await PayrollTransaction.create(
      [
        {
          lessonId: lesson._id,
          teacherId: lesson.teacherId,
          userId,
          action: 'UPDATE',
          previousValue,
          newValue: lesson.toObject(),
        },
      ],
      { session }
    );

    // Activity Log
    await auditLogger.logActivity({
      userId,
      action: 'UPDATE_LESSON_STATUS',
      entityType: 'Lesson',
      entityId: lesson._id,
      details: { status, previousStatus: previousValue.status },
    });

    return lesson;
  });
};
