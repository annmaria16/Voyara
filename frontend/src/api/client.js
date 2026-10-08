import axios from 'axios';

/**
 * Resolves the centralized API base URL for Voyara.
 * Supports both VITE_API_BASE_URL and VITE_API_URL.
 * Safely strips trailing slashes and guarantees a single '/api' prefix without duplicates.
 */
const getBaseUrl = () => {
  const raw = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ''
  ).trim();

  if (!raw) {
    return '/api';
  }

  // Strip trailing slashes
  const trimmed = raw.replace(/\/+$/, '');

  // If already ends with /api (case-insensitive), return as-is
  if (trimmed.toLowerCase().endsWith('/api')) {
    return trimmed;
  }

  return `${trimmed}/api`;
};

const baseURL = getBaseUrl();

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('voyara_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle errors and format user-friendly messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token on unauthorized if not on auth routes
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        localStorage.removeItem('voyara_token');
        localStorage.removeItem('voyara_user');
      }
    }
    let message = error.response?.data?.detail;
    if (!message) {
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        message = 'Cannot connect to backend server. Please verify your internet connection or backend server status.';
      } else if (error.response?.status === 404) {
        message = 'The requested endpoint was not found on the backend API (404).';
      } else {
        message = error.message || 'An unexpected error occurred';
      }
    }
    return Promise.reject(new Error(message));
  }
);

export default api;
