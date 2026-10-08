import api from './client';

export const aiBookingApi = {
  /**
   * Sends a natural language booking request or interactive response to Voyara AI.
   * @param {Object} data { message, conversation_id, session_id, selected_property_id, selected_room_id, selected_adventure_ids, selected_experience_ids, trip_context, action }
   */
  sendChatMessage: async (data) => {
    const response = await api.post('/ai/booking/chat', data);
    return response.data;
  },

  /**
   * Explicitly confirms and executes a booking from a server-side verified preview.
   * @param {Object} data { preview_id, idempotency_key, rules_accepted, customer_notes, razorpay_order_id, razorpay_payment_id, razorpay_signature }
   */
  confirmBooking: async (data) => {
    const response = await api.post('/ai/booking/confirm', data);
    return response.data;
  },

  /**
   * Initializes a Razorpay Payment Order for an AI booking preview.
   * @param {Object} data { preview_id, idempotency_key, rules_accepted, customer_notes }
   */
  createPaymentOrder: async (data) => {
    const response = await api.post('/ai/booking/create-payment-order', data);
    return response.data;
  },

  /**
   * Verifies Razorpay payment signature and finalizes VeriNova booking verification.
   * @param {Object} data { preview_id, booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_method, idempotency_key }
   */
  verifyPayment: async (data) => {
    const response = await api.post('/ai/booking/verify-payment', data);
    return response.data;
  },

  /**
   * Records Razorpay checkout dismissal or gateway payment decline.
   * @param {Object} data { booking_id, razorpay_order_id, error_code, error_description }
   */
  recordPaymentFailure: async (data) => {
    const response = await api.post('/ai/booking/record-payment-failure', data);
    return response.data;
  },

  /**
   * Retrieves the traveler's recent AI booking sessions.
   */
  getSessions: async () => {
    const response = await api.get('/ai/booking/sessions');
    return response.data;
  },

  /**
   * Retrieves full details and message history for a specific session.
   * @param {string} sessionId
   */
  getSessionDetail: async (sessionId) => {
    const response = await api.get(`/ai/booking/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Retrieves research metrics for Admin verification center.
   */
  getResearchMetrics: async () => {
    const response = await api.get('/ai/admin/ai-agent-research/metrics');
    return response.data;
  },

  /**
   * Retrieves research audit logs for Admin verification center.
   * @param {Object} params { limit, include_simulations }
   */
  getResearchLogs: async (params = {}) => {
    const response = await api.get('/ai/admin/ai-agent-research/logs', { params });
    return response.data;
  },

  /**
   * Triggers a controlled failure mode research simulation.
   * @param {Object} data { scenario, destination, adults, children }
   */
  runSimulation: async (data) => {
    const response = await api.post('/ai/admin/ai-agent-research/simulate', data);
    return response.data;
  },

  /**
   * Triggers standalone independent VeriNova outcome verification on a booking ID.
   * @param {number} bookingId
   */
  verifyBooking: async (bookingId) => {
    const response = await api.post(`/verinova/verify-booking/${bookingId}`);
    return response.data;
  }
};

export default aiBookingApi;
