import api from './client';

export const adminApi = {
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  getUsers: async (role) => {
    const response = await api.get('/admin/users', { params: role ? { role } : {} });
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

  getProperties: async () => {
    const response = await api.get('/admin/properties');
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
};
