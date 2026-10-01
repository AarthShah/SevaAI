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
  reverseGeocode: async (lat, lng) => {
    try {
      const res = await api.get('/complaints/reverse-geocode', { params: { lat, lng } });
      return res.data;
    } catch {
      return null;
    }
  },
  getComplaintById: async (id) => {
    const res = await api.get(`/complaints/${id}`);
    return res.data;
  },
  updateStatus: async (id, status, remarks, departmentId, assignment = {}) => {
    const res = await api.patch(`/complaints/${id}/status`, {
      status,
      remarks,
      department_id: departmentId,
      assigned_officer_id: assignment.id,
      assigned_officer_name: assignment.name,
      assigned_officer_phone: assignment.phone
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
  },
  verifyEvidence: async (fileOrUrl, locationData = {}) => {
    const formData = new FormData();
    if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
      formData.append('file', fileOrUrl);
    } else if (typeof fileOrUrl === 'string') {
      formData.append('image_url', fileOrUrl);
    }
    if (locationData.image_url && !formData.has('image_url')) {
      formData.append('image_url', locationData.image_url);
    }
    if (locationData.latitude) formData.append('latitude', locationData.latitude);
    if (locationData.longitude) formData.append('longitude', locationData.longitude);
    if (locationData.address) formData.append('address', locationData.address);
    const res = await api.post('/complaints/verify-evidence', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  submitAuthenticityDecision: async (id, decision, notes = '') => {
    const res = await api.post(`/complaints/${id}/verify-authenticity-decision`, {
      decision,
      notes
    });
    return res.data;
  },

  // -------------------------------------------------------------
  // FEATURE 1: RESOLUTION VERIFICATION
  // -------------------------------------------------------------
  submitResolutionEvidence: async (id, file, remarks = '', officerId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (remarks) formData.append('remarks', remarks);
    if (officerId) formData.append('officer_id', officerId);
    const res = await api.post(`/complaints/${id}/resolution-evidence`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  getResolutionVerification: async (id) => {
    const res = await api.get(`/complaints/${id}/resolution-verification`);
    return res.data;
  },
  confirmResolution: async (id, remarks = '') => {
    const res = await api.post(`/complaints/${id}/resolution/confirm`, { remarks });
    return res.data;
  },
  reopenResolution: async (id, reason) => {
    const res = await api.post(`/complaints/${id}/resolution/reopen`, { reason });
    return res.data;
  },

  // -------------------------------------------------------------
  // FEATURE 2: DUPLICATE DETECTION
  // -------------------------------------------------------------
  checkDuplicates: async (payload) => {
    const res = await api.post('/complaints/check-duplicates', payload);
    return res.data;
  },
  getDuplicates: async (id) => {
    const res = await api.get(`/complaints/${id}/duplicates`);
    return res.data;
  },

  // -------------------------------------------------------------
  // FEATURE 3: COMPLAINT CLUSTERING
  // -------------------------------------------------------------
  getComplaintCluster: async (id) => {
    const res = await api.get(`/complaints/${id}/cluster`);
    return res.data;
  },
  getAllClusters: async () => {
    const res = await api.get('/complaints/clusters');
    return res.data;
  },
  runClusterSweep: async () => {
    const res = await api.post('/complaints/clusters/sweep');
    return res.data;
  },
  getHierarchicalHotspot: async (id) => {
    const res = await api.get(`/complaints/clusters/hotspot/${id}`);
    return res.data;
  },

  // -------------------------------------------------------------
  // FEATURE 4: LOCATION INTELLIGENCE
  // -------------------------------------------------------------
  getLocationIntelligence: async (id) => {
    const res = await api.get(`/complaints/${id}/location-intelligence`);
    return res.data;
  },

  // -------------------------------------------------------------
  // FEATURE 5: DEPARTMENT ROUTING
  // -------------------------------------------------------------
  getDepartmentRecommendation: async (id) => {
    const res = await api.get(`/complaints/${id}/department-recommendation`);
    return res.data;
  },
  overrideDepartment: async (id, departmentCode, supervisorNotes = '') => {
    const res = await api.post(`/complaints/${id}/department-override`, {
      department_code: departmentCode,
      supervisor_notes: supervisorNotes
    });
    return res.data;
  },
  getDepartmentWorkloads: async () => {
    const res = await api.get('/complaints/departments/workload');
    return res.data;
  },

  // -------------------------------------------------------------
  // FEATURE 6: EVIDENCE-GROUNDED DECISIONS
  // -------------------------------------------------------------
  getAiDecisionEvidence: async (id) => {
    const res = await api.get(`/complaints/${id}/ai-evidence`);
    return res.data;
  },

  // -------------------------------------------------------------
  // FEATURE 7: SLA PREDICTION
  // -------------------------------------------------------------
  getSlaPrediction: async (id) => {
    const res = await api.get(`/complaints/${id}/sla-prediction`);
    return res.data;
  },

  // -------------------------------------------------------------
  // FEATURE 8: PROACTIVE AI WATCHDOG
  // -------------------------------------------------------------
  getWatchdogStatus: async (id) => {
    const res = await api.get(`/complaints/${id}/watchdog-status`);
    return res.data;
  },
  runWatchdogSweep: async () => {
    const res = await api.post('/complaints/watchdog/sweep');
    return res.data;
  },
  getAllWatchdogEvents: async (limit = 50) => {
    const res = await api.get('/complaints/watchdog/events', { params: { limit } });
    return res.data;
  },
  markWatchdogAction: async (eventId, notes = '') => {
    const res = await api.post(`/complaints/watchdog/events/${eventId}/action`, { notes });
    return res.data;
  }
};
