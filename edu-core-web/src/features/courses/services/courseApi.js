import apiClient from '../../../shared/services/apiClient';

export const courseApi = {
  getAll: async () => {
    const response = await apiClient.get('/v1/courses');
    return response.data;
  },
  getById: async (id) => {
    const response = await apiClient.get(`/v1/courses/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await apiClient.post('/v1/courses', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await apiClient.patch(`/v1/courses/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await apiClient.delete(`/v1/courses/${id}`);
    return response.data;
  },
};
