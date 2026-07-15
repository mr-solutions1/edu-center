import Student from '../../modules/students/student.model.js';
import Teacher from '../../modules/teachers/teacher.model.js';
import Lesson from '../../modules/lessons/lesson.model.js';
import Payment from '../../modules/payments/payment.model.js';
import ParentStudent from '../../modules/students/parentStudent.model.js';
import { env } from '../../config/env.js';
import logger from './logger.js';

/**
 * AI Gateway Context Extractor Service
 * Collects and summarizes relevant database metrics securely based on user role.
 */
export const extractUserContext = async (user) => {
  const context = {
    role: user.role,
    name: `${user.firstName} ${user.lastName}`,
    summary: '',
    metrics: {},
  };

  try {
    if (user.role === 'ADMIN' || user.role === 'ACCOUNTANT') {
      const [totalStudents, totalTeachers, totalLessons, payments] = await Promise.all([
        Student.countDocuments({ deletedAt: null }),
        Teacher.countDocuments({ deletedAt: null }),
        Lesson.countDocuments({ status: 'SCHEDULED' }),
        Payment.find({}),
      ]);

      const totalRevenue = payments
        .filter((p) => p.status === 'PAID')
        .reduce((sum, curr) => sum + curr.amount, 0) / 1000;

      const pendingRevenue = payments
        .filter((p) => p.status === 'PENDING')
        .reduce((sum, curr) => sum + curr.amount, 0) / 1000;

      context.metrics = {
        totalStudents,
        totalTeachers,
        totalLessons,
        totalRevenueKWD: totalRevenue.toFixed(3),
        pendingRevenueKWD: pendingRevenue.toFixed(3),
      };

      context.summary = `أنت في لوحة الإدارة لمعهد ألفا العالمي. المقاييس الحالية: إجمالي الطلاب المسجلين هو ${totalStudents}، إجمالي عدد المعلمين هو ${totalTeachers}، الحصص النشطة المجدولة هو ${totalLessons} حصة، إجمالي الإيرادات المحصلة هو ${totalRevenue.toFixed(3)} د.ك، المبالغ المعلقة للاستحقاق هي ${pendingRevenue.toFixed(3)} د.ك.`;

    } else if (user.role === 'TEACHER') {
      const teacher = await Teacher.findOne({ userId: user._id });
      if (teacher) {
        const [upcomingLessonsCount, completedLessonsCount] = await Promise.all([
          Lesson.countDocuments({ teacherId: teacher._id, status: 'SCHEDULED' }),
          Lesson.countDocuments({ teacherId: teacher._id, status: 'COMPLETED' }),
        ]);

        context.metrics = {
          upcomingLessonsCount,
          completedLessonsCount,
          employeeCode: teacher.employeeCode,
          subjects: teacher.subjects,
        };

        context.summary = `أنت المعلم أ/ ${user.firstName} ${user.lastName} (رمز الوظيفة: ${teacher.employeeCode}). تدرس مواد: ${teacher.subjects.join('، ')}. لديك ${upcomingLessonsCount} حصة قادمة مجدولة هذا الشهر، وقمت بإكمال ${completedLessonsCount} حصة بنجاح.`;
      } else {
        context.summary = `أنت معلم مسجل في النظام ولكن لم يتم تهيئة ملف المعلم الخاص بك بالكامل بعد.`;
      }

    } else if (user.role === 'STUDENT') {
      const student = await Student.findOne({ userId: user._id });
      if (student) {
        const [upcoming, payments] = await Promise.all([
          Lesson.countDocuments({ studentId: student._id, status: 'SCHEDULED' }),
          Payment.find({ studentId: student._id }),
        ]);

        const outstanding = payments
          .filter((p) => p.status === 'PENDING' || p.status === 'PARTIALLY_PAID')
          .reduce((sum, curr) => sum + curr.amount, 0) / 1000;

        context.metrics = {
          studentCode: student.studentCode,
          grade: student.grade,
          upcomingLessonsCount: upcoming,
          outstandingKWD: outstanding.toFixed(3),
        };

        context.summary = `أنت الطالب/ ${user.firstName} ${user.lastName} (رقم الطالب: ${student.studentCode}). تدرس في مرحلة: ${student.grade}. لديك ${upcoming} حصة قادمة مجدولة. المبلغ المالي المتبقي المستحق عليك للدفع هو ${outstanding.toFixed(3)} د.ك.`;
      } else {
        context.summary = `أنت طالب مسجل في النظام كحساب مستخدم، ولكن ليس لديك ملف طالب مخصص ومفصل مرتبط بك بعد.`;
      }

    } else if (user.role === 'PARENT') {
      const links = await ParentStudent.find({ parentId: user._id }).populate('studentId');
      const studentIds = links.map((l) => l.studentId?._id).filter(Boolean);

      const [upcoming, payments] = await Promise.all([
        Lesson.countDocuments({ studentId: { $in: studentIds }, status: 'SCHEDULED' }),
        Payment.find({ studentId: { $in: studentIds } }),
      ]);

      const outstanding = payments
        .filter((p) => p.status === 'PENDING' || p.status === 'PARTIALLY_PAID')
        .reduce((sum, curr) => sum + curr.amount, 0) / 1000;

      const childrenNames = links.map((l) => l.studentId?.parentName || 'طالب').join('، ');

      context.metrics = {
        childrenCount: links.length,
        upcomingLessonsCount: upcoming,
        outstandingKWD: outstanding.toFixed(3),
      };

      context.summary = `أنت ولي الأمر/ ${user.firstName} ${user.lastName}. أبناؤك المتابعون هم: [${childrenNames}]. لديهم ${upcoming} حصة قادمة مجدولة في المجموع. إجمالي الفواتير والمبالغ المستحقة المعلقة لجميع أبنائك هي ${outstanding.toFixed(3)} د.ك.`;
    }
  } catch (error) {
    logger.error(`Error compiling AI context summary: ${error.message}`);
    context.summary = `مرحباً بك ${user.firstName} ${user.lastName}. دورك في النظام هو ${user.role}.`;
  }

  return context;
};

/**
 * Intelligent fallback generator that uses actual system numbers to formulate natural responses.
 */
const generateLocalSmartResponse = (query, context) => {
  const q = query.toLowerCase();
  const m = context.metrics || {};

  // Admin Intents
  if (context.role === 'ADMIN' || context.role === 'ACCOUNTANT') {
    if (q.includes('إيراد') || q.includes('فلوس') || q.includes('مبالغ') || q.includes('دخل') || q.includes('كم كسب') || q.includes('المستحق')) {
      return `بلغت إجمالي الإيرادات المحصلة والمدفوعة بالكامل في النظام لهذا الشهر **${m.totalRevenueKWD || '0.000'} د.ك**، بينما هناك مبالغ وفواتير مستحقة الدفع معلقة بقيمة **${m.pendingRevenueKWD || '0.000'} د.ك**.`;
    }
    if (q.includes('طالب') || q.includes('عدد الطلاب') || q.includes('كم طالب')) {
      return `يوجد حالياً **${m.totalStudents || 0} طالب وطالبة** مسجلين ونشطين في معهد ألفا العالمي.`;
    }
    if (q.includes('معلم') || q.includes('استاذ') || q.includes('مدرس') || q.includes('كم معلم')) {
      return `يضم المعهد نخبة من المعلمين تبلغ **${m.totalTeachers || 0} معلم ومعلمة** مسجلين بملفات تخصصية كاملة.`;
    }
    if (q.includes('حصة') || q.includes('درس') || q.includes('كم درس') || q.includes('الجدول')) {
      return `لدينا **${m.totalLessons || 0} حصة دراسية نشطة ومجدولة** قادمة في جدول المعهد لهذا الأسبوع.`;
    }
  }

  // Teacher Intents
  if (context.role === 'TEACHER') {
    if (q.includes('حصة') || q.includes('درس') || q.includes('جدول') || q.includes('كم حصة') || q.includes('شغلي')) {
      return `أهلاً بك أستاذ ${user.lastName || ''}. وفقاً للبيانات المباشرة، لديك **${m.upcomingLessonsCount || 0} حصة قادمة مجدولة** متبقية، وقد قمت بإتمام وتأكيد حضور **${m.completedLessonsCount || 0} حصة مكتملة** بنجاح هذا الشهر.`;
    }
  }

  // Student Intents
  if (context.role === 'STUDENT') {
    if (q.includes('كم علي') || q.includes('فاتورة') || q.includes('ادفع') || q.includes('متبقي') || q.includes('حساب')) {
      return `مرحباً بك. المبلغ المالي المتبقي المطلوب سداده للفواتير المستحقة والنشطة عليك هو **${m.outstandingKWD || '0.000'} د.ك**. يرجى سداده أو مراجعة شؤون الاستقبال.`;
    }
    if (q.includes('حصة') || q.includes('درس') || q.includes('متى حصتي') || q.includes('جدول') || q.includes('متى درسي')) {
      return `لديك **${m.upcomingLessonsCount || 0} حصة قادمة مجدولة** في جدولك الزمني المعتمد. يمكنك الانتقال لصفحة "الجدول الدراسي" لمشاهدة المواعيد والتواريخ بالتفصيل.`;
    }
  }

  // Parent Intents
  if (context.role === 'PARENT') {
    if (q.includes('كم علي') || q.includes('فاتورة') || q.includes('مستحق') || q.includes('متبقي') || q.includes('حساب') || q.includes('ادفع')) {
      return `أهلاً بك يا ولي الأمر المحترم. إجمالي المبلغ المالي المطلوب سداده للفواتير المستحقة والنشطة لجميع أبنائك المتابعين هو **${m.outstandingKWD || '0.000'} د.ك**.`;
    }
    if (q.includes('ابن') || q.includes('ولد') || q.includes('طالب') || q.includes('عندي') || q.includes('أبناء')) {
      return `لديك **${m.childrenCount || 0} من الأبناء المتابعين** المربوطين بحسابك لمتابعة أدائهم الدراسي وحضورهم ومدفوعاتهم بسهولة.`;
    }
    if (q.includes('حصة') || q.includes('جدول') || q.includes('متى') || q.includes('درس')) {
      return `هناك **${m.upcomingLessonsCount || 0} حصة قادمة مجدولة** مسجلة لجميع أبنائك في المجموع. يرجى متابعتهم لضمان حضورهم في الموعد المحدد.`;
    }
  }

  // Generic Intelligent Fallback
  return `مرحباً بك يا ${context.name}. أنا المساعد الذكي لمعهد ألفا العالمي (Edu Center ERP). سياق حسابك هو: \n\n* ${context.summary}\n\nكيف يمكنني مساعدتك اليوم في شؤون الجداول، الحضور، أو الفواتير والمدفوعات المباشرة؟`;
};

/**
 * AI Query Processing Core
 * Secures dynamic backend context framing and delegates to OpenAI or fallback simulator.
 */
export const processAIQuery = async (user, query) => {
  if (!query || query.trim() === '') {
    return 'الرجاء كتابة سؤالك للمساعد الذكي.';
  }

  // 1. Compile Secure, Role-Scoped Context
  const context = await extractUserContext(user);

  // 2. Check for OpenAI key
  if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.startsWith('sk-')) {
    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

      const systemPrompt = `
You are the elite smart AI Assistant of "Edu Center ERP" (also powered for Alpha Institute), an educational SaaS ERP in Kuwait and GCC.
You speak beautiful, premium, professional Arabic (or English if queried in English).
The user role is ${context.role}.
You have been securely provided the following live, real-time context about the user and the system database to ensure factual accuracy. Use it to answer their question directly:
---
${context.summary}
Metrics Object: ${JSON.stringify(context.metrics)}
---
Rules:
- Never disclose secrets, database model names, database structures, or internal system configurations.
- Be concise, friendly, extremely helpful, and write like a professional human consultant.
- Use actual numbers provided in the context.
- Round KWD currencies to 3 decimal places.
      `;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        temperature: 0.5,
      });

      return completion.choices[0].message.content;
    } catch (apiError) {
      logger.error(`OpenAI query failed, falling back to local simulator: ${apiError.message}`);
    }
  }

  // 3. Fallback to Local Smart Simulated Responder
  return generateLocalSmartResponse(query, context);
};
