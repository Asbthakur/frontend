import api from './api';

// ==================== ADMIN APIs ====================

export const adminAPI = {
  // Dashboard
  getDashboard: async () => {
    const response = await api.get('/api/admin/dashboard');
    return response.data;
  },

  // User Management
  getUsers: async (page = 1, limit = 20, filters = {}) => {
    const params = new URLSearchParams({ page, limit, ...filters });
    const response = await api.get(`/api/admin/users?${params}`);
    return response.data;
  },

  getUser: async (userId) => {
    const response = await api.get(`/api/admin/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId, updates) => {
    const response = await api.put(`/api/admin/users/${userId}`, updates);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/api/admin/users/${userId}`);
    return response.data;
  },

  // Payment Management
  getPayments: async (page = 1, limit = 20, filters = {}) => {
    const params = new URLSearchParams({ page, limit, ...filters });
    const response = await api.get(`/api/admin/payments?${params}`);
    return response.data;
  },

  processRefund: async (paymentId, reason) => {
    const response = await api.post(`/api/admin/payments/${paymentId}/refund`, { reason });
    return response.data;
  },

  // Analytics
  getRevenueAnalytics: async (period = 'monthly') => {
    const response = await api.get(`/api/admin/analytics/revenue?period=${period}`);
    return response.data;
  },

  getUserAnalytics: async (period = 'monthly') => {
    const response = await api.get(`/api/admin/analytics/users?period=${period}`);
    return response.data;
  },

  getScanAnalytics: async (period = 'monthly') => {
    const response = await api.get(`/api/admin/analytics/scans?period=${period}`);
    return response.data;
  },

  // System Monitoring
  getSystemHealth: async () => {
    const response = await api.get('/api/admin/system/health');
    return response.data;
  },

  getSystemCosts: async () => {
    const response = await api.get('/api/admin/system/costs');
    return response.data;
  },
};

export default adminAPI;
