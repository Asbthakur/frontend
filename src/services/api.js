import axios from 'axios';

// API base URL - change this for production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increased timeout for large uploads
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
      timeout: 120000, // 2 min timeout for AI processing
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(Math.min(percent * 0.3, 30)); // 0-30% for upload
      },
    });
    
    if (progressCallback) progressCallback(100);
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

    const response = await api.post('/api/ocr/extract-with-tables', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000, // 3 min timeout
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(Math.min(percent * 0.3, 30));
      },
    });
    
    if (progressCallback) progressCallback(100);
    return response.data;
  },

  /**
   * Extract text from multiple images
   * @param {File[]} imageFiles - Array of image files
   * @param {function} progressCallback - Progress callback (0-100)
   * @returns {Promise<object>} - OCR result with pages
   */
  extractMultiple: async (imageFiles, progressCallback) => {
    const formData = new FormData();
    imageFiles.forEach((file) => formData.append('images', file));

    const response = await api.post('/api/ocr/extract-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 min timeout for multiple images
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(Math.min(percent * 0.3, 30));
      },
    });
    
    if (progressCallback) progressCallback(100);
    return response.data;
  },

  /**
   * Create PDF from images (Synchronous - No AI)
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
   * Translate text (Synchronous)
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
   * Summarize text (Synchronous)
   * @param {string} text - Text to summarize
   * @returns {Promise<object>} - Summary result
   */
  summarize: async (text) => {
    const response = await api.post('/api/ocr/summarize', { text });
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

/**
 * Download file from base64 data
 */
export const downloadFile = (base64Data, filename, mimeType = 'application/pdf') => {
  const linkSource = `data:${mimeType};base64,${base64Data}`;
  const downloadLink = document.createElement('a');
  downloadLink.href = linkSource;
  downloadLink.download = filename;
  downloadLink.click();
};

/**
 * Download blob as file
 */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = filename;
  downloadLink.click();
  URL.revokeObjectURL(url);
};

/**
 * Convert text to Word document (DOCX)
 */
export const exportToWord = (text, filename = 'document.docx') => {
  // Simple DOCX format using HTML conversion
  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word'>
    <head>
      <meta charset="utf-8">
      <title>Document</title>
    </head>
    <body>
      <pre style="font-family: Arial, sans-serif; font-size: 12pt; white-space: pre-wrap;">${text}</pre>
    </body>
    </html>
  `;
  
  const blob = new Blob([html], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  downloadBlob(blob, filename);
};

/**
 * Convert text/tables to Excel (CSV format)
 */
export const exportToExcel = (text, tables = [], filename = 'document.xlsx') => {
  let csvContent = '';
  
  // If tables exist, export them
  if (tables && tables.length > 0) {
    tables.forEach((table, index) => {
      if (index > 0) csvContent += '\n\n';
      csvContent += `Table ${index + 1}\n`;
      
      if (table.data && Array.isArray(table.data)) {
        table.data.forEach(row => {
          if (Array.isArray(row)) {
            csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
          }
        });
      }
    });
  } else {
    // Export text as single cell
    csvContent = text;
  }
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.replace('.xlsx', '.csv'));
};

/**
 * Export text to plain text file
 */
export const exportToText = (text, filename = 'document.txt') => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  downloadBlob(blob, filename);
};

/**
 * Export to PDF using the API
 */
export const exportToPDF = async (imageFiles, filename = 'document.pdf', progressCallback) => {
  try {
    const result = await ocrAPI.createPDF(imageFiles, progressCallback);
    if (result.success && result.pdf) {
      downloadFile(result.pdf, filename, 'application/pdf');
      return { success: true };
    }
    return { success: false, error: 'Failed to create PDF' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getToken = () => localStorage.getItem('token');

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => !!getToken();

export default api;
