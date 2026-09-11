import api from './client';

export const authApi = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Phone OTP
  sendPhoneOtp: async (phone) => {
    const response = await api.post('/auth/phone/send-otp', { phone });
    return response.data;
  },

  resendPhoneOtp: async (phone) => {
    const response = await api.post('/auth/phone/resend-otp', { phone });
    return response.data;
  },

  verifyPhoneOtp: async (phone, otp) => {
    const response = await api.post('/auth/phone/verify-otp', { phone, otp });
    return response.data;
  },

  // Email Verification
  sendEmailVerification: async (email) => {
    const response = await api.post('/auth/email/send-verification', { email });
    return response.data;
  },

  verifyEmail: async (email, code) => {
    const response = await api.post('/auth/email/verify', { email, code });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
    return response.data;
  },

  googleAuth: async (googleData) => {
    const response = await api.post('/auth/google', googleData);
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await api.post('/auth/change-password', passwordData);
    return response.data;
  },
};
