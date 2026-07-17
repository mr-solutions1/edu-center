import apiClient from '@/shared/services/apiClient';

export const settingsApi = {
  getSettings: async () => {
    const response = await apiClient.get('/v1/settings');
    return response.data;
  },
  updateSettings: async (data) => {
    const response = await apiClient.patch('/v1/settings', data);
    return response.data;
  },
};
