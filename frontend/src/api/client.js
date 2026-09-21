import axios from 'axios';

const apiBase = import.meta.env.VITE_API_BASE_URL;
const baseURL = apiBase ? `${apiBase.replace(/\/$/, '')}/api` : '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercept requests to inject JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('civicseva_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses for unified error message extraction
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
