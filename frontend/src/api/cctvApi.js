import api from './client';

export const cctvApi = {
  getCameras: async () => {
    const res = await api.get('/cctv/cameras');
    return res.data;
  },

  scanFeed: async (cameraId, file = null) => {
    const formData = new FormData();
    if (cameraId) formData.append('camera_id', cameraId);
    if (file) formData.append('image', file);

    const res = await api.post('/cctv/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  // Phase 12A: Real YOLO11s V2 Video Processing
  processPresetVideo: async (presetName, cameraId = 'CCTV-PRESET', confThresh = 0.25) => {
    const res = await api.post('/cctv/process-preset', {
      preset_name: presetName,
      camera_id: cameraId,
      conf_thresh: confThresh
    }, {
      timeout: 300000
    });
    return res.data;
  },

  processVideo: async (videoFile, cameraId = 'CAM-UPLOAD-AI', confThresh = 0.25, submitEvents = true, onProgress = null) => {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('camera_id', cameraId);
    formData.append('conf_thresh', String(confThresh));
    formData.append('submit_events', submitEvents ? 'true' : 'false');

    const res = await api.post('/cctv/process-video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 minutes for large videos
    });
    return res.data;
  },

  autoDispatch: async (payload) => {
    const res = await api.post('/cctv/auto-dispatch', payload);
    return res.data;
  },

  // --- Phase 10 Service-to-Service & Officer Triage APIs ---
  getEvents: async (params = {}) => {
    const res = await api.get('/cctv/events', { params });
    return res.data;
  },
  getEventById: async (eventId) => {
    const res = await api.get(`/cctv/events/${eventId}`);
    return res.data;
  },
  updateEventStatus: async (eventId, payload) => {
    const res = await api.patch(`/cctv/events/${eventId}/status`, payload);
    return res.data;
  },
  convertToComplaint: async (eventId, payload = {}) => {
    const res = await api.post(`/cctv/events/${eventId}/convert-to-complaint`, payload);
    return res.data;
  }
};
