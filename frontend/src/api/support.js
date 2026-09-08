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

  getTicketDetails: async (ticketId) => {
    const response = await api.get(`/support/tickets/${ticketId}`);
    return response.data;
  },

  getAdminTickets: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'ALL') {
      params.append('status', filters.status);
    }
    if (filters.category && filters.category !== 'ALL') {
      params.append('category', filters.category);
    }
    if (filters.search && filters.search.trim()) {
      params.append('search', filters.search.trim());
    }
    if (filters.date_sort) {
      params.append('date_sort', filters.date_sort);
    }

    const queryStr = params.toString();
    const url = `/support/admin/tickets${queryStr ? `?${queryStr}` : ''}`;
    const response = await api.get(url);
    return response.data;
  },

  replyAdminTicket: async (ticketId, replyData) => {
    const response = await api.post(`/support/admin/tickets/${ticketId}/reply`, replyData);
    return response.data;
  },

  replyUserTicket: async (ticketId, messageData) => {
    const response = await api.post(`/support/tickets/${ticketId}/reply`, messageData);
    return response.data;
  },
};

export default supportApi;

