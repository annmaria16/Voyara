import api from './client';

export const supportApi = {
  createTicket: async (ticketData) => {
    const response = await api.post('/support/tickets', ticketData);
    return response.data;
  },

  getMyTickets: async () => {
    const response = await api.get('/support/my-tickets');
    return response.data;
  },

  getAdminTickets: async () => {
    const response = await api.get('/support/admin/tickets');
    return response.data;
  },

  replyAdminTicket: async (ticketId, replyData) => {
    const response = await api.post(`/support/admin/tickets/${ticketId}/reply`, replyData);
    return response.data;
  },
};
