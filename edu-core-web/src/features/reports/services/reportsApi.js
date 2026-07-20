import apiClient from '../../../shared/services/apiClient';

export const reportsApi = {
  getOverview: async () => {
    const response = await apiClient.get('/v1/reports/overview');
    return response.data;
  },

  getByTeacher: async ({ month, year }) => {
    const response = await apiClient.get('/v1/reports/by-teacher', {
      params: { month, year },
    });
    return response.data;
  },

  getBySubject: async ({ month, year }) => {
    const response = await apiClient.get('/v1/reports/by-subject', {
      params: { month, year },
    });
    return response.data;
  },

  getByLevel: async ({ month, year }) => {
    const response = await apiClient.get('/v1/reports/by-level', {
      params: { month, year },
    });
    return response.data;
  },

  exportCSV: async ({ month, year }) => {
    const response = await apiClient.get('/v1/reports/export-csv', {
      params: { month, year },
      responseType: 'blob',
    });
    return response.data;
  },

  exportPDF: async ({ month, year }) => {
    const response = await apiClient.get('/v1/reports/export-pdf', {
      params: { month, year },
      responseType: 'blob',
    });
    return response.data;
  },

  getFinancialStatements: async ({ startDate, endDate } = {}) => {
    const response = await apiClient.get('/v1/reports/financial-statements', {
      params: { startDate, endDate },
    });
    return response.data;
  },
};
