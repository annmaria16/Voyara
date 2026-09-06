import api from './client';

export const verinovaApi = {
  verifyBooking: async (bookingId) => {
    const response = await api.post(`/verinova/verify/${bookingId}`);
    return response.data;
  },

  getResults: async (bookingId) => {
    const response = await api.get(`/verinova/results/${bookingId}`);
    return response.data;
  },
};
