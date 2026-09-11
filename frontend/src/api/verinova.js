import api from './client';

export const verinovaApi = {
  // Admin Endpoints
  getOverview: async () => {
    const response = await api.get('/admin/verinova/overview');
    return response.data;
  },

  getPropertyAssessments: async (params = {}) => {
    const response = await api.get('/admin/verinova/properties', { params });
    return response.data;
  },

  getPropertyAssessmentDetail: async (propertyId) => {
    const response = await api.get(`/admin/verinova/properties/${propertyId}`);
    return response.data;
  },

  triggerPropertyAssessment: async (propertyId) => {
    const response = await api.post(`/admin/verinova/properties/${propertyId}/assess`);
    return response.data;
  },

  updateEvidenceStatus: async (propertyId, data) => {
    const response = await api.post(`/admin/verinova/properties/${propertyId}/evidence/status`, data);
    return response.data;
  },

  approveProperty: async (propertyId, data = {}) => {
    const response = await api.post(`/admin/verinova/properties/${propertyId}/approve`, data);
    return response.data;
  },

  requestPropertyReview: async (propertyId, data = {}) => {
    const response = await api.post(`/admin/verinova/properties/${propertyId}/request-review`, data);
    return response.data;
  },

  rejectProperty: async (propertyId, data = {}) => {
    const response = await api.post(`/admin/verinova/properties/${propertyId}/reject`, data);
    return response.data;
  },

  getVerifiedTransactions: async (limit = 50) => {
    const response = await api.get('/admin/verinova/transactions', { params: { limit } });
    return response.data;
  },

  getAuditLogs: async (params = {}) => {
    const response = await api.get('/admin/verinova/audit-logs', { params });
    return response.data;
  },

  // Provider Endpoints
  getProviderPropertyStatus: async (propertyId) => {
    const response = await api.get(`/provider/verinova/properties/${propertyId}`);
    return response.data;
  },

  // Legacy / Booking verification endpoints
  verifyBooking: async (bookingId) => {
    const response = await api.post(`/verinova/verify/${bookingId}`);
    return response.data;
  },

  getResults: async (bookingId) => {
    const response = await api.get(`/verinova/results/${bookingId}`);
    return response.data;
  },
};
