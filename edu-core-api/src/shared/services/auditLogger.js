import AuditTrail from '../../modules/activity-log/auditTrail.model.js';
import logger from './logger.js';

/**
 * Enterprise Audit Trail Logger Helper
 * Asynchronously writes detailed security state modifications to MongoDB.
 *
 * @param {Express.Request} req The current Express request context
 * @param {Object} auditDetails Audit attributes
 * @param {string} auditDetails.action Action code (e.g. 'STUDENT_CREATED')
 * @param {string} auditDetails.entityType Entity collection name (e.g. 'Student')
 * @param {string} auditDetails.entityId ID of the affected document
 * @param {Object} [auditDetails.beforeState] Document state prior to modification
 * @param {Object} [auditDetails.afterState] Document state post modification
 * @param {string} [auditDetails.reason] Custom explanation of the action
 */
export const logAuditTrail = async (req, { action, entityType, entityId, beforeState, afterState, reason }) => {
  try {
    const actorId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const branchId = req.user?.branchId || req.user?.activeBranch;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!actorId) {
      logger.warn(`⚠️ [AuditLogger] Attempted to log audit [${action}] without authenticated user.`);
      return;
    }

    // Write asynchronously
    await AuditTrail.create({
      tenantId,
      branchId,
      actorId,
      action,
      entityType,
      entityId,
      beforeState: beforeState || null,
      afterState: afterState || null,
      ipAddress,
      userAgent,
      reason: reason || null,
    });

    logger.info(`🛡️ [AuditLogger] Recorded action [${action}] on [${entityType}:${entityId}] by user ${actorId}`);
  } catch (err) {
    logger.error(`❌ [AuditLogger] Failed to write AuditTrail entry: ${err.message}`);
  }
};

export default logAuditTrail;
