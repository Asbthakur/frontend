/**
 * API Service - WITH PDF SUPPORT
 * 
 * Changes:
 * - Added pdfToImages utility import
 * - extractText now accepts PDF files and converts them automatically
 * - extractMultiple now handles PDFs
 */

import axios from 'axios';
import { isPDF, pdfToImages, processFiles } from './utils/pdfToImages';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000,
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
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== IMAGE COMPRESSION ====================

/**
 * Compress image before upload
 */
const compressImage = async (file, maxWidth = 1200, quality = 0.7) => {
  return new Promise((resolve) => {
    if (file.size < 300 * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            console.log(`[Compress] ${Math.round(file.size/1024)}KB → ${Math.round(blob.size/1024)}KB`);
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
};

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
   * Extract text from image OR PDF
   * If PDF is provided, converts to images first
   */
  extractText: async (file, progressCallback) => {
    let imageFile = file;
    
    // If PDF, convert first page to image
    if (isPDF(file)) {
      console.log('[OCR] PDF detected, converting to image...');
      if (progressCallback) progressCallback(5);
      
      const images = await pdfToImages(file, { 
        maxPages: 1,
        onProgress: (page, total) => {
          if (progressCallback) progressCallback(10);
        }
      });
      
      if (images.length === 0) {
        throw new Error('Failed to convert PDF');
      }
      imageFile = images[0];
    }
    
    // Compress image
    const compressedFile = await compressImage(imageFile, 1200, 0.7);
    
    const formData = new FormData();
    formData.append('image', compressedFile);

    const response = await api.post('/api/ocr/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(15 + Math.min(percent * 0.15, 15));
      },
    });
    
    if (progressCallback) progressCallback(100);
    return response.data;
  },

  /**
   * Extract text with table detection
   * Supports both images and PDFs
   */
  extractWithTables: async (file, progressCallback) => {
    let imageFile = file;
    
    // If PDF, convert first page to image
    if (isPDF(file)) {
      console.log('[OCR] PDF detected, converting to image...');
      if (progressCallback) progressCallback(5);
      
      const images = await pdfToImages(file, { maxPages: 1 });
      if (images.length === 0) {
        throw new Error('Failed to convert PDF');
      }
      imageFile = images[0];
    }
    
    const compressedFile = await compressImage(imageFile, 1400, 0.75);
    
    const formData = new FormData();
    formData.append('image', compressedFile);

    const response = await api.post('/api/ocr/extract-with-tables', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(Math.min(percent * 0.3, 30));
      },
    });
    
    if (progressCallback) progressCallback(100);
    return response.data;
  },

  /**
   * Extract text from multiple files (images and/or PDFs)
   * PDFs are converted to images automatically
   */
  extractMultiple: async (files, progressCallback) => {
    // Process all files - convert PDFs to images
    console.log(`[OCR] Processing ${files.length} file(s)...`);
    if (progressCallback) progressCallback(5);
    
    const allImages = await processFiles(files, {
      maxPages: 20,
      onProgress: (page, total) => {
        if (progressCallback) {
          const pdfProgress = (page / total) * 15;
          progressCallback(5 + pdfProgress);
        }
      }
    });
    
    console.log(`[OCR] Total images to process: ${allImages.length}`);
    if (progressCallback) progressCallback(20);
    
    // Compress all images
    const compressedFiles = await Promise.all(
      allImages.map(file => compressImage(file, 1200, 0.7))
    );
    
    const formData = new FormData();
    compressedFiles.forEach((file) => formData.append('images', file));

    const response = await api.post('/api/ocr/extract-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(25 + Math.min(percent * 0.5, 50));
      },
    });
    
    if (progressCallback) progressCallback(100);
    return response.data;
  },

  /**
   * Translate text
   */
  translate: async (text, targetLanguage, scanId = null) => {
    const response = await api.post('/api/ocr/translate', {
      text,
      targetLanguage,
      scanId,
    });
    return response.data;
  },

  /**
   * Get AI explanation/summary
   */
  summarize: async (text, language = null) => {
    const response = await api.post('/api/ocr/summarize', {
      text,
      language,
    });
    return response.data;
  },

  /**
   * Create PDF from images
   */
  createPDF: async (imageFiles, progressCallback) => {
    const formData = new FormData();
    
    for (const file of imageFiles) {
      const compressed = await compressImage(file, 1400, 0.8);
      formData.append('images', compressed);
    }

    const response = await api.post('/api/ocr/create-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (progressCallback) progressCallback(Math.min(percent * 0.5, 50));
      },
    });
    
    if (progressCallback) progressCallback(100);
    return response.data;
  },

  /**
   * Get remaining scans
   */
  getRemaining: async () => {
    const response = await api.get('/api/ocr/remaining');
    return response.data;
  },

  /**
   * Get scan history
   */
  getHistory: async (limit = 20, skip = 0) => {
    const response = await api.get('/api/ocr/history', {
      params: { limit, skip },
    });
    return response.data;
  },
};

// ==================== PAYMENT APIs ====================

export const paymentAPI = {
  createOrder: async (planId) => {
    const response = await api.post('/api/payment/create-order', { planId });
    return response.data;
  },

  verifyPayment: async (paymentData) => {
    const response = await api.post('/api/payment/verify', paymentData);
    return response.data;
  },

  getPlans: async () => {
    const response = await api.get('/api/payment/plans');
    return response.data;
  },
};

export default api;
