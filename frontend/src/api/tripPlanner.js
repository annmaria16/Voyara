import api from './client';

export const tripPlannerApi = {
  /**
   * Conversational trip planner chat endpoint
   */
  chatTripPlanner: async (data) => {
    const response = await api.post('/ai/trip-planner/chat', data);
    return response.data;
  },

  /**
   * Generates a complete, validated trip plan from traveler preferences
   */
  generateTripPlan: async (requestData) => {
    const response = await api.post('/ai/trip-planner', requestData);
    return response.data;
  },

  /**
   * Switches / selects a specific property and room in the trip plan
   */
  selectStay: async (data) => {
    const response = await api.post('/ai/trip-planner/select-stay', data);
    return response.data;
  },

  /**
   * Pre-validates trip planner parameters
   */
  validateInput: async (requestData) => {
    const response = await api.post('/ai/trip-planner/validate', requestData);
    return response.data;
  },

  /**
   * Regenerates a single day in the itinerary
   */
  regenerateDay: async (data) => {
    const response = await api.post('/ai/trip-planner/regenerate-day', data);
    return response.data;
  },

  /**
   * Rechecks live room/experience inventory and price freshness for a saved trip
   */
  revalidateTrip: async (tripId) => {
    const response = await api.post(`/ai/trip-planner/revalidate?trip_id=${tripId}`);
    return response.data;
  },

  /**
   * Persistent Chat Sessions API (ChatGPT style history)
   */
  getSessions: async () => {
    const response = await api.get('/ai/trip-planner/sessions');
    return response.data;
  },

  createSession: async (data = {}) => {
    const response = await api.post('/ai/trip-planner/sessions', data);
    return response.data;
  },

  getSessionDetails: async (sessionId) => {
    const response = await api.get(`/ai/trip-planner/sessions/${sessionId}`);
    return response.data;
  },

  deleteSession: async (sessionId) => {
    const response = await api.delete(`/ai/trip-planner/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Saves a generated trip plan to PostgreSQL for the authenticated traveler
   */
  saveTrip: async (data) => {
    const response = await api.post('/ai/trips', data);
    return response.data;
  },

  /**
   * Retrieves all saved trip plans for current user
   */
  getMyTrips: async () => {
    const response = await api.get('/ai/trips');
    return response.data;
  },

  /**
   * Retrieves full details of a saved trip
   */
  getTripDetails: async (tripId) => {
    const response = await api.get(`/ai/trips/${tripId}`);
    return response.data;
  },

  /**
   * Deletes a saved trip plan
   */
  deleteTrip: async (tripId) => {
    const response = await api.delete(`/ai/trips/${tripId}`);
    return response.data;
  }
};

export default tripPlannerApi;
