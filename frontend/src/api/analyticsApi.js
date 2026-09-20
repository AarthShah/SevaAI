import api from './client';

export const departmentApi = {
  getDepartments: async () => {
    const res = await api.get('/departments');
    return res.data;
  }
};

export const analyticsApi = {
  getSummary: async () => {
    const res = await api.get('/analytics');
    return res.data;
  },
  getTrace: async (complaintId) => {
    const res = await api.get(`/agent/trace/${complaintId}`);
    return res.data;
  },
  getEvaluation: async () => {
    const res = await api.get('/agent/evaluate');
    return res.data;
  }
};

export const notificationApi = {
  getNotifications: async () => {
    const res = await api.get('/notifications');
    return res.data;
  },
  markAsRead: async (id) => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  }
};
