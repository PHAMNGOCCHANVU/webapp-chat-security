import { create } from "zustand"
import { toast } from "sonner"
import { userService } from "@/services/userService"
import type { UserState } from "@/types/store"
import { useAuthStore } from "./useAuthStore"

/**
 * ZALEGRAM User Store
 * Quản lý các thao tác cập nhật hồ sơ người dùng.
 */
export const useUserStore = create<UserState>(() => ({
  // ── Upload / cập nhật avatar ──
  updateAvatarUrl: async (formData: FormData) => {
    try {
      const data = await userService.uploadAvatar(formData)

      // Refresh profile trong authStore để UI cập nhật ngay
      await useAuthStore.getState().fetchProfile()

      toast.success("Cập nhật ảnh đại diện thành công!")
      return data
    } catch (error) {
      console.error("Lỗi khi updateAvatarUrl:", error)
      toast.error("Upload ảnh đại diện không thành công!")
      throw error
    }
  },
}))
