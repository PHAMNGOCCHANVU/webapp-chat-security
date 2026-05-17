/**
 * Danh sách các loại hành động Audit (Audit Action Types)
 * Tập trung tất cả action types để đảm bảo nhất quán trong toàn hệ thống
 */
export enum AuditAction {
  // ========== AUTH ==========
  REGISTER = "REGISTER",
  REGISTER_FAILED = "REGISTER_FAILED",
  LOGIN = "LOGIN",
  LOGIN_FAILED = "LOGIN_FAILED",
  LOGOUT = "LOGOUT",

  // ========== PROFILE ==========
  UPDATE_PROFILE = "UPDATE_PROFILE",
  CHANGE_PASSWORD = "CHANGE_PASSWORD",
  CHANGE_PASSWORD_FAILED = "CHANGE_PASSWORD_FAILED",

  // ========== CONVERSATIONS (ROOMS) ==========
  CREATE_CONVERSATION = "CREATE_CONVERSATION",
  ADD_MEMBER = "ADD_MEMBER",
  REMOVE_MEMBER = "REMOVE_MEMBER",
  LEAVE_ROOM = "LEAVE_ROOM",

  // ========== MESSAGES ==========
  SEND_MESSAGE = "SEND_MESSAGE",

  // ========== ADMIN ==========
  UPDATE_USER_STATUS = "UPDATE_USER_STATUS",
  UPDATE_USER_ROLE = "UPDATE_USER_ROLE",
  DELETE_USER = "DELETE_USER",

  // ========== ACCESS CONTROL ==========
  ACCESS_DENIED = "ACCESS_DENIED",

  // ========== SOCKET ==========
  SOCKET_CONNECT = "SOCKET_CONNECT",
  SOCKET_DISCONNECT = "SOCKET_DISCONNECT",

  // ========== AUTO-LOGGED (middleware) ==========
  HTTP_REQUEST = "HTTP_REQUEST",
}

/**
 * Tên hiển thị (tiếng Việt) cho từng action — dùng để hiển thị trên UI
 */
export const AuditActionLabel: Record<AuditAction, string> = {
  [AuditAction.REGISTER]: "Đăng ký tài khoản",
  [AuditAction.REGISTER_FAILED]: "Đăng ký thất bại",
  [AuditAction.LOGIN]: "Đăng nhập",
  [AuditAction.LOGIN_FAILED]: "Đăng nhập thất bại",
  [AuditAction.LOGOUT]: "Đăng xuất",
  [AuditAction.UPDATE_PROFILE]: "Cập nhật hồ sơ",
  [AuditAction.CHANGE_PASSWORD]: "Đổi mật khẩu",
  [AuditAction.CHANGE_PASSWORD_FAILED]: "Đổi mật khẩu thất bại",
  [AuditAction.CREATE_CONVERSATION]: "Tạo cuộc hội thoại",
  [AuditAction.ADD_MEMBER]: "Thêm thành viên",
  [AuditAction.REMOVE_MEMBER]: "Xóa thành viên",
  [AuditAction.LEAVE_ROOM]: "Rời phòng chat",
  [AuditAction.SEND_MESSAGE]: "Gửi tin nhắn",
  [AuditAction.UPDATE_USER_STATUS]: "Cập nhật trạng thái người dùng",
  [AuditAction.UPDATE_USER_ROLE]: "Cập nhật vai trò người dùng",
  [AuditAction.DELETE_USER]: "Xóa người dùng",
  [AuditAction.ACCESS_DENIED]: "Truy cập bị từ chối",
  [AuditAction.SOCKET_CONNECT]: "Kết nối Socket",
  [AuditAction.SOCKET_DISCONNECT]: "Ngắt kết nối Socket",
  [AuditAction.HTTP_REQUEST]: "HTTP Request",
};
