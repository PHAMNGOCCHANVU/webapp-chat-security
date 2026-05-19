import api, { requestAccessTokenRefresh } from "@/lib/axios"
import type { UserProfile } from "@/types/user"

type RegisterPayload = {
  displayName: string
  username: string
  email: string
  password: string
}

type LoginResponse = {
  accessToken: string
  user: UserProfile
}

export const authService = {
  async signUp(payload: RegisterPayload) {
    const res = await api.post("/auth/register", payload)
    return res.data
  },

  async signIn(username: string, password: string) {
    const res = await api.post<LoginResponse>("/auth/login", { username, password })
    return res.data
  },

  async refreshAccessToken() {
    return requestAccessTokenRefresh()
  },

  async signOut(accessToken?: string | null) {
    await api.post(
      "/auth/logout",
      {},
      {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      }
    )
  },

  async fetchProfile() {
    const res = await api.get<UserProfile>("/auth/profile")
    return res.data
  },
}
