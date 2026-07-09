import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Models
import User from './src/modules/users/user.model.js';
import Teacher from './src/modules/teachers/teacher.model.js';
import Student from './src/modules/students/student.model.js';
import Lesson from './src/modules/lessons/lesson.model.js';
import Payment from './src/modules/payments/payment.model.js';
import { UserRole, Gender, EducationalLevels, StudentStatus, LessonStatus, PaymentStatus, CompensationType } from './src/shared/constants/enums.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is missing from .env');
  process.exit(1);
}

async function seedData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding...');

    // Clear existing data
    console.log('🧹 Clearing old data...');
    await Promise.all([
      Teacher.deleteMany({}),
      Student.deleteMany({}),
      Lesson.deleteMany({}),
      Payment.deleteMany({}),
      User.deleteMany({ role: { $ne: UserRole.ADMIN } })
    ]);

    const salt = await bcrypt.genSalt(12);
    const commonPasswordHash = await bcrypt.hash('password123', salt);

    console.log('👤 Creating Users & Teachers...');
    const teacherUsers = await User.insertMany([
      {
        email: 'ahmed.teacher@rakan.com',
        passwordHash: commonPasswordHash,
        firstName: 'أحمد',
        lastName: 'علي',
        phone: '90001111',
        role: UserRole.TEACHER,
        isActive: true
      },
      {
        email: 'sara.teacher@rakan.com',
        passwordHash: commonPasswordHash,
        firstName: 'سارة',
        lastName: 'محمود',
        phone: '90002222',
        role: UserRole.TEACHER,
        isActive: true
      },
      {
        email: 'mona.teacher@rakan.com',
        passwordHash: commonPasswordHash,
        firstName: 'منى',
        lastName: 'العنزي',
        phone: '90003333',
        role: UserRole.TEACHER,
        isActive: true
      }
    ]);

    const teachers = await Teacher.insertMany([
      {
        userId: teacherUsers[0]._id,
        employeeCode: 'TCH001',
        subjects: ['رياضيات', 'فيزياء'],
        gradesTaught: ['ثانوي', 'متوسط'],
        gender: Gender.MALE,
        hourlyRate: 15000,
        compensationType: CompensationType.PER_LESSON,
        isActive: true
      },
      {
        userId: teacherUsers[1]._id,
        employeeCode: 'TCH002',
        subjects: ['لغة عربية', 'تربية إسلامية'],
        gradesTaught: ['ابتدائي', 'متوسط'],
        gender: Gender.FEMALE,
        hourlyRate: 12000,
        compensationType: CompensationType.PER_LESSON,
        isActive: true
      },
      {
        userId: teacherUsers[2]._id,
        employeeCode: 'TCH003',
        subjects: ['لغة إنجليزية'],
        gradesTaught: ['ثانوي'],
        gender: Gender.FEMALE,
        hourlyRate: 14000,
        compensationType: CompensationType.PER_LESSON,
        isActive: true
      }
    ]);

    console.log('🎓 Creating Students...');
    const students = await Student.insertMany([
      {
        studentCode: 'STU001',
        parentName: 'محمد جاسم',
        parentPhone: '60001111',
        area: 'حولي',
        address: 'شارع تونس، ق 4',
        grade: 'الصف العاشر',
        subjects: ['رياضيات'],
        status: StudentStatus.ACTIVE,
        monthlyFee: 50000
      },
      {
        studentCode: 'STU002',
        parentName: 'فاطمة العتيبي',
        parentPhone: '60002222',
        area: 'السالمية',
        address: 'شارع الخليج، ق 2',
        grade: 'الصف الثامن',
        subjects: ['لغة عربية'],
        status: StudentStatus.ACTIVE,
        monthlyFee: 40000
      },
      {
        studentCode: 'STU003',
        parentName: 'بدر ناصر',
        parentPhone: '60003333',
        area: 'الجابرية',
        address: 'ق 1، شارع 10',
        grade: 'الصف الثاني عشر',
        subjects: ['لغة إنجليزية', 'فيزياء'],
        status: StudentStatus.ACTIVE,
        monthlyFee: 65000
      }
    ]);

    console.log('📅 Creating Lessons...');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const lessons = await Lesson.insertMany([
      {
        studentId: students[0]._id,
        teacherId: teachers[0]._id,
        title: 'درس رياضيات متقدم',
        dayOfWeek: 'Sunday',
        startTime: '16:00',
        endTime: '17:30',
        durationHours: 1.5,
        lessonDate: yesterday,
        status: LessonStatus.COMPLETED,
        lessonPrice: 15000,
        teacherEarnings: 10500,
        instituteRevenue: 4500
      },
      {
        studentId: students[1]._id,
        teacherId: teachers[1]._id,
        title: 'تأسيس لغة عربية',
        dayOfWeek: 'Monday',
        startTime: '17:00',
        endTime: '18:00',
        durationHours: 1,
        lessonDate: today,
        status: LessonStatus.SCHEDULED,
        lessonPrice: 12000,
        teacherEarnings: 8400,
        instituteRevenue: 3600
      },
      {
        studentId: students[2]._id,
        teacherId: teachers[2]._id,
        title: 'إنجليزي - مراجعة نهائية',
        dayOfWeek: 'Tuesday',
        startTime: '18:30',
        endTime: '20:00',
        durationHours: 1.5,
        lessonDate: tomorrow,
        status: LessonStatus.SCHEDULED,
        lessonPrice: 18000,
        teacherEarnings: 12600,
        instituteRevenue: 5400
      }
    ]);

    console.log('💰 Creating Payments...');
    await Payment.insertMany([
      {
        studentId: students[0]._id,
        lessonId: lessons[0]._id,
        amount: 15000,
        dueDate: yesterday,
        status: PaymentStatus.PAID,
        paidDate: yesterday,
        paymentMethod: 'CASH'
      },
      {
        studentId: students[1]._id,
        lessonId: lessons[1]._id,
        amount: 12000,
        dueDate: today,
        status: PaymentStatus.PENDING
      },
      {
        studentId: students[2]._id,
        amount: 65000,
        dueDate: today,
        status: PaymentStatus.PAID,
        paidDate: today,
        paymentMethod: 'K-NET'
      }
    ]);

    console.log('\n✨ Seeding Complete! ✨');
    console.log('Created: 3 Teachers, 3 Students, 3 Lessons, 3 Payments.');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedData();
