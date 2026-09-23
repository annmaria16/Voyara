import api from './client';

export const adminApi = {
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  getUsers: async (role, account_status) => {
    const params = {};
    if (role) params.role = role;
    if (account_status) params.account_status = account_status;
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  getUserDetail: async (userId) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  suspendUser: async (userId, data) => {
    const response = await api.post(`/admin/users/${userId}/suspend`, data);
    return response.data;
  },

  reactivateUser: async (userId) => {
    const response = await api.post(`/admin/users/${userId}/reactivate`);
    return response.data;
  },

  deactivateUser: async (userId, data = {}) => {
    const response = await api.post(`/admin/users/${userId}/deactivate`, data);
    return response.data;
  },

  toggleUserStatus: async (userId) => {
    const response = await api.put(`/admin/users/${userId}/toggle-status`);
    return response.data;
  },

  getProviders: async () => {
    const response = await api.get('/admin/providers');
    return response.data;
  },

  getProperties: async (verificationStatus) => {
    const response = await api.get('/admin/properties', {
      params: verificationStatus && verificationStatus !== 'ALL' ? { verification_status: verificationStatus } : {},
    });
    return response.data;
  },

  getPropertyDetail: async (propertyId) => {
    const response = await api.get(`/admin/properties/${propertyId}`);
    return response.data;
  },

  verifyProperty: async (propertyId, data) => {
    const response = await api.post(`/admin/properties/${propertyId}/verify`, data);
    return response.data;
  },

  togglePropertyStatus: async (propertyId) => {
    const response = await api.put(`/admin/properties/${propertyId}/toggle-status`);
    return response.data;
  },

  getRooms: async () => {
    const response = await api.get('/admin/rooms');
    return response.data;
  },

  getExperiences: async () => {
    const response = await api.get('/admin/experiences');
    return response.data;
  },

  getBookings: async () => {
    const response = await api.get('/admin/bookings');
    return response.data;
  },

  getBookingRefund: async (bookingId) => {
    const response = await api.get(`/admin/bookings/${bookingId}/refund`);
    return response.data;
  },

  getVerificationRecords: async (status) => {
    const response = await api.get('/admin/verification', {
      params: status ? { verification_status: status } : {},
    });
    return response.data;
  },

  getVerificationAudit: async (bookingId) => {
    const response = await api.get(`/admin/verification/${bookingId}`);
    return response.data;
  },

  // Control Center Platform Search
  search: async (query) => {
    const response = await api.get('/admin/search', { params: { q: query } });
    return response.data;
  },
};
