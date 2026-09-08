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

  getRoomAvailability: async (roomId, checkIn, checkOut) => {
    const params = {};
    if (checkIn) params.check_in = checkIn;
    if (checkOut) params.check_out = checkOut;
    const response = await api.get(`/customer/rooms/${roomId}/availability`, { params });
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

  getPaymentConfig: async () => {
    const response = await api.get('/customer/payments/config');
    return response.data;
  },

  createPaymentOrder: async (bookingData) => {
    const response = await api.post('/customer/payments/create-order', bookingData);
    return response.data;
  },

  verifyPayment: async (verifyData) => {
    const response = await api.post('/customer/payments/verify', verifyData);
    return response.data;
  },

  recordPaymentFailure: async (failureData) => {
    const response = await api.post('/customer/payments/failure', failureData);
    return response.data;
  },

  getPaymentDetails: async (bookingId) => {
    const response = await api.get(`/customer/payments/${bookingId}`);
    return response.data;
  },

  // Reviews & Ratings
  submitReview: async (data) => {
    const response = await api.post('/customer/reviews', data);
    return response.data;
  },

  getEligibleBookingsForReview: async () => {
    const response = await api.get('/customer/reviews/eligible-bookings');
    return response.data;
  },

  getPropertyReviews: async (propertyId) => {
    const response = await api.get(`/customer/reviews/properties/${propertyId}`);
    return response.data;
  },
};
