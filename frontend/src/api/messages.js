import api from './client';

export const messagesApi = {
  /**
   * Fetch all booking-linked conversations for current user (Traveler or Stay Partner).
   */
  getConversations: async () => {
    const response = await api.get('/messages/conversations');
    return response.data;
  },

  /**
   * Fetch full conversation details and message history for a specific booking.
   */
  getBookingMessages: async (bookingId) => {
    const response = await api.get(`/messages/conversations/${bookingId}`);
    return response.data;
  },

  /**
   * Send a direct booking message.
   */
  sendBookingMessage: async (bookingId, message) => {
    const response = await api.post(`/messages/conversations/${bookingId}/messages`, { message });
    return response.data;
  },

  /**
   * Mark all counterparty messages in a booking conversation as read.
   */
  markConversationRead: async (bookingId) => {
    const response = await api.post(`/messages/conversations/${bookingId}/read`);
    return response.data;
  },

  /**
   * Get total unread messages count.
   */
  getUnreadCount: async () => {
    const response = await api.get('/messages/unread-count');
    return response.data;
  },

  /**
   * Fetch full stay information snapshot.
   */
  getStayInformation: async (bookingId) => {
    const response = await api.get(`/bookings/${bookingId}/stay-information`);
    return response.data;
  },
};

export default messagesApi;
