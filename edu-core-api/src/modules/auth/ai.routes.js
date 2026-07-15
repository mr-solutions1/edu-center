import express from 'express';

import { processAIQuery } from '../../shared/services/aiService.js';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { checkFeatureFlag } from '../../shared/middlewares/featureFlags.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = express.Router();

router.post(
  '/ai-query',
  authenticate,
  checkFeatureFlag('aiAssistantEnabled'),
  asyncHandler(async (req, res) => {
    const { query } = req.body;

    const answer = await processAIQuery(req.user, query);

    res.status(200).json({
      success: true,
      data: {
        answer,
      },
    });
  })
);

export default router;
