import { useEffect } from "react"
import { useAuthStore } from "@/stores/useAuthStore"
import { useSocketStore } from "@/stores/useSocketStore"
import { useChatStore } from "@/stores/useChatStore"

/**
 * useSocket — hook kết nối / ngắt kết nối Socket.IO
 *
 * Đặt ở root hoặc trong layout component nơi user đã đăng nhập.
 *
 * Lifecycle:
 *   - Mount + user đã có (accessToken) → connectSocket()
 *   - Unmount hoặc user logout       → disconnectSocket() + reset chat state
 *
 * ZALEGRAM backend xác thực socket qua express-session cookie (withCredentials),
 * nên hook chỉ cần đợi user đã authenticated (accessToken !== null).
 */
export const useSocket = () => {
  const { accessToken, initialized } = useAuthStore()
  const { connectSocket, disconnectSocket } = useSocketStore()
  const { reset: resetChat } = useChatStore()

  useEffect(() => {
    // Chờ bootstrap hoàn tất
    if (!initialized) return

    if (accessToken) {
      connectSocket()
    } else {
      disconnectSocket()
      resetChat()
    }

    return () => {
      // Không disconnect khi re-render — chỉ disconnect khi logout
      // (xử lý bởi nhánh else ở trên)
    }
  }, [accessToken, initialized]) // eslint-disable-line react-hooks/exhaustive-deps
}
