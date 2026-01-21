import axios from 'axios';
import { getSession } from 'next-auth/react';

// Ensure baseURL always ends with /api
const getBaseURL = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return url.endsWith('/api') ? url : `${url}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // 30 second timeout
});

// Request interceptor - add auth token from NextAuth session
api.interceptors.request.use(async (config) => {
  // Try to get token from NextAuth session
  if (typeof window !== 'undefined') {
    try {
      const session = await getSession();
      if (session?.apiToken) {
        config.headers.Authorization = `Bearer ${session.apiToken}`;
      }
    } catch (err) {
      console.warn('Failed to get session for API request:', err);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 - Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      // Token expired or invalid - redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    
    // Handle network errors
    if (!error.response) {
      error.message = 'Network error. Please check your internet connection.';
    }
    
    // Handle rate limiting
    if (error.response?.status === 429) {
      error.message = 'Too many requests. Please wait and try again.';
    }
    
    return Promise.reject(error);
  }
);

// Retry wrapper for important requests
const withRetry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      if (error.response?.status >= 400 && error.response?.status < 500) throw error; // Don't retry client errors
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

export const transactions = {
  create: (data) => api.post('/transactions', data),
  list: (params) => api.get('/transactions', { params }),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  total: () => api.get('/transactions/total'),
};

export const summary = {
  get: (params) => api.get('/summary', { params }),
  daily: () => api.get('/summary/daily'),
};

export const customers = {
  list: () => api.get('/customers'),
  receivables: () => api.get('/customers/receivables'),
  get: (name) => api.get(`/customers/${encodeURIComponent(name)}`),
};

// Ledger / Reports APIs
export const ledger = {
  create: (data) => api.post('/ledger/transactions', data),
  customer: (params) => api.get('/ledger/customer', { params }),
  summary: (params) => api.get('/ledger/summary', { params }),
  outstanding: () => api.get('/ledger/outstanding'),
  modeSplit: (params) => api.get('/ledger/mode-split', { params }),
  exportPdf: (params) => api.post('/ledger/export/pdf', null, { params, responseType: 'blob' }),
  exportExcel: (params) => api.post('/ledger/export/excel', null, { params, responseType: 'blob' }),
};

// Reminders API
export const reminders = {
  overdue: () => api.get('/reminders/overdue'),
  dueSoon: () => api.get('/reminders/due-soon'),
  send: (data) => api.post('/reminders/send', data),
  schedule: (data) => api.post('/reminders/schedule', data),
  scheduled: () => api.get('/reminders/scheduled'),
  stats: () => api.get('/reminders/stats'),
};

// Billing API
export const billing = {
  plan: () => api.get('/billing/plan'),
  activate: (plan, daysValid) => api.post('/billing/activate', { plan, daysValid }),
};

export { withRetry };
export default api; 