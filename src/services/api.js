import axios from 'axios';

// API base URL - change this for production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';


// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - only clear storage, don't redirect
      // This allows anonymous users to continue using public features
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Don't redirect - let the app handle it
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH APIs ====================

export const authAPI = {
  sendOTP: async (email) => {
    const response = await api.post('/api/auth/send-otp', { email });
    return response.data;
  },

  verifyOTP: async (email, otp) => {
    const response = await api.post('/api/auth/verify-otp', { email, otp });
    if (response.data.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  resendOTP: async (email) => {
    const response = await api.post('/api/auth/resend-otp', { email });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/api/auth/update-profile', data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Redirect to home instead of login
    window.location.href = '/';
  },
};

// ==================== OCR APIs ====================

export const ocrAPI = {
  extractText: async (imageFile, progressCallback) => {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await api.post('/api/ocr/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(percentCompleted);
      },
    });
    return response.data;
  },

  extractWithTables: async (imageFile, progressCallback) => {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await api.post('/api/ocr/extract-with-tables', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(percentCompleted);
      },
    });
    return response.data;
  },

  translate: async (scanId, targetLanguage) => {
    const response = await api.post('/api/ocr/translate', { scanId, targetLanguage });
    return response.data;
  },

  getScanHistory: async (page = 1, limit = 10) => {
    const response = await api.get(`/api/ocr/history?page=${page}&limit=${limit}`);
    return response.data;
  },

  getScan: async (scanId) => {
    const response = await api.get(`/api/ocr/scan/${scanId}`);
    return response.data;
  },

  deleteScan: async (scanId) => {
    const response = await api.delete(`/api/ocr/scan/${scanId}`);
    return response.data;
  },
};

// ==================== PAYMENT APIs ====================

export const paymentAPI = {
  getPlans: async () => {
    const response = await api.get('/api/payment/plans');
    return response.data;
  },

  createOrder: async (planId) => {
    const response = await api.post('/api/payment/create-order', { planId });
    return response.data;
  },

  verifyPayment: async (paymentData) => {
    const response = await api.post('/api/payment/verify', paymentData);
    return response.data;
  },

  getPaymentHistory: async (page = 1, limit = 10) => {
    const response = await api.get(`/api/payment/history?page=${page}&limit=${limit}`);
    return response.data;
  },

  getSubscriptionStatus: async () => {
    const response = await api.get('/api/payment/subscription-status');
    return response.data;
  },

  cancelSubscription: async () => {
    const response = await api.post('/api/payment/cancel-subscription');
    return response.data;
  },

  requestRefund: async (paymentId, reason) => {
    const response = await api.post('/api/payment/refund', { paymentId, reason });
    return response.data;
  },
};

// ==================== PDF APIs ====================

export const pdfAPI = {
  mergePDFs: async (files, progressCallback) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await api.post('/api/pdf/merge', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(percentCompleted);
      },
    });
    return response.data;
  },

  splitPDF: async (file, progressCallback) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/pdf/split', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(percentCompleted);
      },
    });
    return response.data;
  },

  compressPDF: async (file, progressCallback) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/pdf/compress', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(percentCompleted);
      },
    });
    return response.data;
  },

  rotatePDF: async (file, rotation, progressCallback) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('rotation', rotation);

    const response = await api.post('/api/pdf/rotate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(percentCompleted);
      },
    });
    return response.data;
  },

  extractPages: async (file, pages, progressCallback) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pages', pages);

    const response = await api.post('/api/pdf/extract-pages', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(percentCompleted);
      },
    });
    return response.data;
  },

  imagesToPDF: async (images, progressCallback) => {
    const formData = new FormData();
    images.forEach((image) => formData.append('images', image));

    const response = await api.post('/api/pdf/images-to-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(percentCompleted);
      },
    });
    return response.data;
  },

  getPDFInfo: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/pdf/info', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// ==================== HELPER FUNCTIONS ====================

export const downloadFile = (base64Data, filename, mimeType = 'application/pdf') => {
  const linkSource = `data:${mimeType};base64,${base64Data}`;
  const downloadLink = document.createElement('a');
  downloadLink.href = linkSource;
  downloadLink.download = filename;
  downloadLink.click();
};

export const getToken = () => localStorage.getItem('token');

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => !!getToken();

export default api;
