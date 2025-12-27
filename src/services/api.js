import axios from 'axios';

// API base URL - change this for production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000, // 3 min default timeout for AI processing
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
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
    window.location.href = '/login';
  },
};

// ==================== OCR APIs ====================

export const ocrAPI = {
  /**
   * Extract text from image
   * @param {File} imageFile - Image file to process
   * @param {function} progressCallback - Progress callback (0-100)
   * @returns {Promise<object>} - OCR result
   */
  extractText: async (imageFile, progressCallback) => {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await api.post('/api/ocr/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(percent);
      },
    });
    
    return response.data;
  },

  /**
   * Extract text with table detection
   * @param {File} imageFile - Image file to process
   * @param {function} progressCallback - Progress callback (0-100)
   * @returns {Promise<object>} - OCR result with tables
   */
  extractWithTables: async (imageFile, progressCallback) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('detectTables', 'true');

    const response = await api.post('/api/ocr/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(percent);
      },
    });
    
    return response.data;
  },

  /**
   * Extract text from multiple images
   * @param {File[]} imageFiles - Array of image files
   * @param {function} progressCallback - Progress callback (0-100)
   * @returns {Promise<object>} - Combined OCR result
   */
  extractMultiple: async (imageFiles, progressCallback) => {
    const formData = new FormData();
    imageFiles.forEach((file) => formData.append('images', file));

    const response = await api.post('/api/ocr/extract-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(percent);
      },
    });
    
    return response.data;
  },

  /**
   * Create PDF from images
   * @param {File[]} imageFiles - Array of image files
   * @param {function} progressCallback - Progress callback (0-100)
   * @returns {Promise<object>} - PDF result with base64 data
   */
  createPDF: async (imageFiles, progressCallback) => {
    const formData = new FormData();
    imageFiles.forEach((file) => formData.append('images', file));

    const response = await api.post('/api/ocr/create-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(percent);
      },
    });
    
    return response.data;
  },

  /**
   * Translate text
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language code
   * @param {string} scanId - Optional scan ID
   * @returns {Promise<object>} - Translation result
   */
  translate: async (text, targetLanguage, scanId = null) => {
    const response = await api.post('/api/ocr/translate', { 
      text, 
      targetLanguage,
      scanId 
    });
    return response.data;
  },

  /**
   * Summarize text (AI Explanation)
   * @param {string} text - Text to summarize
   * @param {string} language - Optional language for response
   * @returns {Promise<object>} - Summary result
   */
  summarize: async (text, language = null) => {
    const response = await api.post('/api/ocr/summarize', { text, language });
    return response.data;
  },

  /**
   * Get scan history
   */
  getScanHistory: async (page = 1, limit = 10) => {
    const response = await api.get(`/api/ocr/history?page=${page}&limit=${limit}`);
    return response.data;
  },

  /**
   * Get single scan
   */
  getScan: async (scanId) => {
    const response = await api.get(`/api/ocr/scan/${scanId}`);
    return response.data;
  },

  /**
   * Delete scan
   */
  deleteScan: async (scanId) => {
    const response = await api.delete(`/api/ocr/scan/${scanId}`);
    return response.data;
  },

  /**
   * Get remaining scans
   */
  getRemaining: async () => {
    const response = await api.get('/api/ocr/remaining');
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

  getPaymentHistory: async () => {
    const response = await api.get('/api/payment/history');
    return response.data;
  },
};

// ==================== ADMIN APIs ====================

export const adminAPI = {
  // Dashboard
  getDashboard: async () => {
    const response = await api.get('/api/admin/dashboard');
    return response.data;
  },

  // Users
  getUsers: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/api/admin/users?${queryString}`);
    return response.data;
  },

  updateUser: async (userId, data) => {
    const response = await api.put(`/api/admin/users/${userId}`, data);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/api/admin/users/${userId}`);
    return response.data;
  },

  // Plans
  getPlans: async () => {
    const response = await api.get('/api/admin/plans');
    return response.data;
  },

  updatePlan: async (planId, data) => {
    const response = await api.put(`/api/admin/plans/${planId}`, data);
    return response.data;
  },

  // Transactions
  getTransactions: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/api/admin/transactions?${queryString}`);
    return response.data;
  },
};

export default api;
