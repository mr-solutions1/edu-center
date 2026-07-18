import * as payrollService from './payroll.service.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

export const generatePayroll = asyncHandler(async (req, res) => {
  const { teacherId, month, year } = req.body;
  const record = await payrollService.recalculateForTeacher(
    teacherId,
    month,
    year,
    req.user.id
  );
  res.status(200).json({
    success: true,
    data: record,
  });
});

export const getAllPayroll = asyncHandler(async (req, res) => {
  const records = await payrollService.getAllPayroll(req.query);
  res.status(200).json({
    success: true,
    data: records,
  });
});

export const submitForApproval = asyncHandler(async (req, res) => {
  const record = await payrollService.submitForApproval(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    data: record,
  });
});

export const approvePayroll = asyncHandler(async (req, res) => {
  const record = await payrollService.approvePayroll(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    data: record,
  });
});

export const markPaid = asyncHandler(async (req, res) => {
  const record = await payrollService.markPaid(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    data: record,
  });
});
