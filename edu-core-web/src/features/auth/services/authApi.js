import apiClient from '../../../shared/services/apiClient';

export const authApi = {
  login: async (credentials) => {
    const response = await apiClient.post('/v1/auth/login', credentials, {
      withCredentials: true,
    });
    return response.data;
  },

  refresh: async () => {
    const response = await apiClient.post('/v1/auth/refresh', null, {
      withCredentials: true,
    });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/v1/auth/logout', null, {
      withCredentials: true,
    });
    return response.data;
  },

  logoutAll: async () => {
    const response = await apiClient.post('/v1/auth/logout-all', null, {
      withCredentials: true,
    });
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/v1/auth/me');
    return response.data;
  },

  getSessions: async () => {
    const response = await apiClient.get('/v1/auth/sessions');
    return response.data;
  },

  revokeSession: async (sessionId) => {
    const response = await apiClient.delete(`/v1/auth/sessions/${sessionId}`);
    return response.data;
  },

  getPermissions: async () => {
    const response = await apiClient.get('/v1/auth/permissions');
    return response.data;
  },

  getRoles: async () => {
    const response = await apiClient.get('/v1/auth/roles');
    return response.data;
  },

  createRole: async (data) => {
    const response = await apiClient.post('/v1/auth/roles', data);
    return response.data;
  },

  updateRole: async (id, data) => {
    const response = await apiClient.patch(`/v1/auth/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id) => {
    const response = await apiClient.delete(`/v1/auth/roles/${id}`);
    return response.data;
  },
};
