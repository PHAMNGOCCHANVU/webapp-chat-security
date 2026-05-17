import api from "@/lib/axios"

export const userService = {
  /**
   * Cập nhật avatar của user hiện tại.
   * Backend: PUT /auth/profile  (ZALEGRAM dùng endpoint profile update)
   * Gửi multipart/form-data với field "avatar".
   */
  async uploadAvatar(formData: FormData) {
    const res = await api.put("/auth/profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })

    return res.data
  },

  /**
   * Cập nhật thông tin profile (displayName, bio, phone).
   * Backend: PUT /auth/profile
   */
  async updateProfile(payload: {
    displayName?: string
    bio?: string
    phone?: string
  }) {
    const res = await api.put("/auth/profile", payload)
    return res.data
  },

  /**
   * Đổi mật khẩu.
   * Backend: POST /auth/change-password
   */
  async changePassword(
    oldPassword: string,
    newPassword: string,
    confirmPassword: string
  ) {
    const res = await api.post("/auth/change-password", {
      oldPassword,
      newPassword,
      confirmPassword,
    })
    return res.data
  },
}
