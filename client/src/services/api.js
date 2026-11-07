import axios from 'axios';

const defaultBaseUrl = import.meta.env.PROD
  ? 'https://ai-appointment-booking-assistant.vercel.app/api'
  : 'http://localhost:3001/api';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl,
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
