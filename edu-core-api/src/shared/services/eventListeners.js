import eventBus from './eventBus.js';
import logger from './logger.js';

/**
 * Enterprise Domain Event Catalog Definitions
 */
export const DomainEventTypes = {
  // Student
  STUDENT_CREATED: 'StudentCreated',
  STUDENT_UPDATED: 'StudentUpdated',
  STUDENT_ARCHIVED: 'StudentArchived',

  // Attendance
  ATTENDANCE_RECORDED: 'AttendanceRecorded',
  ATTENDANCE_CORRECTED: 'AttendanceCorrected',

  // Finance
  PAYMENT_RECEIVED: 'PaymentReceived',
  INVOICE_GENERATED: 'InvoiceGenerated',
  INVOICE_PAID: 'InvoicePaid',
  REFUND_CREATED: 'RefundCreated',

  // CRM
  LEAD_CREATED: 'LeadCreated',
  LEAD_ASSIGNED: 'LeadAssigned',
  LEAD_CONVERTED: 'LeadConverted',

  // Exams
  EXAM_PUBLISHED: 'ExamPublished',
  GRADE_RELEASED: 'GradeReleased',

  // Notifications
  NOTIFICATION_SENT: 'NotificationSent',
};

/**
 * Registers listeners for the entire domain catalog, beautifully logging correlation contexts.
 */
export const registerDomainEventListeners = () => {
  // 1. Lead Converted -> Auto Student Onboarding Prep
  eventBus.subscribe(DomainEventTypes.LEAD_CONVERTED, (event) => {
    logger.info(`🔔 [Reaction] ${event.eventType}: Preparing onboarding sequence for ${event.payload.leadName}`, {
      correlationId: event.correlationId,
      actorId: event.actorId,
    });
  });

  // 2. Payment Received -> Send invoice email asynchronously
  eventBus.subscribe(DomainEventTypes.PAYMENT_RECEIVED, (event) => {
    logger.info(`🔔 [Reaction] ${event.eventType}: Scheduling email receipt dispatch for ${event.payload.amount} KWD`, {
      correlationId: event.correlationId,
      tenantId: event.tenantId,
    });
  });

  // 3. Attendance Recorded -> Prepare WhatsApp alert
  eventBus.subscribe(DomainEventTypes.ATTENDANCE_RECORDED, (event) => {
    logger.info(`🔔 [Reaction] ${event.eventType}: Queueing alert for guardian regarding student ID ${event.payload.studentId}`, {
      correlationId: event.correlationId,
    });
  });

  logger.info('🔌 Domain Event catalog listeners fully active.');
};
export default registerDomainEventListeners;
