import * as teacherRepository from './teacher.repository.js';
import { NotFoundError } from '../../shared/errors/NotFoundError.js';
import { generateCode } from '../../shared/utils/atomicCounter.js';
import { toFils } from '../../shared/utils/money.js';
import { withTransaction } from '../../shared/utils/withTransaction.js';

/**
 * Create a new teacher
 */
export const createTeacher = async (teacherData) => {
  return withTransaction(async (session) => {
    const employeeCode = await generateCode('employeeCode', 'TCH', session);
    const hourlyRate = toFils(teacherData.hourlyRate);

    const [teacher] = await teacherRepository.create(
      {
        ...teacherData,
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

  return {
    teachers,
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
export const getTeacherById = async (id) => {
  const teacher = await teacherRepository.findById(id);
  if (!teacher) {
    throw new NotFoundError('المعلم غير موجود');
  }
  return teacher.populate('userId', 'firstName lastName email phone');
};

/**
 * Get teacher by User ID
 */
export const getTeacherByUserId = async (userId) => {
  const teacher = await teacherRepository.findOne({ userId });
  if (!teacher) {
    throw new NotFoundError('بيانات المعلم غير موجودة');
  }
  return teacher.populate('userId', 'firstName lastName email phone');
};

/**
 * Update teacher
 */
export const updateTeacher = async (id, updateData) => {
  const data = { ...updateData };
  if (data.hourlyRate !== undefined) {
    data.hourlyRate = toFils(data.hourlyRate);
  }

  const teacher = await teacherRepository.findByIdAndUpdate(id, data);
  if (!teacher) {
    throw new NotFoundError('المعلم غير موجود');
  }
  return teacher;
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
