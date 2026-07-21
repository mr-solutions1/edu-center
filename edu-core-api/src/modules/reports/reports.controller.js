import { UserRole } from '../../shared/constants/enums.js';
import { excelService } from '../../shared/services/excel.service.js';
import { pdfService } from '../../shared/services/pdf.service.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import FinancialLedger from '../ledger/ledger.model.js';
import Lesson from '../lessons/lesson.model.js';
import Payment from '../payments/payment.model.js';
import PayrollRecord from '../payroll/payrollRecord.model.js';
import StudentRegistration from '../students/registration.model.js';
import Student from '../students/student.model.js';
import Teacher from '../teachers/teacher.model.js';
import { SettingsService } from '../tenants/SettingsService.js';
import AccountingService from '../ledger/accounting.service.js';
import { FinancialCalculationService } from '../ledger/FinancialCalculationService.js';

/**
 * @desc    Get enterprise double-entry financial statements (Balance Sheet, Income Statement, Cash Flow)
 * @route   GET /api/v1/reports/financial-statements
 * @access  Private (Admin, Accountant)
 */
export const getFinancialStatements = asyncHandler(async (req, res) => {
  const { startDate, endDate, tenantId } = req.query;
  const activeTenantId = tenantId || req.user.tenantId || null;

  const statements = await AccountingService.generateFinancialStatements(
    activeTenantId,
    startDate,
    endDate
  );

  res.status(200).json({
    success: true,
    data: statements,
  });
});

/**
 * @desc    Get dashboard overview stats (dynamic & real-time)
 * @route   GET /api/v1/reports/overview
 * @access  Private (Admin, Accountant, Receptionist, Teacher, Student, Parent)
 */
export const getOverview = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999
  );

  // 1. Core Counts
  const [activeStudents, activeTeachers, parentsCount, activePackagesCount] =
    await Promise.all([
      Student.countDocuments({ status: 'ACTIVE' }),
      Teacher.countDocuments({ isActive: true }),
      Student.distinct('parentPhone', { deletedAt: null }).then(
        (arr) => arr.length
      ),
      StudentRegistration.countDocuments({ status: 'ACTIVE' }),
    ]);

  // 2. Remaining / Consumed Hours
  const hoursSum = await StudentRegistration.aggregate([
    { $match: { status: 'ACTIVE' } },
    {
      $group: {
        _id: null,
        totalPurchased: { $sum: '$purchasedHours' },
        totalConsumed: { $sum: '$consumedHours' },
      },
    },
  ]);
  const consumedHours = hoursSum[0]?.totalConsumed || 0;
  const remainingHours = Math.max(
    0,
    (hoursSum[0]?.totalPurchased || 0) - consumedHours
  );

  // 3. Financial Metrics from Ledger (Current Month)
  const currentMonthLedger = await FinancialLedger.aggregate([
    {
      $match: {
        transactionDate: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$direction', 'IN'] },
                  { $ne: ['$type', 'STUDENT_PAYMENT'] },
                ],
              },
              '$amount',
              0,
            ],
          },
        },
        totalExpense: {
          $sum: { $cond: [{ $eq: ['$direction', 'OUT'] }, '$amount', 0] },
        },
        teacherPayments: {
          $sum: {
            $cond: [{ $eq: ['$type', 'TEACHER_PAYMENT'] }, '$amount', 0],
          },
        },
      },
    },
  ]);

  const monthlyRevenue = currentMonthLedger[0]?.totalRevenue || 0;
  const monthlyExpenses = currentMonthLedger[0]?.totalExpense || 0;
  const teacherCost = currentMonthLedger[0]?.teacherPayments || 0;

  // Calculate Car Recovery from completed lessons of teachers using institute car this month (delegated to Domain Service - No N+1 queries)
  const completedLessonsThisMonth = await Lesson.find({
    lessonDate: { $gte: startOfMonth, $lte: endOfMonth },
    status: 'COMPLETED',
  }).populate('teacherId');

  const carRecovery = await FinancialCalculationService.calculateCarRecoveryForLessons(completedLessonsThisMonth);

  const instituteProfit = monthlyRevenue - monthlyExpenses;

  // Previous Month for Trends
  const prevMonthLedger = await FinancialLedger.aggregate([
    {
      $match: {
        transactionDate: { $gte: startOfPrevMonth, $lte: endOfPrevMonth },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$direction', 'IN'] },
                  { $ne: ['$type', 'STUDENT_PAYMENT'] },
                ],
              },
              '$amount',
              0,
            ],
          },
        },
        totalExpense: {
          $sum: { $cond: [{ $eq: ['$direction', 'OUT'] }, '$amount', 0] },
        },
      },
    },
  ]);
  const prevRevenue = prevMonthLedger[0]?.totalRevenue || 0;
  const prevExpenses = prevMonthLedger[0]?.totalExpense || 0;
  const prevProfit = prevRevenue - prevExpenses;

  const calculateTrend = (curr, prev) => {
    if (prev === 0) {
      return curr > 0 ? '+100%' : '0%';
    }
    const pct = Math.round(((curr - prev) / prev) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  };

  const revenueTrend = calculateTrend(monthlyRevenue, prevRevenue);
  const expensesTrend = calculateTrend(monthlyExpenses, prevExpenses);
  const profitTrend = calculateTrend(instituteProfit, prevProfit);

  // 4. Outstanding Student Balances
  const totalRegAmount = await StudentRegistration.aggregate([
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);
  const totalPaidAmt = await Payment.aggregate([
    { $match: { status: 'PAID' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const outstandingStudentBalances = Math.max(
    0,
    (totalRegAmount[0]?.total || 0) - (totalPaidAmt[0]?.total || 0)
  );

  // 5. Outstanding Teacher Dues
  const unpaidPayroll = await PayrollRecord.aggregate([
    { $match: { paid: false } },
    { $group: { _id: null, total: { $sum: '$finalAmount' } } },
  ]);
  const outstandingTeacherDues = unpaidPayroll[0]?.total || 0;

  // 6. Low Hour Alerts (remain Hours <= 2 per active package registration)
  const lowHoursAgg = await StudentRegistration.aggregate([
    { $match: { status: 'ACTIVE' } },
    {
      $project: {
        remaining: { $subtract: ['$purchasedHours', '$consumedHours'] },
      },
    },
    { $match: { remaining: { $lte: 2 } } },
  ]);
  const lowHourAlerts = lowHoursAgg.length;
  const renewalsRequired = lowHoursAgg.length;

  // 7. Today & Upcoming Lessons
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  const [todayLessons, upcomingLessonsCount] = await Promise.all([
    Lesson.countDocuments({
      lessonDate: { $gte: startOfToday, $lte: endOfToday },
    }),
    Lesson.countDocuments({
      lessonDate: { $gte: now },
      status: 'SCHEDULED',
    }),
  ]);

  // 8. Attendance Rate & Sessions stats
  const [completedSessions, cancelledSessions, noShowSessions] =
    await Promise.all([
      Lesson.countDocuments({ status: 'COMPLETED' }),
      Lesson.countDocuments({ status: 'CANCELLED' }),
      Lesson.countDocuments({ status: 'NO_SHOW' }),
    ]);
  const totalLessonsForRate = completedSessions + noShowSessions;
  const attendanceRate =
    totalLessonsForRate > 0
      ? Math.round((completedSessions / totalLessonsForRate) * 100)
      : 100;

  const stats = {
    activeStudents,
    activeTeachers,
    parents: parentsCount,
    registrations: activePackagesCount,
    activePackages: activePackagesCount,
    remainingHours,
    consumedHours,
    monthlyRevenue,
    monthlyExpenses,
    teacherCost,
    carRecovery,
    instituteProfit,
    outstandingStudentBalances,
    outstandingTeacherDues,
    lowHourAlerts,
    renewalsRequired,
    todayLessons,
    upcomingLessons: upcomingLessonsCount,
    attendanceRate,
    completedSessions,
    cancelledSessions,
    noShowSessions,
    revenueTrend,
    expensesTrend,
    profitTrend,
  };

  // Filter stats or add custom portal data based on role
  if (req.user.role === UserRole.TEACHER) {
    const teacher = await Teacher.findOne({
      userId: req.user._id || req.user.id,
    });
    if (teacher) {
      const upcoming = await Lesson.find({
        teacherId: teacher._id,
        lessonDate: { $gte: now },
        status: 'SCHEDULED',
      })
        .limit(5)
        .populate('studentId', 'parentName');

      stats.teacherUpcomingLessons = upcoming;
      stats.teacherCompletedLessonsCount = await Lesson.countDocuments({
        teacherId: teacher._id,
        lessonDate: { $gte: startOfMonth, $lte: endOfMonth },
        status: 'COMPLETED',
      });
    }
  }

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * @desc    Get report by teacher
 * @route   GET /api/v1/reports/by-teacher
 */
export const getByTeacherReport = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const report = await Lesson.aggregate([
    {
      $match: {
        lessonDate: { $gte: start, $lte: end },
        status: 'COMPLETED',
      },
    },
    {
      $group: {
        _id: '$teacherId',
        totalLessons: { $sum: 1 },
        grossValue: { $sum: '$lessonPrice' },
        teacherShare: { $sum: '$teacherEarnings' },
        instituteShare: { $sum: '$instituteRevenue' },
      },
    },
    {
      $lookup: {
        from: 'teachers',
        localField: '_id',
        foreignField: '_id',
        as: 'teacher',
      },
    },
    { $unwind: '$teacher' },
    {
      $lookup: {
        from: 'users',
        localField: 'teacher.userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        teacherName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
        totalLessons: 1,
        grossValue: 1,
        teacherShare: 1,
        instituteShare: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: report,
  });
});

/**
 * @desc    Get report by subject
 */
export const getBySubjectReport = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const report = await Lesson.aggregate([
    {
      $match: {
        lessonDate: { $gte: start, $lte: end },
        status: 'COMPLETED',
      },
    },
    {
      $group: {
        _id: '$subject',
        totalLessons: { $sum: 1 },
        grossValue: { $sum: '$lessonPrice' },
      },
    },
    { $sort: { grossValue: -1 } },
  ]);

  res.status(200).json({ success: true, data: report });
});

/**
 * @desc    Get report by level (grade)
 */
export const getByLevelReport = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const report = await Lesson.aggregate([
    {
      $match: {
        lessonDate: { $gte: start, $lte: end },
        status: 'COMPLETED',
      },
    },
    {
      $lookup: {
        from: 'students',
        localField: 'studentId',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: '$student' },
    {
      $group: {
        _id: '$student.grade',
        totalLessons: { $sum: 1 },
        grossValue: { $sum: '$lessonPrice' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({ success: true, data: report });
});

/**
 * @desc    Export report as CSV
 */
export const exportCSV = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  let csv = 'Teacher,Lessons,Gross,Teacher Share,Institute Share\n';

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const report = await Lesson.aggregate([
    {
      $match: {
        lessonDate: { $gte: start, $lte: end },
        status: 'COMPLETED',
      },
    },
    {
      $group: {
        _id: '$teacherId',
        totalLessons: { $sum: 1 },
        grossValue: { $sum: '$lessonPrice' },
        teacherShare: { $sum: '$teacherEarnings' },
        instituteShare: { $sum: '$instituteRevenue' },
      },
    },
    {
      $lookup: {
        from: 'teachers',
        localField: '_id',
        foreignField: '_id',
        as: 'teacher',
      },
    },
    { $unwind: '$teacher' },
    {
      $lookup: {
        from: 'users',
        localField: 'teacher.userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
  ]);

  report.forEach((row) => {
    const name = `${row.user.firstName} ${row.user.lastName}`;
    csv += `${name},${row.totalLessons},${row.grossValue},${row.teacherShare},${row.instituteShare}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=report-${month}-${year}.csv`
  );
  res.status(200).send(csv);
});

/**
 * @desc    Export report as PDF
 * @route   GET /api/v1/reports/export-pdf
 */
export const exportPDF = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const report = await Lesson.aggregate([
    {
      $match: {
        lessonDate: { $gte: start, $lte: end },
        status: 'COMPLETED',
      },
    },
    {
      $group: {
        _id: '$teacherId',
        totalLessons: { $sum: 1 },
        grossValue: { $sum: '$lessonPrice' },
        teacherShare: { $sum: '$teacherEarnings' },
        instituteShare: { $sum: '$instituteRevenue' },
      },
    },
    {
      $lookup: {
        from: 'teachers',
        localField: '_id',
        foreignField: '_id',
        as: 'teacher',
      },
    },
    { $unwind: '$teacher' },
    {
      $lookup: {
        from: 'users',
        localField: 'teacher.userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
  ]);

  const doc = pdfService.initDocument(
    res,
    `تقرير الأداء الشهري - ${month}/${year}`
  );

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=report-${month}-${year}.pdf`
  );

  pdfService.addHeader(doc, `تقرير المعلمين لشهر ${month} سنة ${year}`);

  const headers = [
    'المعلم',
    'عدد الحصص',
    'الإجمالي',
    'نصيب المعلم',
    'نصيب الأكاديمية',
  ];
  const colWidths = [150, 80, 80, 90, 90];

  const rows = report.map((row) => [
    `${row.user.firstName} ${row.user.lastName}`,
    row.totalLessons,
    (row.grossValue / 1000).toFixed(3),
    (row.teacherShare / 1000).toFixed(3),
    (row.instituteShare / 1000).toFixed(3),
  ]);

  pdfService.drawTable(doc, 140, headers, rows, colWidths);

  pdfService.addFooters(doc);
  doc.end();
});

/**
 * @desc    Export performance report as Excel (.xlsx)
 * @route   GET /api/v1/reports/export-excel
 */
export const exportExcel = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const report = await Lesson.aggregate([
    {
      $match: {
        lessonDate: { $gte: start, $lte: end },
        status: 'COMPLETED',
      },
    },
    {
      $group: {
        _id: '$teacherId',
        totalLessons: { $sum: 1 },
        grossValue: { $sum: '$lessonPrice' },
        teacherShare: { $sum: '$teacherEarnings' },
        instituteShare: { $sum: '$instituteRevenue' },
      },
    },
    {
      $lookup: {
        from: 'teachers',
        localField: '_id',
        foreignField: '_id',
        as: 'teacher',
      },
    },
    { $unwind: '$teacher' },
    {
      $lookup: {
        from: 'users',
        localField: 'teacher.userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
  ]);

  const headers = [
    'المعلم',
    'عدد الحصص المكتملة',
    'الإجمالي المالي (دينار)',
    'نصيب المعلم (دينار)',
    'نصيب الأكاديمية (دينار)',
  ];
  const rows = report.map((row) => [
    `${row.user.firstName} ${row.user.lastName}`,
    row.totalLessons,
    row.grossValue / 1000,
    row.teacherShare / 1000,
    row.instituteShare / 1000,
  ]);

  await excelService.exportToExcel(
    res,
    `تقرير_أداء_المعلمين_${month}_${year}`,
    `أداء المعلمين ${month}-${year}`,
    headers,
    rows,
    [25, 20, 20, 20, 20]
  );
});

/**
 * @desc    Export Student Report as PDF/Excel/CSV
 * @route   GET /api/v1/reports/export-students
 */
export const exportStudentsReport = asyncHandler(async (req, res) => {
  const { format = 'excel' } = req.query;

  const students = await Student.find().populate(
    'userId',
    'firstName lastName email'
  );

  // Gather registrations & calculate balances for each student
  const studentRows = await Promise.all(
    students.map(async (student) => {
      const balances =
        await import('../students/studentBalance.service.js').then((m) =>
          m.recalculateStudentBalances(student._id)
        );

      return {
        code: student.studentCode,
        name: student.parentName,
        phone: student.parentPhone,
        grade: student.grade,
        purchased: balances?.totalPurchasedHours || 0,
        consumed: balances?.totalConsumedHours || 0,
        remaining: balances?.remainingHours || 0,
        outstanding: (balances?.outstandingBalance || 0) / 1000,
        status: student.status === 'ACTIVE' ? 'نشط' : 'غير نشط',
      };
    })
  );

  const headers = [
    'كود الطالب',
    'ولي الأمر',
    'رقم الاتصال',
    'المرحلة الدراسية',
    'الساعات المشتراة',
    'الساعات المستهلكة',
    'الساعات المتبقية',
    'المستحق المالي المتبقي (د.ك)',
    'الحالة',
  ];

  if (format === 'excel') {
    const rows = studentRows.map((r) => [
      r.code,
      r.name,
      r.phone,
      r.grade,
      r.purchased,
      r.consumed,
      r.remaining,
      r.outstanding,
      r.status,
    ]);
    await excelService.exportToExcel(
      res,
      'تقرير_الطلاب',
      'تقرير الطلاب',
      headers,
      rows,
      [15, 25, 15, 18, 15, 15, 15, 22, 12]
    );
  } else if (format === 'csv') {
    let csv = headers.join(',') + '\n';
    studentRows.forEach((r) => {
      csv += `${r.code},${r.name},${r.phone},${r.grade},${r.purchased},${r.consumed},${r.remaining},${r.outstanding},${r.status}\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=students-report.csv'
    );
    res.status(200).send(Buffer.from('\uFEFF' + csv, 'utf-8')); // Add UTF-8 BOM for Excel Arabic compatibility!
  } else if (format === 'pdf') {
    const doc = pdfService.initDocument(
      res,
      'تقرير مستويات الطلاب الساعية والمالية'
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=students-report.pdf'
    );

    pdfService.addHeader(doc, 'تقرير مستويات الطلاب الساعية والمالية');

    const pdfHeaders = [
      'كود الطالب',
      'ولي الأمر',
      'المرحلة',
      'الساعات',
      'رصيد المتبقي',
      'المستحق (د.ك)',
    ];
    const colWidths = [80, 140, 80, 60, 60, 90];
    const pdfRows = studentRows.map((r) => [
      r.code,
      r.name,
      r.grade,
      r.purchased,
      r.remaining,
      r.outstanding.toFixed(3),
    ]);

    pdfService.drawTable(doc, 140, pdfHeaders, pdfRows, colWidths);
    pdfService.addFooters(doc);
    doc.end();
  }
});

/**
 * @desc    Export Attendance report as PDF/Excel/CSV
 * @route   GET /api/v1/reports/export-attendance
 */
export const exportAttendanceReport = asyncHandler(async (req, res) => {
  const { format = 'excel', startDate, endDate } = req.query;

  const filter = {};
  if (startDate || endDate) {
    filter.lessonDate = {};
    if (startDate) {
      filter.lessonDate.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.lessonDate.$lte = new Date(endDate);
    }
  }

  const lessons = await Lesson.find(filter)
    .populate('studentId', 'parentName grade')
    .populate('teacherId')
    .sort({ lessonDate: -1 });

  // Resolve teacher user details manually
  const attendanceRows = await Promise.all(
    lessons.map(async (l) => {
      const teacherUser = l.teacherId
        ? await import('../users/user.model.js').then((m) =>
            m.default.findById(l.teacherId.userId)
          )
        : null;
      const teacherName = teacherUser
        ? `${teacherUser.firstName} ${teacherUser.lastName}`
        : 'غير محدد';

      const statusMap = {
        SCHEDULED: 'مجدول',
        COMPLETED: 'حضر',
        CANCELLED: 'ألغيت',
        NO_SHOW: 'لم يحضر',
      };

      return {
        date: l.lessonDate.toLocaleDateString('ar-KW'),
        time: l.startTime,
        student: l.studentId?.parentName || 'غير محدد',
        teacher: teacherName,
        subject: l.subject,
        status: statusMap[l.status] || l.status,
      };
    })
  );

  const headers = [
    'تاريخ الحصة',
    'التوقيت',
    'الطالب',
    'المعلم',
    'المادة الدراسية',
    'الحالة',
  ];

  if (format === 'excel') {
    const rows = attendanceRows.map((r) => [
      r.date,
      r.time,
      r.student,
      r.teacher,
      r.subject,
      r.status,
    ]);
    await excelService.exportToExcel(
      res,
      'تقرير_حضور_الحصص',
      'حضور الحصص',
      headers,
      rows,
      [15, 12, 22, 22, 18, 15]
    );
  } else if (format === 'csv') {
    let csv = headers.join(',') + '\n';
    attendanceRows.forEach((r) => {
      csv += `${r.date},${r.time},${r.student},${r.teacher},${r.subject},${r.status}\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=attendance-report.csv'
    );
    res.status(200).send(Buffer.from('\uFEFF' + csv, 'utf-8'));
  } else if (format === 'pdf') {
    const doc = pdfService.initDocument(res, 'سجل حضور الحصص التفصيلي');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=attendance-report.pdf'
    );

    pdfService.addHeader(doc, 'سجل حضور حصص الطلاب التفصيلي');

    const pdfHeaders = ['تاريخ الحصة', 'التوقيت', 'الطالب', 'المعلم', 'الحالة'];
    const colWidths = [90, 70, 140, 140, 70];
    const pdfRows = attendanceRows.map((r) => [
      r.date,
      r.time,
      r.student,
      r.teacher,
      r.status,
    ]);

    pdfService.drawTable(doc, 140, pdfHeaders, pdfRows, colWidths);
    pdfService.addFooters(doc);
    doc.end();
  }
});

/**
 * @desc    Export Ledger report as PDF/Excel/CSV
 * @route   GET /api/v1/reports/export-ledger
 */
export const exportLedgerReport = asyncHandler(async (req, res) => {
  const { format = 'excel', startDate, endDate } = req.query;

  const filter = {};
  if (startDate || endDate) {
    filter.transactionDate = {};
    if (startDate) {
      filter.transactionDate.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.transactionDate.$lte = new Date(endDate);
    }
  }

  const entries = await FinancialLedger.find(filter)
    .populate('studentId', 'parentName')
    .populate('teacherId')
    .sort({ transactionDate: -1 });

  const ledgerRows = await Promise.all(
    entries.map(async (entry) => {
      let linkedName = '-';
      if (entry.studentId) {
        linkedName = entry.studentId.parentName;
      } else if (entry.teacherId) {
        const teacherUser = await import('../users/user.model.js').then((m) =>
          m.default.findById(entry.teacherId.userId)
        );
        if (teacherUser) {
          linkedName = `${teacherUser.firstName} ${teacherUser.lastName}`;
        }
      }

      const typeMap = {
        STUDENT_PAYMENT: 'دفعة طالب',
        TEACHER_PAYMENT: 'راتب معلم',
        EXPENSE: 'مصروفات',
        PACKAGE_PURCHASE: 'شراء حزمة',
        REFUND: 'استرجاع مالي',
        MANUAL_ADJUSTMENT: 'تعديل يدوي',
        TRANSPORT_DEDUCTION: 'خصم سيارة الأكاديمية',
      };

      return {
        date: entry.transactionDate.toLocaleDateString('ar-KW'),
        type: typeMap[entry.type] || entry.type,
        linked: linkedName,
        amount: (entry.amount / 1000).toFixed(3),
        direction: entry.direction === 'IN' ? 'وارد (IN)' : 'صادر (OUT)',
        description: entry.description,
      };
    })
  );

  const headers = [
    'التاريخ',
    'نوع الحركة',
    'الطرف المعني',
    'المبلغ (د.ك)',
    'الاتجاه',
    'تفاصيل البيان',
  ];

  if (format === 'excel') {
    const rows = ledgerRows.map((r) => [
      r.date,
      r.type,
      r.linked,
      parseFloat(r.amount),
      r.direction,
      r.description,
    ]);
    await excelService.exportToExcel(
      res,
      'دفتر_الأستاذ_المالي',
      'دفتر الأستاذ',
      headers,
      rows,
      [12, 15, 20, 15, 12, 35]
    );
  } else if (format === 'csv') {
    let csv = headers.join(',') + '\n';
    ledgerRows.forEach((r) => {
      csv += `${r.date},${r.type},${r.linked},${r.amount},${r.direction},${r.description}\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=financial-ledger.csv'
    );
    res.status(200).send(Buffer.from('\uFEFF' + csv, 'utf-8'));
  } else if (format === 'pdf') {
    const doc = pdfService.initDocument(res, 'دفتر الأستاذ المالي الموحد');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=financial-ledger.pdf'
    );

    pdfService.addHeader(doc, 'سجل المعاملات ودفتر الأستاذ المالي الموحد');

    const pdfHeaders = [
      'التاريخ',
      'نوع الحركة',
      'الطرف المعني',
      'المبلغ (د.ك)',
      'الاتجاه',
    ];
    const colWidths = [80, 100, 120, 80, 80];
    const pdfRows = ledgerRows.map((r) => [
      r.date,
      r.type,
      r.linked,
      r.amount,
      r.direction,
    ]);

    pdfService.drawTable(doc, 140, pdfHeaders, pdfRows, colWidths);
    pdfService.addFooters(doc);
    doc.end();
  }
});
