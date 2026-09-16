import api from './client';

export const voyaraAiApi = {
  // Voyara AI Property Information Assistant Q&A
  askQuestion: async (data) => {
    const response = await api.post('/ai/property-chat', data);
    return response.data;
  },

  askVoyaraLegacy: async (data) => {
    const response = await api.post('/ai/voyara/ask', data);
    return response.data;
  },

  // Property Rules
  getPropertyRules: async (propertyId) => {
    const response = await api.get(`/provider/properties/${propertyId}/rules`);
    return response.data;
  },

  updatePropertyRules: async (propertyId, data) => {
    const response = await api.put(`/provider/properties/${propertyId}/rules`, data);
    return response.data;
  },

  // Room Rules
  getRoomRules: async (roomId) => {
    const response = await api.get(`/provider/rooms/${roomId}/rules`);
    return response.data;
  },

  updateRoomRules: async (roomId, data) => {
    const response = await api.put(`/provider/rooms/${roomId}/rules`, data);
    return response.data;
  },
};

export const stayGuideApi = voyaraAiApi;
export default voyaraAiApi;
