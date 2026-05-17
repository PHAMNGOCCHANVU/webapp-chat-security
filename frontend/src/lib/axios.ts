import axios from "axios"
import { useAuthStore } from "@/stores/useAuthStore"

/**
 * ZALEGRAM Axios instance
 *
 * - baseURL: http://localhost:4000/api/v1 (dev) | /api/v1 (prod)
 * - withCredentials: true  →  session cookie đi kèm mỗi request (bắt buộc
 *   vì backend xác thực qua express-session + Prisma)
 * - Request interceptor: gắn Bearer token cho các endpoint REST cần JWT
 *   (hiện backend dùng song song cả session và JWT cho /auth endpoints)
 * - Response interceptor: khi nhận 401, tự xóa state → redirect về login
 *
 * Không tự động refresh ở đây vì backend ZALEGRAM dùng session-based auth,
 * không có /auth/refresh endpoint.
 */
const api = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:4000/api/v1"
      : "/api/v1",
  withCredentials: true, // gửi session cookie
})

// ── Request: attach Bearer token (dùng cho REST endpoints có requireAuth) ──
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

// ── Response: xử lý 401 (session hết hạn / chưa đăng nhập) ──
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status
    const url: string = error.config?.url ?? ""

    // Bỏ qua lỗi từ chính login/register để tránh vòng lặp
    if (url.includes("/auth/login") || url.includes("/auth/register")) {
      return Promise.reject(error)
    }

    if (status === 401) {
      // Session hết hạn → xóa local state và redirect
      useAuthStore.getState().clearState()
    }

    return Promise.reject(error)
  }
)

export default api
