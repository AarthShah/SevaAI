import api from './client';

export const complaintApi = {
  analyzeComplaint: async (payload) => {
    const res = await api.post('/complaints/analyze', payload);
    return res.data;
  },
  autoDispatchComplaint: async (payload) => {
    const res = await api.post('/complaints/auto-dispatch', payload);
    return res.data;
  },
  photoInstantDispatch: async (file, locationData = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (locationData.latitude) formData.append('latitude', locationData.latitude);
    if (locationData.longitude) formData.append('longitude', locationData.longitude);
    if (locationData.address) formData.append('address', locationData.address);
    const res = await api.post('/complaints/photo-instant-dispatch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  submitComplaint: async (payload) => {
    const res = await api.post('/complaints', payload);
    return res.data;
  },
  getComplaints: async (params = {}) => {
    const res = await api.get('/complaints', { params });
    return res.data;
  },
  getComplaintById: async (id) => {
    const res = await api.get(`/complaints/${id}`);
    return res.data;
  },
  updateStatus: async (id, status, remarks, departmentId) => {
    const res = await api.patch(`/complaints/${id}/status`, {
      status,
      remarks,
      department_id: departmentId
    });
    return res.data;
  },
  autoInquireComplaint: async (id) => {
    const res = await api.post(`/complaints/${id}/auto-inquiry`);
    return res.data;
  },
  triggerFollowup: async (id, remarks) => {
    const res = await api.post(`/complaints/${id}/follow-up`, { remarks });
    return res.data;
  },
  triggerEscalation: async (id, reason, level = 1) => {
    const res = await api.post(`/complaints/${id}/escalate`, { reason, level });
    return res.data;
  },
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  uploadAudio: async (blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');
    const res = await api.post('/upload/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }
};
