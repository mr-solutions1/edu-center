import * as teacherRepository from './teacher.repository.js';
import { NotFoundError } from '../../shared/errors/NotFoundError.js';
import { generateCode } from '../../shared/utils/atomicCounter.js';
import { toFils } from '../../shared/utils/money.js';
import { withTransaction } from '../../shared/utils/withTransaction.js';
import FinancialLedger from '../ledger/ledger.model.js';
import Lesson from '../lessons/lesson.model.js';
import StudentRegistration from '../students/registration.model.js';
import Student from '../students/student.model.js';
import { calculateRegistrationTeacherDue } from '../students/studentBalance.service.js';
import TenantSettings from '../tenants/tenantSettings.model.js';
import User from '../users/user.model.js';
import { getTenantContext } from '../../shared/utils/tenantContext.js';
import { UserRole } from '../../shared/constants/enums.js';

/**
 * Calculates real-time financial and educational metrics for a teacher
 *
 * @param {Object} teacher
 * @returns {Promise<Object>} Calculated metrics
 */
export const calculateTeacherMetrics = async (teacher) => {
  if (!teacher) {
    return null;
  }

  const teacherId = teacher._id;

  // 1. Registration Count
  const registrationCount = await StudentRegistration.countDocuments({
    teacherId,
  });

  // 2. Student Count
  const studentCount = await StudentRegistration.distinct('studentId', {
    teacherId,
  }).then((arr) => arr.length);

  // 3. Executed Hours (sum of consumed hours on completed lessons)
  const completedLessons = await Lesson.find({
    teacherId,
    status: 'COMPLETED',
  });
  const executedHours = completedLessons.reduce(
    (sum, l) => sum + (l.durationHours || 1),
    0
  );

  // 4. Gross Due (Sum of Teacher Due from Student Registrations)
  const regs = await StudentRegistration.find({ teacherId });
  let dueBeforeDeduction = 0;
  for (const reg of regs) {
    const student = await Student.findById(reg.studentId);
    const teacherDue = await calculateRegistrationTeacherDue(
      reg,
      student?.grade,
      student?.tenantId || teacher.tenantId
    );
    dueBeforeDeduction += teacherDue;
  }

  // 5. Transportation Deduction (calculated from completed lessons with car)
  let transportationDeduction = 0;
  if (teacher.usesInstituteCar) {
    const settings = await TenantSettings.findOne({
      tenantId: teacher.tenantId,
    });
    const deductionRate = settings?.financialRules?.transportationDeductionRate;
    const rateInFils =
      typeof deductionRate === 'number' ? toFils(deductionRate) : toFils(0.5); // Default 0.5 KWD
    transportationDeduction = completedLessons.length * rateInFils;
  }

  // 6. Net Due
  const netDue = Math.max(0, dueBeforeDeduction - transportationDeduction);

  // 7. Paid to Teacher (Sum of TEACHER_PAYMENT ledger entries)
  const payments = await FinancialLedger.find({
    teacherId,
    type: 'TEACHER_PAYMENT',
    direction: 'OUT',
  });
  const paidToTeacher = payments.reduce((sum, p) => sum + p.amount, 0);

  // 8. Remaining Due
  const remainingDue = Math.max(0, netDue - paidToTeacher);

  return {
    registrationCount,
    studentCount,
    executedHours,
    dueBeforeDeduction,
    transportationDeduction,
    netDue,
    paidToTeacher,
    remainingDue,
  };
};

/**
 * Create a new teacher
 */
export const createTeacher = async (teacherData) => {
  return withTransaction(async (session) => {
    let userId = teacherData.userId;

    // Auto-create a User if personal details are provided
    if (!userId && teacherData.firstName && teacherData.lastName && teacherData.email && teacherData.phone) {
      const context = getTenantContext();
      const tenantId = context?.tenantId || null;

      const [user] = await User.create(
        [
          {
            email: teacherData.email,
            firstName: teacherData.firstName,
            lastName: teacherData.lastName,
            phone: teacherData.phone,
            role: UserRole.TEACHER,
            passwordHash: teacherData.phone, // Password defaults to their phone number
            tenantId,
            tokenVersion: 0,
          },
        ],
        { session }
      );
      userId = user._id;
    }

    if (!userId) {
      throw new Error('رقم المستخدم أو تفاصيل الحساب الجديد مطلوبة لإنشاء معلم');
    }

    const employeeCode = await generateCode('employeeCode', 'TCH', session);
    const hourlyRate = toFils(teacherData.hourlyRate);

    const [teacher] = await teacherRepository.create(
      {
        ...teacherData,
        userId,
        employeeCode,
        hourlyRate,
      },
      session
    );
    return teacher;
  });
};

/**
 * Get all teachers with pagination and filtering
 */
export const getAllTeachers = async (query = {}) => {
  const { page = 1, limit = 10, search, isActive, department } = query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }
  if (department) {
    filter.department = department;
  }

  if (search) {
    // Basic search for now, could be improved with text index
    filter.$or = [
      { employeeCode: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } },
    ];
  }

  const [teachers, total] = await Promise.all([
    teacherRepository.find(filter, {
      skip,
      limit: Number(limit),
      sort: { createdAt: -1 },
      populate: { path: 'userId', select: 'firstName lastName email phone' },
    }),
    teacherRepository.countDocuments(filter),
  ]);

  const enrichedTeachers = await Promise.all(
    teachers.map(async (teacher) => {
      const metrics = await calculateTeacherMetrics(teacher);
      const obj = teacher.toObject ? teacher.toObject() : teacher;
      return {
        ...obj,
        metrics,
      };
    })
  );

  return {
    teachers: enrichedTeachers,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get teacher by ID
 */
export const getPublicTeacherProfile = async (id) => {
  const teacher = await teacherRepository.findById(id);
  if (!teacher) {
    throw new NotFoundError('المعلم غير موجود');
  }
  await teacher.populate('userId', 'firstName lastName avatarUrl');
  const obj = teacher.toObject ? teacher.toObject() : teacher;

  // Securely cherry-pick only non-sensitive public details
  return {
    _id: obj._id,
    userId: {
      firstName: obj.userId?.firstName || '',
      lastName: obj.userId?.lastName || '',
      avatarUrl: obj.userId?.avatarUrl || '',
    },
    employeeCode: obj.employeeCode,
    subjects: obj.subjects || [],
    gradesTaught: obj.gradesTaught || [],
    experienceYears: obj.experienceYears || 0,
    bio: obj.bio || '',
    department: obj.department || '',
    rating: obj.rating || 5,
    hireDate: obj.hireDate,
  };
};

export const getTeacherById = async (id) => {
  const teacher = await teacherRepository.findById(id);
  if (!teacher) {
    throw new NotFoundError('المعلم غير موجود');
  }
  await teacher.populate('userId', 'firstName lastName email phone');
  const metrics = await calculateTeacherMetrics(teacher);
  const obj = teacher.toObject ? teacher.toObject() : teacher;
  return {
    ...obj,
    metrics,
  };
};

/**
 * Get teacher by User ID
 */
export const getTeacherByUserId = async (userId) => {
  const teacher = await teacherRepository.findOne({ userId });
  if (!teacher) {
    throw new NotFoundError('بيانات المعلم غير موجودة');
  }
  await teacher.populate('userId', 'firstName lastName email phone');
  const metrics = await calculateTeacherMetrics(teacher);
  const obj = teacher.toObject ? teacher.toObject() : teacher;
  return {
    ...obj,
    metrics,
  };
};

/**
 * Update teacher
 */
export const updateTeacher = async (id, updateData) => {
  return withTransaction(async (session) => {
    const teacher = await teacherRepository.findById(id, session);
    if (!teacher) {
      throw new NotFoundError('المعلم غير موجود');
    }

    // Sync User details if personal details are provided
    if (teacher.userId && (updateData.firstName || updateData.lastName || updateData.email || updateData.phone)) {
      const userUpdate = {};
      if (updateData.firstName) userUpdate.firstName = updateData.firstName;
      if (updateData.lastName) userUpdate.lastName = updateData.lastName;
      if (updateData.email) userUpdate.email = updateData.email;
      if (updateData.phone) userUpdate.phone = updateData.phone;

      await User.findByIdAndUpdate(teacher.userId, userUpdate, { session });
    }

    const data = { ...updateData };
    if (data.hourlyRate !== undefined) {
      data.hourlyRate = toFils(data.hourlyRate);
    }

    const updatedTeacher = await teacherRepository.findByIdAndUpdate(id, data, { session });
    return updatedTeacher;
  });
};

/**
 * Soft delete teacher
 */
export const deleteTeacher = async (id) => {
  const teacher = await teacherRepository.findByIdAndUpdate(id, {
    deletedAt: new Date(),
    isActive: false,
  });
  if (!teacher) {
    throw new NotFoundError('المعلم غير موجود');
  }
  return teacher;
};
