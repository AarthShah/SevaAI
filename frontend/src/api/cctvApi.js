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
  autoDispatch: async (payload) => {
    const res = await api.post('/cctv/auto-dispatch', payload);
    return res.data;
  }
};
