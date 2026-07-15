import apiClient from '../../../shared/services/apiClient';

export const inboxApi = {
  getConversations: async () => {
    const response = await apiClient.get('/v1/inbox/conversations');
    return response.data;
  },

  getMessages: async (params) => {
    const response = await apiClient.get('/v1/inbox/messages', { params });
    return response.data;
  },

  sendMessage: async (data) => {
    const response = await apiClient.post('/v1/inbox/messages', data);
    return response.data;
  },
};
