import TenantSettings from './tenantSettings.model.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { NotFoundError } from '../../shared/errors/NotFoundError.js';
import { getTenantContext } from '../../shared/utils/tenantContext.js';

/**
 * @desc    Get tenant settings
 * @route   GET /api/v1/settings
 */
export const getSettings = asyncHandler(async (req, res) => {
  const context = getTenantContext();
  const tenantId = context?.tenantId || req.user?.tenantId;

  if (!tenantId) {
    throw new NotFoundError('لم يتم تحديد الشركة/المعهد المعني');
  }

  let settings = await TenantSettings.findOne({ tenantId });
  if (!settings) {
    // Bootstrap if not found
    settings = await TenantSettings.create({
      tenantId,
      instituteName: 'أكاديمية ركان',
    });
  }

  res.status(200).json({
    success: true,
    data: settings,
  });
});

/**
 * @desc    Update tenant settings
 * @route   PATCH /api/v1/settings
 */
export const updateSettings = asyncHandler(async (req, res) => {
  const context = getTenantContext();
  const tenantId = context?.tenantId || req.user?.tenantId;

  if (!tenantId) {
    throw new NotFoundError('لم يتم تحديد الشركة/المعهد المعني');
  }

  const settings = await TenantSettings.findOneAndUpdate(
    { tenantId },
    req.body,
    { new: true, runValidators: true, upsert: true }
  );

  res.status(200).json({
    success: true,
    data: settings,
  });
});
