import apiClient from '../../../shared/services/apiClient';

export const schedulingApi = {
  createLesson: async (lessonData) => {
    const response = await apiClient.post('/v1/lessons', lessonData);
    return response.data;
  },

  getAllLessons: async (params) => {
    const response = await apiClient.get('/v1/lessons', { params });
    return response.data;
  },

  updateLessonStatus: async (id, statusData) => {
    const response = await apiClient.patch(
      `/v1/lessons/${id}/status`,
      statusData
    );
    return response.data;
  },

  updateLessonTime: async (id, timeData) => {
    const response = await apiClient.patch(
      `/v1/lessons/${id}`,
      timeData
    );
    return response.data;
  },

  markAttendance: async (lessonId, attendanceData) => {
    const response = await apiClient.post(
      `/v1/lessons/${lessonId}/attendance`,
      attendanceData
    );
    return response.data;
  },

  getLessonAttendance: async (lessonId) => {
    const response = await apiClient.get(`/v1/lessons/${lessonId}/attendance`);
    return response.data;
  },
};
