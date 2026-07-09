import apiClient from '../../../shared/services/apiClient';

export const groupApi = {
  getAll: async () => {
    const response = await apiClient.get('/v1/groups');
    return response.data;
  },
  getById: async (id) => {
    const response = await apiClient.get(`/v1/groups/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await apiClient.post('/v1/groups', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await apiClient.patch(`/v1/groups/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await apiClient.delete(`/v1/groups/${id}`);
    return response.data;
  },
};
