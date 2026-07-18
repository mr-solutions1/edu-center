process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';

import Student from '../../src/modules/students/student.model.js';
import { StudentCalculationService } from '../../src/modules/students/StudentCalculationService.js';
import { connectDB, closeDB, clearDB } from './setup.js';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Sibling Group Discount Logic', () => {
  it('should apply discount (10%) starting from the second student in the same siblingGroup', async () => {
    const tenantId = new mongoose.Types.ObjectId();

    // Create oldest sibling
    const sibling1 = await Student.create({
      studentCode: 'STD-0001',
      parentName: 'Parent Fam A',
      parentPhone: '12345678',
      address: 'Addr Fam A',
      grade: 'ابتدائي',
      siblingGroup: 'FAM-01',
      tenantId,
      createdAt: new Date('2026-07-17T10:00:00.000Z'),
    });

    // Create younger sibling
    const sibling2 = await Student.create({
      studentCode: 'STD-0002',
      parentName: 'Parent Fam A',
      parentPhone: '12345678',
      address: 'Addr Fam A',
      grade: 'متوسط',
      siblingGroup: 'FAM-01',
      tenantId,
      createdAt: new Date('2026-07-17T11:00:00.000Z'),
    });

    // Create third sibling
    const sibling3 = await Student.create({
      studentCode: 'STD-0003',
      parentName: 'Parent Fam A',
      parentPhone: '12345678',
      address: 'Addr Fam A',
      grade: 'ثانوي',
      siblingGroup: 'FAM-01',
      tenantId,
      createdAt: new Date('2026-07-17T12:00:00.000Z'),
    });

    // Student 1 is the oldest sibling, so getSiblingDiscountPercentage should be 0
    const pct1 = await StudentCalculationService.getSiblingDiscountPercentage(sibling1._id);
    expect(pct1).toBe(0);

    // Student 2 is the second sibling, so getSiblingDiscountPercentage should be 10%
    const pct2 = await StudentCalculationService.getSiblingDiscountPercentage(sibling2._id);
    expect(pct2).toBe(10);

    // Student 3 is the third sibling, so getSiblingDiscountPercentage should be 10%
    const pct3 = await StudentCalculationService.getSiblingDiscountPercentage(sibling3._id);
    expect(pct3).toBe(10);
  });

  it('should fallback to parentPhone grouping if siblingGroup is not specified', async () => {
    const tenantId = new mongoose.Types.ObjectId();

    // Create oldest sibling without siblingGroup
    const sibling1 = await Student.create({
      studentCode: 'STD-0004',
      parentName: 'Parent Fam B',
      parentPhone: '87654321',
      address: 'Addr Fam B',
      grade: 'ابتدائي',
      tenantId,
      createdAt: new Date('2026-07-17T10:00:00.000Z'),
    });

    // Create younger sibling without siblingGroup
    const sibling2 = await Student.create({
      studentCode: 'STD-0005',
      parentName: 'Parent Fam B',
      parentPhone: '87654321',
      address: 'Addr Fam B',
      grade: 'متوسط',
      tenantId,
      createdAt: new Date('2026-07-17T11:00:00.000Z'),
    });

    // Student 1 is the oldest, discount should be 0
    const pct1 = await StudentCalculationService.getSiblingDiscountPercentage(sibling1._id);
    expect(pct1).toBe(0);

    // Student 2 is second, discount should be 10% from parentPhone fallback
    const pct2 = await StudentCalculationService.getSiblingDiscountPercentage(sibling2._id);
    expect(pct2).toBe(10);
  });
});
