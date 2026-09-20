import api from './client';

export const agentApi = {
  analyze: async (payload) => {
    const res = await api.post('/agent/analyze', payload);
    return res.data;
  },
  getTrace: async (complaintId) => {
    const res = await api.get(`/agent/trace/${complaintId}`);
    return res.data;
  },
  getEvaluation: async () => {
    const res = await api.get('/agent/evaluate');
    return res.data;
  },
  runAutonomousSweep: async (forceDemo = true) => {
    const res = await api.post('/agent/autonomous-sweep', { force_demo: forceDemo });
    return res.data;
  },
  getAutonomousStats: async () => {
    const res = await api.get('/agent/autonomous-stats');
    return res.data;
  },
  getAutonomousActions: async (limit = 20) => {
    const res = await api.get('/agent/autonomous-actions', { params: { limit } });
    return res.data;
  }
};
