import * as paymentService from './payment.service.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

export const createPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.createPayment(req.body, req.user.id);
  res.status(201).json({
    success: true,
    data: payment,
  });
});

export const getAllPayments = asyncHandler(async (req, res) => {
  const { payments, pagination } = await paymentService.getAllPayments(
    req.query
  );
  res.status(200).json({
    success: true,
    data: payments,
    meta: pagination,
  });
});

export const getPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.id);
  res.status(200).json({
    success: true,
    data: payment,
  });
});

export const updatePayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.updatePayment(req.params.id, req.body, req.user.id);
  res.status(200).json({
    success: true,
    data: payment,
  });
});

export const deletePayment = asyncHandler(async (req, res) => {
  await paymentService.deletePayment(req.params.id);
  res.status(204).send();
});
