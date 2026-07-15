import Lead from './lead.model.js';
import { AppError } from '../../shared/errors/AppError.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

// Get all CRM leads
export const getLeads = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const { stage, source, assignedTo, search } = req.query;

  const query = { tenantId };

  if (stage) query.stage = stage;
  if (source) query.source = source;
  if (assignedTo) query.assignedTo = assignedTo;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const leads = await Lead.find(query)
    .sort({ createdAt: -1 })
    .populate('assignedTo', 'firstName lastName');

  // Compute CRM pipeline metrics
  const totalLeadsCount = await Lead.countDocuments({ tenantId });
  const convertedCount = await Lead.countDocuments({ tenantId, stage: 'CONVERTED' });
  const conversionRate = totalLeadsCount > 0 ? ((convertedCount / totalLeadsCount) * 100).toFixed(1) : 0;

  res.status(200).json({
    success: true,
    data: leads,
    metrics: {
      totalLeadsCount,
      convertedCount,
      conversionRate,
    },
  });
});

// Create a new Lead
export const createLead = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const branchId = req.user.branchId;
  const { name, phone, source, campaign, priority, expectedValue, assignedTo } = req.body;

  if (!name || !phone) {
    throw new AppError('الاسم ورقم الهاتف مطلوبان', 400);
  }

  const existingLead = await Lead.findOne({ tenantId, phone });
  if (existingLead) {
    throw new AppError('هذا الرقم مسجل بالفعل كعميل محتمل', 400);
  }

  const lead = await Lead.create({
    tenantId,
    branchId,
    name,
    phone,
    source: source || 'DIRECT',
    campaign,
    priority: priority || 'MEDIUM',
    expectedValue: expectedValue || 0,
    assignedTo: assignedTo || null,
    timeline: [
      {
        action: 'تم إنشاء العميل',
        details: `تم تسجيل العميل عن طريق ${req.user.firstName} ${req.user.lastName}`,
        userId: req.user._id,
      },
    ],
  });

  res.status(201).json({
    success: true,
    message: 'تم إضافة العميل المحتمل بنجاح',
    data: lead,
  });
});

// Update Lead (stage, details)
export const updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const { name, source, campaign, stage, priority, expectedValue, assignedTo } = req.body;

  const lead = await Lead.findOne({ _id: id, tenantId });
  if (!lead) {
    throw new AppError('العميل المطلوب غير موجود', 404);
  }

  const updates = {};
  const timelineEntries = [];

  if (name && name !== lead.name) {
    updates.name = name;
    timelineEntries.push({ action: 'تعديل الاسم', details: `تم تعديل الاسم إلى ${name}`, userId: req.user._id });
  }
  if (source && source !== lead.source) {
    updates.source = source;
  }
  if (campaign !== undefined) {
    updates.campaign = campaign;
  }
  if (stage && stage !== lead.stage) {
    updates.stage = stage;
    timelineEntries.push({
      action: 'تغيير مرحلة المتابعة',
      details: `تم نقل العميل إلى مرحلة: ${stage}`,
      userId: req.user._id,
    });
  }
  if (priority && priority !== lead.priority) {
    updates.priority = priority;
  }
  if (expectedValue !== undefined && expectedValue !== lead.expectedValue) {
    updates.expectedValue = expectedValue;
  }
  if (assignedTo !== undefined && String(assignedTo) !== String(lead.assignedTo)) {
    updates.assignedTo = assignedTo;
    timelineEntries.push({
      action: 'تغيير الموظف المسؤول',
      details: 'تم تعيين موظف متابعة جديد للعميل',
      userId: req.user._id,
    });
  }

  // Save updates and append timeline entries
  Object.assign(lead, updates);
  if (timelineEntries.length > 0) {
    lead.timeline.push(...timelineEntries);
  }

  await lead.save();

  res.status(200).json({
    success: true,
    message: 'تم تحديث بيانات العميل المحتمل',
    data: lead,
  });
});

// Add Note to Lead
export const addLeadNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const { text } = req.body;

  if (!text) {
    throw new AppError('نص الملاحظة مطلوب', 400);
  }

  const lead = await Lead.findOne({ _id: id, tenantId });
  if (!lead) {
    throw new AppError('العميل المطلوب غير موجود', 404);
  }

  lead.notes.push({
    authorId: req.user._id,
    text,
  });

  lead.timeline.push({
    action: 'إضافة ملاحظة جديدة',
    details: text,
    userId: req.user._id,
  });

  await lead.save();

  res.status(200).json({
    success: true,
    message: 'تم إضافة الملاحظة بنجاح',
    data: lead,
  });
});

// Add Follow-up schedule to Lead
export const addLeadFollowUp = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const { scheduledAt, notes } = req.body;

  if (!scheduledAt) {
    throw new AppError('تاريخ المتابعة القادمة مطلوب', 400);
  }

  const lead = await Lead.findOne({ _id: id, tenantId });
  if (!lead) {
    throw new AppError('العميل المطلوب غير موجود', 404);
  }

  lead.followUps.push({
    scheduledAt,
    notes,
    status: 'PENDING',
  });

  lead.timeline.push({
    action: 'جدولة متابعة جديدة',
    details: `موعد الاتصال القادم: ${new Date(scheduledAt).toLocaleDateString('ar-KW')}. ${notes || ''}`,
    userId: req.user._id,
  });

  await lead.save();

  res.status(200).json({
    success: true,
    message: 'تم جدولة المتابعة بنجاح',
    data: lead,
  });
});

// Update Follow-up Status
export const updateLeadFollowUp = asyncHandler(async (req, res) => {
  const { id, followUpId } = req.params;
  const tenantId = req.user.tenantId;
  const { status, notes } = req.body;

  const lead = await Lead.findOne({ _id: id, tenantId });
  if (!lead) {
    throw new AppError('العميل المطلوب غير موجود', 404);
  }

  const followUp = lead.followUps.id(followUpId);
  if (!followUp) {
    throw new AppError('المتابعة المطلوبة غير موجودة', 404);
  }

  if (status) followUp.status = status;
  if (notes) followUp.notes = notes;

  lead.timeline.push({
    action: 'تحديث حالة المتابعة',
    details: `تم تحديث حالة الاتصال والمتابعة إلى: ${status}`,
    userId: req.user._id,
  });

  await lead.save();

  res.status(200).json({
    success: true,
    message: 'تم تحديث حالة المتابعة بنجاح',
    data: lead,
  });
});
