import api from './client';

export const providerApi = {
  getDashboard: async () => {
    const response = await api.get('/provider/dashboard');
    return response.data;
  },

  // Properties
  getProperties: async () => {
    const response = await api.get('/provider/properties');
    return response.data;
  },

  createProperty: async (data) => {
    const response = await api.post('/provider/properties', data);
    return response.data;
  },

  getProperty: async (id) => {
    const response = await api.get(`/provider/properties/${id}`);
    return response.data;
  },

  updateProperty: async (id, data) => {
    const response = await api.put(`/provider/properties/${id}`, data);
    return response.data;
  },

  deleteProperty: async (id) => {
    const response = await api.delete(`/provider/properties/${id}`);
    return response.data;
  },

  // Rooms
  getPropertyRooms: async (propertyId) => {
    const response = await api.get(`/provider/properties/${propertyId}/rooms`);
    return response.data;
  },

  createRoom: async (propertyId, data) => {
    const response = await api.post(`/provider/properties/${propertyId}/rooms`, data);
    return response.data;
  },

  updateRoom: async (roomId, data) => {
    const response = await api.put(`/provider/rooms/${roomId}`, data);
    return response.data;
  },

  deleteRoom: async (roomId) => {
    const response = await api.delete(`/provider/rooms/${roomId}`);
    return response.data;
  },

  // Availability
  getAvailability: async (propertyId) => {
    const response = await api.get(`/provider/properties/${propertyId}/availability`);
    return response.data;
  },

  closePropertyDates: async (propertyId, data) => {
    const response = await api.post(`/provider/properties/${propertyId}/availability/close`, data);
    return response.data;
  },

  removePropertyClosure: async (closureId) => {
    const response = await api.delete(`/provider/properties/availability/closure/${closureId}`);
    return response.data;
  },

  blockRoomDates: async (data) => {
    const response = await api.post('/provider/rooms/availability/block', data);
    return response.data;
  },

  removeRoomBlock: async (blockId) => {
    const response = await api.delete(`/provider/rooms/availability/block/${blockId}`);
    return response.data;
  },

  // Experiences
  getExperiences: async (propertyId) => {
    const response = await api.get(`/provider/properties/${propertyId}/experiences`);
    return response.data;
  },

  createExperience: async (propertyId, data) => {
    const response = await api.post(`/provider/properties/${propertyId}/experiences`, data);
    return response.data;
  },

  updateExperience: async (experienceId, data) => {
    const response = await api.put(`/provider/experiences/${experienceId}`, data);
    return response.data;
  },

  deleteExperience: async (experienceId) => {
    const response = await api.delete(`/provider/experiences/${experienceId}`);
    return response.data;
  },

  // Bookings
  getBookings: async () => {
    const response = await api.get('/provider/bookings');
    return response.data;
  },
};
