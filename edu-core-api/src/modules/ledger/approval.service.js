import mongoose from 'mongoose';

import ApprovalChain from './approvalChain.model.js';
import ApprovalRequest from './approvalRequest.model.js';
import { NotFoundError } from '../../shared/errors/NotFoundError.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';
import logger from '../../shared/services/logger.js';
import { withTransaction } from '../../shared/utils/withTransaction.js';

export const ApprovalService = {
  /**
   * Spawns a new sequential approval request for a document
   */
  submitRequest: async (
    workflowType,
    referenceId,
    tenantId,
    notes = '',
    session = null
  ) => {
    const options = session ? { session } : {};

    // 1. Fetch configured approval chain for this workflow type
    let chain = await ApprovalChain.findOne({ workflowType }).session(session);

    // Seed default chain if none exists (e.g. Accountant -> Admin default consecutive levels)
    if (!chain) {
      const defaultLevels =
        workflowType === 'PAYROLL_APPROVAL'
          ? ['ACCOUNTANT', 'ADMIN']
          : ['ADMIN'];

      const [newChain] = await ApprovalChain.create(
        [
          {
            workflowType,
            levels: defaultLevels,
            tenantId,
          },
        ],
        options
      );
      chain = newChain;
      logger.info(
        `[ApprovalService] Seeded default approval chain for ${workflowType}.`
      );
    }

    // Clean up any stale PENDING requests for this document to prevent conflicts
    await ApprovalRequest.deleteMany(
      { referenceId, status: 'PENDING' },
      options
    );

    // 2. Create the approval request
    const [request] = await ApprovalRequest.create(
      [
        {
          workflowType,
          referenceId,
          currentLevel: 0,
          status: 'PENDING',
          notes,
          tenantId,
        },
      ],
      options
    );

    logger.info(
      `[ApprovalService] Created new approval request ${request._id} for document ${referenceId}.`
    );
    return request;
  },

  /**
   * Approves the active sequential step for a request
   */
  approveStep: async (requestId, userId, userRole, session = null) => {
    return withTransaction(async (txSession) => {
      const request =
        await ApprovalRequest.findById(requestId).session(txSession);
      if (!request) {
        throw new NotFoundError('طلب الاعتماد غير موجود');
      }

      if (request.status !== 'PENDING') {
        throw new ValidationError('تمت معالجة هذا الطلب مسبقاً');
      }

      // Fetch active chain
      const chain = await ApprovalChain.findOne({
        workflowType: request.workflowType,
      }).session(txSession);
      if (!chain || chain.levels.length === 0) {
        throw new ValidationError('سلسلة الاعتمادات غير معرّفة');
      }

      // Master override: Admin automatically signs all remaining steps to fast-track approval
      if (userRole === 'ADMIN') {
        while (request.currentLevel < chain.levels.length) {
          request.signatures.push({
            userId,
            role: chain.levels[request.currentLevel],
            signedAt: new Date(),
          });
          request.currentLevel += 1;
        }

        request.status = 'APPROVED';
        logger.info(
          `[ApprovalService] ApprovalRequest ${request._id} is fully approved via ADMIN master override.`
        );
        await ApprovalService._onWorkflowCompleted(request, txSession);
        await request.save({ session: txSession });
        return request;
      }

      const requiredRole = chain.levels[request.currentLevel];

      if (userRole !== requiredRole) {
        throw new ValidationError(
          `غير مصرح لك باعتماد هذه الخطوة. الدور المطلوب هو: ${requiredRole}`
        );
      }

      // Append signature for the current level only
      request.signatures.push({
        userId,
        role: userRole,
        signedAt: new Date(),
      });

      // Increment level by exactly 1
      request.currentLevel += 1;

      // Check if all levels are signed
      if (request.currentLevel >= chain.levels.length) {
        request.status = 'APPROVED';
        logger.info(
          `[ApprovalService] ApprovalRequest ${request._id} is fully approved.`
        );

        // Trigger completion callback to unlock / update the reference document
        await ApprovalService._onWorkflowCompleted(request, txSession);
      }

      await request.save({ session: txSession });
      return request;
    }, session);
  },

  /**
   * Rejects / declines an active approval request with comments
   */
  rejectRequest: async (
    requestId,
    userId,
    userRole,
    rejectReason,
    session = null
  ) => {
    if (!rejectReason || rejectReason.trim() === '') {
      throw new ValidationError('سبب الرفض مطلوب');
    }

    return withTransaction(async (txSession) => {
      const request =
        await ApprovalRequest.findById(requestId).session(txSession);
      if (!request) {
        throw new NotFoundError('طلب الاعتماد غير موجود');
      }

      if (request.status !== 'PENDING') {
        throw new ValidationError('تمت معالجة هذا الطلب مسبقاً');
      }

      request.status = 'REJECTED';
      request.rejectReason = rejectReason;

      // Save signature responsible for the rejection
      request.signatures.push({
        userId,
        role: userRole,
        signedAt: new Date(),
      });

      // Trigger rejection callback to reset / lock the reference document
      await ApprovalService._onWorkflowRejected(request, txSession);

      await request.save({ session: txSession });
      return request;
    }, session);
  },

  /**
   * Internal completion callback to update reference documents
   */
  _onWorkflowCompleted: async (request, session) => {
    if (request.workflowType === 'PAYROLL_APPROVAL') {
      const PayrollRecord = mongoose.model('PayrollRecord');
      await PayrollRecord.updateOne(
        { _id: request.referenceId },
        { $set: { status: 'APPROVED' } },
        { session }
      );
      logger.info(
        `[ApprovalService] Promoted PayrollRecord ${request.referenceId} to APPROVED.`
      );
    }
  },

  /**
   * Internal rejection callback to update reference documents
   */
  _onWorkflowRejected: async (request, session) => {
    if (request.workflowType === 'PAYROLL_APPROVAL') {
      const PayrollRecord = mongoose.model('PayrollRecord');
      await PayrollRecord.updateOne(
        { _id: request.referenceId },
        { $set: { status: 'CALCULATED' } }, // Reset back to CALCULATED state on decline
        { session }
      );
      logger.info(
        `[ApprovalService] Reset PayrollRecord ${request.referenceId} status to CALCULATED on reject.`
      );
    }
  },
};
export default ApprovalService;
