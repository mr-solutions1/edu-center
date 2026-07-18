import ParentStudent from './parentStudent.model.js';
import Student from './student.model.js';
import { recalculateStudentBalances } from './studentBalance.service.js';
import { AppError } from '../../shared/errors/AppError.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import Group from '../groups/group.model.js';
import Lesson from '../lessons/lesson.model.js';
import Payment from '../payments/payment.model.js';

// Get Student Portal Dashboard Overview
export const getStudentDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Find associated student profile
  const student = await Student.findOne({ userId });
  if (!student) {
    throw new AppError(
      'لم يتم العثور على سجل طالب مرتبط بهذا الحساب الموحد',
      404
    );
  }

  // Recalculate student hours and outstanding financial balances
  const balances = await recalculateStudentBalances(student._id);

  // 1. Fetch upcoming lessons
  const upcomingLessons = await Lesson.find({
    studentId: student._id,
    lessonDate: { $gte: new Date().setHours(0, 0, 0, 0) },
    status: 'SCHEDULED',
  })
    .sort({ lessonDate: 1, startTime: 1 })
    .limit(5)
    .populate('teacherId', 'firstName lastName');

  // 2. Fetch recent attendance (completed, absent, late, or excused lessons)
  const recentAttendance = await Lesson.find({
    studentId: student._id,
    lessonDate: { $lte: new Date() },
    status: { $in: ['COMPLETED', 'ABSENT', 'LATE', 'EXCUSED'] },
  })
    .sort({ lessonDate: -1 })
    .limit(10)
    .populate('teacherId', 'firstName lastName');

  // 3. Fetch payment balance & recent invoices
  const payments = await Payment.find({ studentId: student._id })
    .sort({ dueDate: -1 })
    .limit(10);

  const outstandingBalance = balances?.outstandingBalance ?? 0;
  const remainingHours = balances?.remainingHours ?? 0;
  const totalPurchasedHours = balances?.totalPurchasedHours ?? 0;
  const totalConsumedHours = balances?.totalConsumedHours ?? 0;

  // 4. Fetch associated groups
  const groups = await Group.find({ students: student._id }).populate(
    'courseId',
    'name subject'
  );

  const lowHoursAlert = remainingHours <= 2;

  res.status(200).json({
    success: true,
    data: {
      profile: student,
      upcomingLessons,
      recentAttendance,
      payments,
      outstandingBalance,
      remainingHours,
      totalPurchasedHours,
      totalConsumedHours,
      groups,
      lowHoursAlert,
      alertMessage: lowHoursAlert ? 'رصيد ساعاتك منخفض (ساعتان أو أقل). يرجى تجديد الحزمة فوراً.' : null,
    },
  });
});

// Get Parent Portal Dashboard Overview
export const getParentDashboard = asyncHandler(async (req, res) => {
  const parentId = req.user._id;

  // Find linked students
  const parentStudentLinks = await ParentStudent.find({ parentId }).populate(
    'studentId'
  );
  if (parentStudentLinks.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        children: [],
        upcomingLessons: [],
        outstandingPayments: [],
        recentActivities: [],
      },
    });
  }

  const studentIds = parentStudentLinks
    .map((link) => link.studentId?._id)
    .filter(Boolean);

  // Recalculate balances for all children and attach them
  const children = await Promise.all(
    parentStudentLinks.map(async (link) => {
      const studentId = link.studentId?._id;
      const balances = studentId ? await recalculateStudentBalances(studentId) : null;
      const hasLowHours = balances ? balances.remainingHours <= 2 : false;
      return {
        student: link.studentId,
        relationship: link.relationshipType,
        isPrimary: link.isPrimary,
        balances,
        lowHoursAlert: hasLowHours,
        alertMessage: hasLowHours ? `رصيد ساعات ابنكم ${link.studentId?.parentName || ''} منخفض جداً. يرجى التجديد.` : null,
      };
    })
  );

  const parentAlertsCount = children.filter((child) => child.lowHoursAlert).length;

  // 1. Fetch combined upcoming lessons for all children
  const upcomingLessons = await Lesson.find({
    studentId: { $in: studentIds },
    lessonDate: { $gte: new Date().setHours(0, 0, 0, 0) },
    status: 'SCHEDULED',
  })
    .sort({ lessonDate: 1, startTime: 1 })
    .limit(5)
    .populate('studentId', 'parentName grade')
    .populate('teacherId', 'firstName lastName');

  // 2. Fetch combined payments / outstanding invoices for all children
  const payments = await Payment.find({ studentId: { $in: studentIds } })
    .sort({ dueDate: -1 })
    .populate('studentId', 'parentName studentCode');

  const outstandingPayments = payments.filter(
    (p) => p.status === 'PENDING' || p.status === 'PARTIALLY_PAID'
  );

  // 3. Fetch recent attendance / status changes
  const recentActivities = await Lesson.find({
    studentId: { $in: studentIds },
    status: { $in: ['COMPLETED', 'ABSENT', 'LATE', 'EXCUSED'] },
  })
    .sort({ lessonDate: -1 })
    .limit(10)
    .populate('studentId', 'parentName studentCode grade')
    .populate('teacherId', 'firstName lastName');

  res.status(200).json({
    success: true,
    data: {
      children,
      upcomingLessons,
      outstandingPayments,
      recentActivities,
      lowHoursAlertsCount: parentAlertsCount,
    },
  });
});
