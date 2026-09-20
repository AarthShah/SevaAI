import api from './client';

export const departmentApi = {
  getDepartments: async () => {
    const res = await api.get('/departments');
    return res.data;
  },
  createDepartment: async (payload) => {
    const res = await api.post('/departments', payload);
    return res.data;
  }
};
