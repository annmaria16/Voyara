import api from './client';

export const providerApi = {
  getDashboard: async () => {
    const response = await api.get('/provider/dashboard');
    return response.data;
  },

  getTrust: async () => {
    const response = await api.get('/provider/trust');
    return response.data;
  },

  getPropertyTrust: async (propertyId) => {
    const response = await api.get(`/provider/properties/${propertyId}/trust`);
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

  getGuestInformation: async (propertyId) => {
    const response = await api.get(`/provider/properties/${propertyId}/guest-information`);
    return response.data;
  },

  updateGuestInformation: async (propertyId, guestInformationMessage) => {
    const response = await api.put(`/provider/properties/${propertyId}/guest-information`, {
      guest_information_message: guestInformationMessage,
    });
    return response.data;
  },

  lookupPincode: async (pincode) => {
    const clean = String(pincode).trim();
    if (!/^[1-9][0-9]{5}$/.test(clean)) {
      throw new Error('Pincode must be a 6-digit Indian postal code.');
    }
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
          const first = data[0].PostOffice[0];
          return {
            status: 'success',
            pincode: clean,
            district: first.District,
            state: first.State,
            country: first.Country || 'India',
            places: data[0].PostOffice.map(p => p.Name).filter(Boolean),
            post_offices: data[0].PostOffice
          };
        }
      }
    } catch (e) {
      console.warn('Direct pincode fetch failed, falling back to backend proxy:', e);
    }

    const response = await api.get(`/provider/pincode/${clean}`);
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

  // Cancellation Policy
  getCancellationPolicy: async (propertyId) => {
    const response = await api.get(`/provider/properties/${propertyId}/cancellation-policy`);
    return response.data;
  },

  updateCancellationPolicy: async (propertyId, cancellationRefundPercentage) => {
    const response = await api.put(`/provider/properties/${propertyId}/cancellation-policy`, {
      cancellation_refund_percentage: cancellationRefundPercentage,
    });
    return response.data;
  },

  // Bookings
  getBookings: async () => {
    const response = await api.get('/provider/bookings');
    return response.data;
  },

  checkInGuest: async (bookingId) => {
    const response = await api.post(`/provider/bookings/${bookingId}/check-in`);
    return response.data;
  },

  checkOutGuest: async (bookingId) => {
    const response = await api.post(`/provider/bookings/${bookingId}/check-out`);
    return response.data;
  },

  getBookingRefund: async (bookingId) => {
    const response = await api.get(`/provider/bookings/${bookingId}/refund`);
    return response.data;
  },
};
