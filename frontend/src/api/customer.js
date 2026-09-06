import api from './client';

export const customerApi = {
  searchProperties: async (params) => {
    const response = await api.get('/customer/search', { params });
    return response.data;
  },

  getPropertyDetails: async (propertyId) => {
    const response = await api.get(`/customer/properties/${propertyId}`);
    return response.data;
  },

  getExperiences: async (params) => {
    const response = await api.get('/customer/experiences', { params });
    return response.data;
  },

  getExperienceDetails: async (experienceId, date) => {
    const response = await api.get(`/customer/experiences/${experienceId}`, {
      params: date ? { target_date: date } : {},
    });
    return response.data;
  },

  createBooking: async (bookingData) => {
    const response = await api.post('/customer/bookings', bookingData);
    return response.data;
  },

  getMyBookings: async () => {
    const response = await api.get('/customer/bookings');
    return response.data;
  },

  getBookingDetails: async (bookingId) => {
    const response = await api.get(`/customer/bookings/${bookingId}`);
    return response.data;
  },

  cancelBooking: async (bookingId) => {
    const response = await api.post(`/customer/bookings/${bookingId}/cancel`);
    return response.data;
  },
};
