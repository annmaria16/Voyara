import api from './client';

export const notificationApi = {
  getNotifications: async (params = {}) => {
    const res = await api.get('/notifications', { params });
    return res.data;
  },

  getUnreadCount: async () => {
    const res = await api.get('/notifications/unread-count');
    return res.data; // { unread_count: N }
  },

  markAsRead: async (notificationId) => {
    const res = await api.put(`/notifications/${notificationId}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await api.put('/notifications/read-all');
    return res.data;
  },

  deleteNotification: async (notificationId) => {
    const res = await api.delete(`/notifications/${notificationId}`);
    return res.data;
  },
};

export default notificationApi;
