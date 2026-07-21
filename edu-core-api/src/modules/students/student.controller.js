import mongoose from 'mongoose';
import StudentRegistration from './registration.model.js';
import Student from './student.model.js';
import * as studentService from './student.service.js';
import {
  recalculateStudentBalances,
  calculateRegistrationWeeklyHours,
  calculateRegistrationTeacherDue,
} from './studentBalance.service.js';
import { StudentCalculationService } from './StudentCalculationService.js';
import { SettingsService } from '../tenants/SettingsService.js';
import { NotFoundError } from '../../shared/errors/NotFoundError.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';
import { logAuditTrail } from '../../shared/services/auditLogger.js';
import { generateCode } from '../../shared/utils/atomicCounter.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { withTransaction } from '../../shared/utils/withTransaction.js';
import {
  recordLedgerEntry,
  removeLedgerEntriesByReference,
} from '../ledger/ledger.service.js';
import HourLedgerService from './hourLedger.service.js';
import HourTransaction from './hourTransaction.model.js';

export const getStudentBalance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const balance = await recalculateStudentBalances(id, false);
  if (!balance) {
    throw new NotFoundError('الطالب غير موجود');
  }
  res.status(200).json({
    success: true,
    data: balance,
  });
});

export const getRegistrations = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const student = await Student.findById(id);
  const registrations = await StudentRegistration.find({ studentId: id })
    .populate('teacherId')
    .sort({ registrationDate: -1 });

  // Enrich with calculated Weekly Hours and Teacher Due dynamically
  const enriched = await Promise.all(
    registrations.map(async (reg) => {
      const weeklyHours = calculateRegistrationWeeklyHours(reg);
      const teacherDue = await calculateRegistrationTeacherDue(
        reg,
        student?.grade,
        student?.tenantId
      );

      const obj = reg.toObject();
      obj.weeklyHours = weeklyHours;
      obj.teacherDue = teacherDue;
      return obj;
    })
  );

  res.status(200).json({
    success: true,
    data: enriched,
  });
});

export const createRegistration = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    subject,
    purchasedHours,
    pricePerHour,
    teacherId,
    day1,
    from1,
    to1,
    day2,
    from2,
    to2,
    notes,
  } = req.body;

  const { priceInFils, discountPct, discountAmount, totalAmount } =
    await StudentCalculationService.calculateRegistrationTotals(
      id,
      pricePerHour,
      purchasedHours
    );

  const tenantId = req.user?.tenantId || null;
  const teacherPercentageSnapshot = await SettingsService.getTeacherPercentage(tenantId);

  // Perform with transaction to ensure ledger and registration are atomic
  const registration = await withTransaction(async (session) => {
    const registrationId = await generateCode('registrationId', 'REG', session);

    const [reg] = await StudentRegistration.create(
      [
        {
          studentId: id,
          registrationId,
          subject,
          purchasedHours,
          pricePerHour: priceInFils,
          teacherPercentageSnapshot,
          discountPercentage: discountPct,
          discountAmount,
          totalAmount,
          teacherId: teacherId || null,
          day1: day1 || null,
          from1: from1 || null,
          to1: to1 || null,
          day2: day2 || null,
          from2: from2 || null,
          to2: to2 || null,
          notes,
        },
      ],
      session ? { session } : {}
    );

    // Record ledger entry
    await recordLedgerEntry(
      {
        studentId: id,
        amount: totalAmount,
        type: 'PACKAGE_PURCHASE',
        direction: 'IN',
        referenceId: reg._id,
        referenceModel: 'StudentRegistration',
        description: `شراء حزمة ساعات جديدة - ${subject} - ${purchasedHours} ساعة`,
        performedBy: req.user._id,
      },
      session
    );

    // Record hour transaction in ledger
    await HourLedgerService.recordHourEntry(
      {
        studentId: id,
        registrationId: reg._id,
        amount: purchasedHours,
        type: 'PURCHASE',
        description: `شراء باقة ساعات - مادة ${subject}`,
        performedBy: req.user._id,
      },
      session
    );

    return reg;
  });

  // Trigger recalculation
  await recalculateStudentBalances(id, true);

  await logAuditTrail(req, {
    action: 'STUDENT_REGISTRATION_CREATED',
    entityType: 'StudentRegistration',
    entityId: registration._id,
    afterState: registration.toObject(),
  });

  res.status(201).json({
    success: true,
    data: registration,
  });
});

export const deleteRegistration = asyncHandler(async (req, res) => {
  const { id, regId } = req.params;

  await withTransaction(async (session) => {
    const registration = await StudentRegistration.findOne({ _id: regId, studentId: id }).session(session);
    if (!registration) {
      throw new NotFoundError('التسجيل غير موجود');
    }

    // Prevent deletion/cancellation once financial or study activity exists
    if (registration.consumedHours > 0) {
      throw new ValidationError('لا يمكن حذف أو إلغاء التسجيل بعد بدء استهلاك الحصص وحضور الطالب');
    }

    const Lesson = mongoose.model('Lesson');
    const hasCompletedLessons = await Lesson.exists({ registrationId: regId, status: 'COMPLETED' }).session(session);
    if (hasCompletedLessons) {
      throw new ValidationError('لا يمكن حذف أو إلغاء التسجيل لوجود حصص مكتملة مرتبطة به');
    }

    // Business cancellation & Soft Delete instead of hard-deleting financial history
    registration.status = 'CANCELLED';
    registration.deletedAt = new Date();
    registration.isDeleted = true;
    registration.deletedBy = req.user._id;
    await registration.save({ session });

    // 1. Record reversing financial ledger entry
    await recordLedgerEntry(
      {
        studentId: id,
        amount: registration.totalAmount,
        type: 'REFUND',
        direction: 'OUT',
        referenceId: registration._id,
        referenceModel: 'StudentRegistration',
        description: `عكس قيد شراء الباقة بسبب حذف التسجيل - مادة ${registration.subject}`,
        performedBy: req.user._id,
      },
      session
    );

    // 2. Record reversing Hour transaction entry
    await HourLedgerService.recordHourEntry(
      {
        studentId: id,
        registrationId: registration._id,
        amount: -registration.purchasedHours,
        type: 'REFUND',
        description: `عكس باقة ساعات بسبب حذف التسجيل - مادة ${registration.subject}`,
        performedBy: req.user._id,
      },
      session
    );

    await logAuditTrail(req, {
      action: 'STUDENT_REGISTRATION_DELETED',
      entityType: 'StudentRegistration',
      entityId: regId,
      beforeState: registration.toObject(),
    });
  });

  // Trigger recalculation
  await recalculateStudentBalances(id, true);

  res.status(204).send();
});

export const createStudent = asyncHandler(async (req, res) => {
  const {
    // Student basic fields
    studentName,
    studentPhone,
    parentName,
    parentPhone,
    whatsapp,
    governorate,
    area,
    address,
    googleMapsUrl,
    school,
    grade,
    classYear,
    curriculum,
    subjects,
    preferredTeacherGender,
    preferredSchedule,
    notes,
    dateOfBirth,
    enrollmentDate,
    status,
    monthlyFee,
    userId,
    siblingGroup,

    // Optional Registration Fields
    subject,
    purchasedHours,
    pricePerHour,
    teacherId,
    day1,
    from1,
    to1,
    day2,
    from2,
    to2,

    // Optional Initial Payment Fields
    initialPaidAmount,
    paymentMethod,
  } = req.body;

  const result = await withTransaction(async (session) => {
    // 1. Create Student
    const studentCode = await generateCode('studentCode', 'STD', session);
    const convertedMonthlyFee = mongoose.model('Student').schema.path('monthlyFee')
      ? (monthlyFee !== undefined ? (parseFloat(monthlyFee) * 1000) : 0) // convert to fils (or use helper)
      : 0;

    const studentData = {
      studentName,
      studentPhone,
      parentName,
      parentPhone,
      whatsapp,
      governorate,
      area,
      address,
      googleMapsUrl,
      school,
      grade,
      classYear,
      curriculum,
      subjects: subjects || [],
      preferredTeacherGender,
      preferredSchedule,
      notes,
      dateOfBirth,
      enrollmentDate,
      status,
      monthlyFee: convertedMonthlyFee,
      userId,
      siblingGroup,
      studentCode,
    };

    const [student] = await mongoose.model('Student').create(
      [studentData],
      session ? { session } : {}
    );

    // Sync Guardian immediately (since it matches on phone numbers)
    const { GuardianService } = await import('../guardians/guardian.service.js');
    await GuardianService.syncStudentWithGuardian(student);

    let registration = null;
    let payment = null;

    // 2. Optional Registration creation inside transaction (Handles both single subject & dynamic array lists)
    const academicRegistrations = req.body.academicRegistrations || [];
    if (subject && purchasedHours && pricePerHour) {
      academicRegistrations.push({
        subject,
        purchasedHours,
        pricePerHour,
        teacherPercentageSnapshot: req.body.teacherPercentageSnapshot || 75,
        teacherId: teacherId || null,
        day1: day1 || null,
        from1: from1 || null,
        to1: to1 || null,
        day2: day2 || null,
        from2: from2 || null,
        to2: to2 || null,
      });
    }

    const createdRegistrations = [];

    for (const academicReg of academicRegistrations) {
      if (academicReg.subject && academicReg.purchasedHours && academicReg.pricePerHour) {
        const { priceInFils, discountPct, discountAmount, totalAmount } =
          await StudentCalculationService.calculateRegistrationTotals(
            student._id,
            academicReg.pricePerHour,
            academicReg.purchasedHours,
            session
          );

        const tenantId = req.user?.tenantId || null;
        const defaultPercentage = await SettingsService.getTeacherPercentage(tenantId);
        const currentPercentageSnapshot = academicReg.teacherPercentageSnapshot !== undefined
          ? academicReg.teacherPercentageSnapshot
          : defaultPercentage;

        const registrationId = await generateCode('registrationId', 'REG', session);

        const [reg] = await StudentRegistration.create(
          [
            {
              studentId: student._id,
              registrationId,
              subject: academicReg.subject,
              purchasedHours: academicReg.purchasedHours,
              pricePerHour: priceInFils,
              teacherPercentageSnapshot: currentPercentageSnapshot,
              discountPercentage: discountPct,
              discountAmount,
              totalAmount,
              teacherId: academicReg.teacherId || null,
              day1: academicReg.day1 || null,
              from1: academicReg.from1 || null,
              to1: academicReg.to1 || null,
              day2: academicReg.day2 || null,
              from2: academicReg.from2 || null,
              to2: academicReg.to2 || null,
              day3: academicReg.day3 || null,
              from3: academicReg.from3 || null,
              to3: academicReg.to3 || null,
              notes,
            },
          ],
          session ? { session } : {}
        );

        createdRegistrations.push(reg);
        if (!registration) {
          registration = reg; // reference first created registration for payment allocation fallback
        }

        // Record ledger entry for package purchase
        await recordLedgerEntry(
          {
            studentId: student._id,
            amount: totalAmount,
            type: 'PACKAGE_PURCHASE',
            direction: 'IN',
            referenceId: reg._id,
            referenceModel: 'StudentRegistration',
            description: `شراء حزمة ساعات جديدة - ${academicReg.subject} - ${academicReg.purchasedHours} ساعة`,
            performedBy: req.user._id,
          },
          session
        );

        // Record hour transaction in ledger
        await HourLedgerService.recordHourEntry(
          {
            studentId: student._id,
            registrationId: reg._id,
            amount: academicReg.purchasedHours,
            type: 'PURCHASE',
            description: `شراء باقة ساعات - مادة ${academicReg.subject}`,
            performedBy: req.user._id,
          },
          session
        );
      }
    }

    // 3. Optional Initial Payment creation inside transaction
    if (initialPaidAmount && parseFloat(initialPaidAmount) > 0) {
      const filsAmount = Math.round(parseFloat(initialPaidAmount) * 1000);
      const PaymentModel = mongoose.model('Payment');

      const [p] = await PaymentModel.create(
        [
          {
            studentId: student._id,
            amount: filsAmount,
            status: 'PAID',
            paymentMethod: paymentMethod || 'CASH',
            notes: 'دفعة أولى عند التسجيل الجديد',
            paidDate: new Date(),
          },
        ],
        session ? { session } : {}
      );

      payment = p;

      // Record Ledger Entry
      await recordLedgerEntry(
        {
          studentId: student._id,
          amount: filsAmount,
          type: 'STUDENT_PAYMENT',
          direction: 'IN',
          referenceId: p._id,
          referenceModel: 'Payment',
          description: `دفعة مالية أولى عند التسجيل - ${p.notes || ''}`,
          transactionDate: p.paidDate || p.createdAt || new Date(),
          performedBy: req.user._id,
        },
        session
      );
    }

    // 4. Run chronological allocation FIFO across all created registrations
    if (createdRegistrations.length > 0 && payment) {
      const PaymentAllocation = mongoose.model('PaymentAllocation');
      let remainingPaymentAmount = payment.amount;

      for (const reg of createdRegistrations) {
        if (remainingPaymentAmount <= 0) break;

        const needed = reg.totalAmount - (reg.paidAmount || 0);
        if (needed <= 0) continue;

        const allocated = Math.min(remainingPaymentAmount, needed);
        if (allocated > 0) {
          reg.paidAmount = (reg.paidAmount || 0) + allocated;
          await reg.save({ session });

          await PaymentAllocation.create(
            [
              {
                paymentId: payment._id,
                registrationId: reg._id,
                studentId: student._id,
                amount: allocated,
                allocatedAt: payment.createdAt || new Date(),
              },
            ],
            session ? { session } : {}
          );

          remainingPaymentAmount -= allocated;
        }
      }
    }

    // Return created entities
    return { student, registration, payment };
  });

  // 5. Trigger final recalculation for student aggregates
  await recalculateStudentBalances(result.student._id, true);

  await logAuditTrail(req, {
    action: 'STUDENT_CREATED',
    entityType: 'Student',
    entityId: result.student._id,
    afterState: result.student.toObject ? result.student.toObject() : result.student,
  });

  if (result.registration) {
    await logAuditTrail(req, {
      action: 'STUDENT_REGISTRATION_CREATED',
      entityType: 'StudentRegistration',
      entityId: result.registration._id,
      afterState: result.registration.toObject(),
    });
  }

  res.status(201).json({
    success: true,
    data: result.student,
  });
});

export const getAllStudents = asyncHandler(async (req, res) => {
  const { students, pagination } = await studentService.getAllStudents(
    req.query
  );

  // Enrich each student with aggregated computed values
  const enriched = await Promise.all(
    students.map(async (student) => {
      const balances = await recalculateStudentBalances(student._id);
      const obj = student.toObject ? student.toObject() : student;
      return {
        ...obj,
        weeklyHours: balances?.weeklyHours || 0,
        totalBalance: balances?.totalPurchasedHours || 0,
        totalConsumed: balances?.totalConsumedHours || 0,
        remainingHours: balances?.remainingHours || 0,
        totalDue: balances?.totalRegistrationsAmount || 0,
        totalPaid: balances?.totalPaidPayments || 0,
        remainingAmount: balances?.outstandingBalance || 0,
        paymentStatus: balances?.paymentStatus || 'No Dues',
        balanceAlert: balances?.balanceAlert || 'OK',
      };
    })
  );

  res.status(200).json({
    success: true,
    data: enriched,
    meta: pagination,
  });
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await studentService.getStudentById(req.params.id);
  const balances = await recalculateStudentBalances(student._id);

  const obj = student.toObject ? student.toObject() : student;
  const enriched = {
    ...obj,
    weeklyHours: balances?.weeklyHours || 0,
    totalBalance: balances?.totalPurchasedHours || 0,
    totalConsumed: balances?.totalConsumedHours || 0,
    remainingHours: balances?.remainingHours || 0,
    totalDue: balances?.totalRegistrationsAmount || 0,
    totalPaid: balances?.totalPaidPayments || 0,
    remainingAmount: balances?.outstandingBalance || 0,
    paymentStatus: balances?.paymentStatus || 'No Dues',
    balanceAlert: balances?.balanceAlert || 'OK',
  };

  res.status(200).json({
    success: true,
    data: enriched,
  });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const beforeStudent = await studentService.getStudentById(req.params.id);
  const student = await studentService.updateStudent(req.params.id, req.body);

  await logAuditTrail(req, {
    action: 'STUDENT_UPDATED',
    entityType: 'Student',
    entityId: student._id,
    beforeState: beforeStudent.toObject
      ? beforeStudent.toObject()
      : beforeStudent,
    afterState: student.toObject ? student.toObject() : student,
  });

  res.status(200).json({
    success: true,
    data: student,
  });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const beforeStudent = await studentService.getStudentById(req.params.id);
  await studentService.deleteStudent(req.params.id);

  await logAuditTrail(req, {
    action: 'STUDENT_DELETED',
    entityType: 'Student',
    entityId: req.params.id,
    beforeState: beforeStudent.toObject
      ? beforeStudent.toObject()
      : beforeStudent,
  });

  res.status(204).send();
});

export const getTeacherStudents = asyncHandler(async (req, res) => {
  const students = await studentService.getStudentsByTeacherId(req.user.id);
  res.status(200).json({ success: true, data: students });
});

export const getStudentHourLedger = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const history = await HourLedgerService.getStudentHistory(id);
  res.status(200).json({
    success: true,
    data: history,
  });
});
