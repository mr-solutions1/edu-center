import apiClient from '../../../shared/services/apiClient';

export const payrollApi = {
  getAllPayroll: async (params) => {
    const response = await apiClient.get('/v1/payroll', { params });
    return response.data;
  },

  generatePayroll: async (data) => {
    const response = await apiClient.post('/v1/payroll/generate', data);
    return response.data;
  },

  markPaid: async (id) => {
    const response = await apiClient.patch(`/v1/payroll/${id}/paid`);
    return response.data;
  },

  submitForApproval: async (id) => {
    const response = await apiClient.patch(`/v1/payroll/${id}/submit-approval`);
    return response.data;
  },

  approvePayroll: async (id) => {
    const response = await apiClient.patch(`/v1/payroll/${id}/approve`);
    return response.data;
  },

  rejectPayroll: async ({ id, rejectReason }) => {
    const response = await apiClient.patch(`/v1/payroll/${id}/reject`, { rejectReason });
    return response.data;
  },

  getApprovalDetails: async (id) => {
    const response = await apiClient.get(`/v1/payroll/${id}/approval`);
    return response.data;
  },
};
