import api from './client';

export const officerApi = {
  getOfficers: async (params = {}) => {
    const res = await api.get('/officers', { params });
    return res.data;
  },
  getFleetSummary: async () => {
    const res = await api.get('/officers/fleet-summary');
    return res.data;
  },
  smartMatch: async (latitude, longitude, departmentId) => {
    const params = { latitude, longitude };
    if (departmentId) params.department_id = departmentId;
    const res = await api.get('/officers/smart-match', { params });
    return res.data;
  },
  getOfficerTasks: async (officerId) => {
    const res = await api.get(`/officers/${officerId}/tasks`);
    return res.data;
  },
  updateOfficerStatus: async (officerId, status) => {
    const res = await api.patch(`/officers/${officerId}/status`, { status });
    return res.data;
  },
  assignOfficer: async (complaintId, officerId, remarks) => {
    const res = await api.post(`/complaints/${complaintId}/assign-officer`, {
      officer_id: officerId,
      remarks
    });
    return res.data;
  }
};
