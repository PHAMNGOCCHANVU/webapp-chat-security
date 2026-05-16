/**
 * ZALEGRAM API Service Layer
 * Wrapper functions cho tất cả Backend API calls
 */

import { API_CONFIG, PAGINATION, ERROR_MESSAGES } from './config.js';

// Cấu hình Axios defaults
axios.defaults.baseURL = API_CONFIG.BASE_URL;
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json';

/**
 * Error Handler Utility
 */
const handleError = (error) => {
  const errorMsg = error.response?.data?.error || 
                   error.message || 
                   ERROR_MESSAGES.SERVER_ERROR;
  
  if (error.response?.status === 401) {
    window.location.href = '/pages/login.html';
  }
  
  throw new Error(errorMsg);
};

/**
 * AUTHENTICATION APIs
 */
export const authAPI = {
  // Register new user
  register: async (data) => {
    try {
      const response = await axios.post('/auth/register', {
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        password: data.password
      });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // Login
  login: async (email, password) => {
    try {
      const response = await axios.post('/auth/login', {
        username: email, // API accepts username or email
        password
      });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // Get current user profile
  getProfile: async () => {
    try {
      const response = await axios.get('/auth/profile');
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // Update profile
  updateProfile: async (displayName, avatarUrl) => {
    try {
      const response = await axios.put('/auth/profile', {
        displayName,
        avatarUrl
      });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // Change password
  changePassword: async (oldPassword, newPassword, confirmPassword) => {
    try {
      const response = await axios.post('/auth/change-password', {
        oldPassword,
        newPassword,
        confirmPassword
      });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // Logout
  logout: async () => {
    try {
      const response = await axios.post('/auth/logout');
      return response.data;
    } catch (error) {
      handleError(error);
    }
  }
};

/**
 * ROOM/CONVERSATION APIs
 */
export const roomAPI = {
  // List all rooms
  listRooms: async () => {
    try {
      const response = await axios.get('/rooms');
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // Create new room
  createRoom: async (conversationName, conversationType = 'GROUP') => {
    try {
      const response = await axios.post('/rooms', {
        conversationName,
        conversationType
      });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // Get room details
  getRoomDetails: async (conversationId) => {
    try {
      const response = await axios.get(`/rooms/${conversationId}`);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // Get messages with pagination
  getMessages: async (conversationId, limit = PAGINATION.DEFAULT_LIMIT, offset = PAGINATION.DEFAULT_OFFSET) => {
    try {
      const response = await axios.get(`/rooms/${conversationId}/messages`, {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // Add member to room
  addMember: async (conversationId, userId) => {
    try {
      const response = await axios.post(`/rooms/${conversationId}/members`, {
        userId
      });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // Remove member from room
  removeMember: async (conversationId, userId) => {
    try {
      const response = await axios.delete(`/rooms/${conversationId}/members/${userId}`);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  }
};

/**
 * ADMIN APIs
 */
export const adminAPI = {
  // Get audit logs
  getAuditLogs: async (filters = {}) => {
    try {
      const response = await axios.get('/admin/audit-logs', {
        params: filters
      });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // Get all users
  listUsers: async () => {
    try {
      const response = await axios.get('/admin/users');
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // Update user status
  updateUserStatus: async (userId, status) => {
    try {
      const response = await axios.patch(`/admin/users/${userId}/status`, {
        status
      });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // Change user role
  changeUserRole: async (userId, role) => {
    try {
      const response = await axios.patch(`/admin/users/${userId}/role`, {
        role
      });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // Delete user
  deleteUser: async (userId) => {
    try {
      const response = await axios.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // Get system statistics
  getStats: async () => {
    try {
      const response = await axios.get('/admin/stats');
      return response.data;
    } catch (error) {
      handleError(error);
    }
  }
};

// Export all APIs as namespace
export const API = {
  auth: authAPI,
  room: roomAPI,
  admin: adminAPI
};