import * as studentRepository from './student.repository.js';
import { NotFoundError } from '../../shared/errors/NotFoundError.js';
import { generateCode } from '../../shared/utils/atomicCounter.js';
import { toFils } from '../../shared/utils/money.js';
import { withTransaction } from '../../shared/utils/withTransaction.js';

/**
 * Create a new student
 */
export const createStudent = async (studentData) => {
  return withTransaction(async (session) => {
    const studentCode = await generateCode('studentCode', 'STD', session);
    const monthlyFee = toFils(studentData.monthlyFee);

    const [student] = await studentRepository.create(
      {
        ...studentData,
        studentCode,
        monthlyFee,
      },
      session
    );
    return student;
  });
};

/**
 * Get all students with pagination and filtering
 */
export const getAllStudents = async (query = {}) => {
  const { page = 1, limit = 10, search, status, grade } = query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (grade) {
    filter.grade = grade;
  }
  if (search) {
    filter.$text = { $search: search };
  }

  const [students, total] = await Promise.all([
    studentRepository.find(filter, {
      skip,
      limit: Number(limit),
      sort: { createdAt: -1 },
      populate: { path: 'userId', select: 'firstName lastName email' },
    }),
    studentRepository.countDocuments(filter),
  ]);

  return {
    students,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get student by ID
 */
export const getStudentById = async (id) => {
  const student = await studentRepository.findById(id);
  if (!student) {
    throw new NotFoundError('الطالب غير موجود');
  }
  return student.populate('userId', 'firstName lastName email');
};

/**
 * Update student
 */
export const updateStudent = async (id, updateData) => {
  const data = { ...updateData };
  if (data.monthlyFee !== undefined) {
    data.monthlyFee = toFils(data.monthlyFee);
  }

  const student = await studentRepository.findByIdAndUpdate(id, data);
  if (!student) {
    throw new NotFoundError('الطالب غير موجود');
  }
  return student;
};

/**
 * Get students for a specific teacher (via lessons)
 */
export const getStudentsByTeacherId = async (teacherUserId) => {
  const teacher = await import('../teachers/teacher.model.js').then((m) =>
    m.default.findOne({ userId: teacherUserId })
  );

  if (!teacher) {
    return [];
  }

  const lessons = await import('../lessons/lesson.model.js').then((m) =>
    m.default.find({ teacherId: teacher._id }).distinct('studentId')
  );

  return studentRepository.find({ _id: { $in: lessons } });
};

/**
 * Soft delete student
 */
export const deleteStudent = async (id) => {
  const student = await studentRepository.findByIdAndUpdate(id, {
    deletedAt: new Date(),
    status: 'WITHDRAWN',
  });
  if (!student) {
    throw new NotFoundError('الطالب غير موجود');
  }
  return student;
};
