import { z } from 'zod';

import {
  CommissionModel,
  Gender,
  WeekDays,
} from '../../shared/constants/enums.js';

export const teacherSchema = z.object({
  userId: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'رقم المستخدم غير صالح (يجب أن يكون المعرف 24 حرفاً بالنظام الست عشري)'
    )
    .optional()
    .nullable(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  civilId: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  gradesTaught: z.array(z.string()).optional(),
  gender: z.nativeEnum(Gender).optional(),
  nationality: z.string().optional(),
  experienceYears: z.number().min(0).optional(),
  address: z.string().optional(),
  googleMapsUrl: z.string().url().optional().or(z.literal('')),
  availability: z
    .object({
      days: z.array(z.nativeEnum(WeekDays)).optional().default([]),
      slots: z
        .array(
          z.object({
            start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          })
        )
        .optional()
        .default([]),
    })
    .optional(),
  ownsCar: z.boolean().optional(),
  transportationAvailable: z.boolean().optional(),
  usesInstituteCar: z.boolean().optional(),
  hourlyRate: z.number().min(0).optional(),
  commissionModel: z.nativeEnum(CommissionModel).optional(),
  teacherPercentage: z.number().min(0).max(1).optional(),
  institutePercentage: z.number().min(0).max(1).optional(),
  department: z.string().optional(),
  bio: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateTeacherSchema = teacherSchema.partial();
