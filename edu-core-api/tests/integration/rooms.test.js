process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';
import request from 'supertest';

import { connectDB, closeDB, clearDB } from './setup.js';
import app from '../../src/app.js';
import User from '../../src/modules/users/user.model.js';
import Teacher from '../../src/modules/teachers/teacher.model.js';
import Student from '../../src/modules/students/student.model.js';
import Room from '../../src/modules/rooms/room.model.js';

beforeAll(async () => await connectDB(), 20000);
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Classroom & Room Management Module Integration', () => {
  let adminToken;
  let adminUser;
  let teacherDoc;
  let studentDoc;

  beforeEach(async () => {
    // Create an admin user and log in to get bearer token
    adminUser = await User.create({
      email: 'admin@example.com',
      passwordHash: 'password123',
      firstName: 'System',
      lastName: 'Admin',
      phone: '87654321',
      role: 'ADMIN',
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });

    adminToken = loginRes.body.data.accessToken;

    // Create supporting entities (Teacher and Student) for conflict testing
    const teacherUser = await User.create({
      email: 'teacher@example.com',
      passwordHash: 'password123',
      firstName: 'Tutor',
      lastName: 'A',
      phone: '12345678',
      role: 'TEACHER',
    });

    teacherDoc = await Teacher.create({
      userId: teacherUser._id,
      employeeCode: 'TCH-1001',
      isActive: true,
      teacherPercentageSnapshot: 70,
    });

    studentDoc = await Student.create({
      studentName: 'عبدالرحمن العتيبي',
      parentName: 'والد عبدالرحمن',
      parentPhone: '96590000111',
      governorate: 'حولي',
      area: 'السالمية',
      grade: 'متوسط',
      classYear: 'الصف السادس',
      curriculum: 'مخرجات حكومي',
      address: 'الكويت، السالمية',
      status: 'ACTIVE',
      studentCode: 'STD-1001',
    });
  });

  test('should create, list, and delete a classroom/room successfully', async () => {
    // 1. Create Room
    const createRes = await request(app)
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'قاعة الفارابي أ1',
        code: 'ROOM_F_A1',
        capacity: 10,
        type: 'LECTURE',
        equipment: ['Whiteboard', 'Projector'],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.name).toBe('قاعة الفارابي أ1');
    expect(createRes.body.data.capacity).toBe(10);

    const roomId = createRes.body.data._id;

    // 2. List Rooms
    const listRes = await request(app)
      .get('/api/v1/rooms')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0].code).toBe('ROOM_F_A1');

    // 3. Delete Room
    const deleteRes = await request(app)
      .delete(`/api/v1/rooms/${roomId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // List again (soft deleted should be omitted)
    const listAgainRes = await request(app)
      .get('/api/v1/rooms')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listAgainRes.body.data.length).toBe(0);
  });

  test('should trigger scheduling conflict when double booking a room at overlapping times', async () => {
    // Create a Room
    const room = await Room.create({
      name: 'مختبر ب1',
      code: 'ROOM_B1',
      capacity: 5,
      type: 'LAB',
    });

    const lessonDate = new Date();
    lessonDate.setUTCHours(0, 0, 0, 0);

    // Create first lesson in the Room from 14:00 to 15:30
    const firstRes = await request(app)
      .post('/api/v1/lessons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: studentDoc._id.toString(),
        teacherId: teacherDoc._id.toString(),
        roomId: room._id.toString(),
        title: 'درس فيزياء متقدم',
        dayOfWeek: 'Monday',
        startTime: '14:00',
        endTime: '15:30',
        durationHours: 1.5,
        lessonDate: lessonDate.toISOString(),
        lessonPrice: 15000, // 15 KWD
        educationalLevel: 'متوسط',
      });

    expect(firstRes.status).toBe(201);

    // Try to create second lesson in the SAME room at overlapping times: 15:00 to 16:30
    // Overlaps from 15:00 to 15:30!
    // We will use another student and teacher to isolate to just Room-level conflict!
    const secondStudent = await Student.create({
      studentName: 'فاطمة العتيبي',
      parentName: 'والد فاطمة',
      parentPhone: '96590000222',
      governorate: 'حولي',
      area: 'حولي',
      grade: 'متوسط',
      classYear: 'الصف السادس',
      curriculum: 'مخرجات حكومي',
      address: 'الكويت، حولي',
      status: 'ACTIVE',
      studentCode: 'STD-1002',
    });

    const secondTeacherUser = await User.create({
      email: 'teacher2@example.com',
      passwordHash: 'password123',
      firstName: 'Tutor',
      lastName: 'B',
      phone: '87654322',
      role: 'TEACHER',
    });

    const secondTeacherDoc = await Teacher.create({
      userId: secondTeacherUser._id,
      employeeCode: 'TCH-1002',
      isActive: true,
    });

    const secondRes = await request(app)
      .post('/api/v1/lessons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: secondStudent._id.toString(),
        teacherId: secondTeacherDoc._id.toString(),
        roomId: room._id.toString(),
        title: 'درس كيمياء مجدول',
        dayOfWeek: 'Monday',
        startTime: '15:00',
        endTime: '16:30',
        durationHours: 1.5,
        lessonDate: lessonDate.toISOString(),
        lessonPrice: 15000,
        educationalLevel: 'متوسط',
      });

    // Should return 409 Conflict due to Room being booked!
    expect(secondRes.status).toBe(409);
    expect(secondRes.body.success).toBe(false);
    expect(secondRes.body.message).toContain('الغرفة محجوزة لحصة أخرى في هذا الوقت');
  });
});
