import Permission from './permission.model.js';
import Role from './role.model.js';
import logger from '../../shared/services/logger.js';

export const SYSTEM_PERMISSIONS = [
  { key: 'dashboard.view', name: 'عرض لوحة التحكم', group: 'لوحة التحكم' },
  { key: 'student.create', name: 'إضافة طالب جديد', group: 'الطلاب' },
  { key: 'student.view', name: 'عرض بيانات الطلاب', group: 'الطلاب' },
  { key: 'student.update', name: 'تعديل بيانات طالب', group: 'الطلاب' },
  { key: 'student.delete', name: 'حذف طالب', group: 'الطلاب' },
  { key: 'teacher.create', name: 'إضافة معلم جديد', group: 'المعلمون' },
  { key: 'teacher.view', name: 'عرض بيانات المعلمين', group: 'المعلمون' },
  { key: 'teacher.update', name: 'تعديل بيانات معلم', group: 'المعلمون' },
  { key: 'teacher.delete', name: 'حذف معلم', group: 'المعلمون' },
  { key: 'lesson.create', name: 'حجز حصة دراسية', group: 'الجدول والدروس' },
  { key: 'lesson.view', name: 'عرض الجدول الدراسي', group: 'الجدول والدروس' },
  { key: 'lesson.update', name: 'تعديل موعد حصة', group: 'الجدول والدروس' },
  { key: 'lesson.delete', name: 'إلغاء حصة دراسية', group: 'الجدول والدروس' },
  { key: 'lesson.attendance', name: 'تسجيل الحضور والغياب', group: 'الجدول والدروس' },
  { key: 'payment.create', name: 'تسجيل دفعة جديدة', group: 'المدفوعات' },
  { key: 'payment.view', name: 'عرض المدفوعات والفواتير', group: 'المدفوعات' },
  { key: 'payment.approve', name: 'اعتماد الفواتير والخصومات', group: 'المدفوعات' },
  { key: 'payroll.view', name: 'عرض سجل الرواتب', group: 'الرواتب والمالية' },
  { key: 'payroll.recalculate', name: 'إعادة احتساب الرواتب', group: 'الرواتب والمالية' },
  { key: 'reports.view', name: 'عرض التقارير والتحليلات', group: 'التقارير' },
  { key: 'reports.export', name: 'تصدير التقارير (PDF/Excel)', group: 'التقارير' },
  { key: 'settings.view', name: 'عرض الإعدادات', group: 'الإعدادات' },
  { key: 'settings.update', name: 'تعديل إعدادات النظام والهوية', group: 'الإعدادات' },
  { key: 'crm.view', name: 'عرض لوحة العملاء المحتملين', group: 'إدارة العملاء CRM' },
  { key: 'crm.manage', name: 'إدارة وتحديث بيانات العملاء', group: 'إدارة العملاء CRM' },
  { key: 'exams.view', name: 'عرض الاختبارات والتقييمات', group: 'الامتحانات' },
  { key: 'exams.manage', name: 'إعداد الاختبارات وبنك الأسئلة ورصد الدرجات', group: 'الامتحانات' },
  { key: 'inbox.view', name: 'عرض صندوق الرسائل', group: 'الرسائل الداخلية' },
  { key: 'inbox.send', name: 'إرسال رسائل داخلية', group: 'الرسائل الداخلية' },
];

export const DEFAULT_ROLES = [
  {
    key: 'ADMIN',
    name: 'مدير النظام',
    description: 'يمتلك كامل الصلاحيات في النظام والتحكم بالإعدادات والهوية',
    permissions: SYSTEM_PERMISSIONS.map((p) => p.key),
  },
  {
    key: 'TEACHER',
    name: 'المعلم',
    description: 'يستطيع تسجيل حضور طلابه ورصد درجاتهم واستخدام بنك الأسئلة والمساعد الذكي وتلقي الرسائل',
    permissions: [
      'dashboard.view',
      'student.view',
      'lesson.view',
      'lesson.attendance',
      'exams.view',
      'exams.manage',
      'inbox.view',
      'inbox.send',
    ],
  },
  {
    key: 'RECEPTIONIST',
    name: 'موظف الاستقبال',
    description: 'يدير شؤون الطلاب، المتابعات للعملاء المحتملين، وحجز الحصص والمدفوعات',
    permissions: [
      'dashboard.view',
      'student.create',
      'student.view',
      'student.update',
      'lesson.create',
      'lesson.view',
      'lesson.update',
      'payment.create',
      'payment.view',
      'crm.view',
      'crm.manage',
      'inbox.view',
      'inbox.send',
    ],
  },
  {
    key: 'ACCOUNTANT',
    name: 'المحاسب',
    description: 'يدير الفواتير، رواتب المعلمين، التقارير والتحليلات المالية',
    permissions: [
      'dashboard.view',
      'payment.view',
      'payment.approve',
      'payroll.view',
      'payroll.recalculate',
      'reports.view',
      'reports.export',
      'inbox.view',
      'inbox.send',
    ],
  },
  {
    key: 'STUDENT',
    name: 'الطالب',
    description: 'يتابع جدول حصصه، حضور الطلاب، غياباته، درجاته ومدفوعاته وتلقي الرسائل',
    permissions: [
      'dashboard.view',
      'lesson.view',
      'payment.view',
      'exams.view',
      'inbox.view',
      'inbox.send',
    ],
  },
  {
    key: 'PARENT',
    name: 'ولي الأمر',
    description: 'يتابع حسابات وحضور ودرجات أبنائه المرتبطين به ويدير المدفوعات',
    permissions: [
      'dashboard.view',
      'student.view',
      'lesson.view',
      'payment.view',
      'exams.view',
      'inbox.view',
      'inbox.send',
    ],
  },
];

/**
 * Ensures system permissions exist and configures default tenant roles.
 */
export const bootstrapRBAC = async (tenantId) => {
  try {
    // 1. Upsert Permissions
    for (const perm of SYSTEM_PERMISSIONS) {
      await Permission.updateOne(
        { key: perm.key },
        { $set: perm },
        { upsert: true }
      );
    }
    logger.info(`🔑 System permissions validated/created (${SYSTEM_PERMISSIONS.length})`);

    // 2. Ensure roles exist for the given tenant
    if (tenantId) {
      for (const roleDef of DEFAULT_ROLES) {
        await Role.findOneAndUpdate(
          { tenantId, key: roleDef.key },
          {
            name: roleDef.name,
            description: roleDef.description,
            permissions: roleDef.permissions,
            tenantId: tenantId
          },
          { 
            upsert: true, 
            new: true,
            strict: false 
          }
        );
      }
      logger.info(`👥 Default Roles initialized/verified for tenant: ${tenantId}`);
    }
  } catch (error) {
    logger.error(`❌ Failed to bootstrap RBAC: ${error.message}`);
    throw error;
  }
};
