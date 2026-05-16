/**
 * ZALEGRAM Frontend Configuration
 * Khai báo tập trung cho tất cả cấu hình
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000/api/v1',
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json'
  }
};

// Socket.IO Configuration
export const SOCKET_CONFIG = {
  URL: 'http://localhost:3000',
  OPTIONS: {
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    autoConnect: true
  }
};

// Application Constants
export const APP_CONFIG = {
  APP_NAME: 'ZALEGRAM',
  VERSION: '1.0.0',
  ENVIRONMENT: 'development'
};

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0
};

// Message Constants
export const MESSAGE_CONFIG = {
  MAX_LENGTH: 5000,
  MIN_LENGTH: 1,
  TYPING_TIMEOUT: 3000
};

// Error Messages (Vietnamese)
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Lỗi kết nối mạng. Vui lòng thử lại.',
  UNAUTHORIZED: 'Bạn chưa đăng nhập. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền truy cập.',
  NOT_FOUND: 'Không tìm thấy.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ.',
  SERVER_ERROR: 'Lỗi máy chủ. Vui lòng thử lại sau.',
  SOCKET_CONNECTION_ERROR: 'Kết nối Socket.IO thất bại.',
  SOCKET_DISCONNECTED: 'Mất kết nối với máy chủ.'
};

// Conversation Types
export const CONVERSATION_TYPES = {
  PRIVATE: 'PRIVATE',
  GROUP: 'GROUP'
};

// User Status
export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  LOCKED: 'LOCKED',
  BANNED: 'BANNED'
};

// User Roles
export const USER_ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  CURRENT_USER: 'zalegram_current_user',
  CURRENT_ROOM: 'zalegram_current_room',
  AUTH_TOKEN: 'zalegram_auth_token'
};