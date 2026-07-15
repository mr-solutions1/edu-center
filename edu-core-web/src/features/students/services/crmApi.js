import apiClient from '../../../shared/services/apiClient';

export const crmApi = {
  getLeads: async (params) => {
    const response = await apiClient.get('/v1/crm', { params });
    return response.data;
  },

  createLead: async (data) => {
    const response = await apiClient.post('/v1/crm', data);
    return response.data;
  },

  updateLead: async (id, data) => {
    const response = await apiClient.patch(`/v1/crm/${id}`, data);
    return response.data;
  },

  addNote: async (id, text) => {
    const response = await apiClient.post(`/v1/crm/${id}/notes`, { text });
    return response.data;
  },

  addFollowUp: async (id, data) => {
    const response = await apiClient.post(`/v1/crm/${id}/followups`, data);
    return response.data;
  },

  updateFollowUp: async (id, followUpId, data) => {
    const response = await apiClient.patch(`/v1/crm/${id}/followups/${followUpId}`, data);
    return response.data;
  },
};
