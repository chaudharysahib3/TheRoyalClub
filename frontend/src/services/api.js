import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('trc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('trc_token');
      localStorage.removeItem('trc_user');
      if (window.location.pathname !== '/') window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const messageFromError = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong';

export default api;
