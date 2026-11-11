import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || 'https://ai-appointment-booking-assistant.vercel.app/api';
  }
  // In development, if accessing via LAN IP or custom host (e.g. phone over Wi-Fi), route to host:3001
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:3001/api`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor — log errors in dev
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error('[API Error]', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
