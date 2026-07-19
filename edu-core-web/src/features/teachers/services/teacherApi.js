import apiClient from '../../../shared/services/apiClient';

export const teacherApi = {
  createTeacher: async (teacherData) => {
    const response = await apiClient.post('/v1/teachers', teacherData);
    return response.data;
  },

  getAllTeachers: async (params) => {
    const response = await apiClient.get('/v1/teachers', { params });
    return response.data;
  },

  getTeacherById: async (id) => {
    const response = await apiClient.get(`/v1/teachers/${id}`);
    return response.data;
  },

  updateTeacher: async (id, teacherData) => {
    const response = await apiClient.patch(`/v1/teachers/${id}`, teacherData);
    return response.data;
  },

  uploadFiles: async (id, formData) => {
    const response = await apiClient.post(
      `/v1/teachers/${id}/upload`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  deleteTeacher: async (id) => {
    const response = await apiClient.delete(`/v1/teachers/${id}`);
    return response.data;
  },

  getTeacherProfile: async () => {
    const response = await apiClient.get('/v1/teachers/profile');
    return response.data;
  },

  updateTeacherProfile: async (profileData) => {
    const response = await apiClient.patch('/v1/teachers/profile', profileData);
    return response.data;
  },

  uploadProfileFiles: async (formData) => {
    const response = await apiClient.post(
      '/v1/teachers/profile/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  getPublicTeacherProfile: async (id) => {
    const response = await apiClient.get(`/v1/teachers/public/${id}`);
    return response.data;
  },
};
