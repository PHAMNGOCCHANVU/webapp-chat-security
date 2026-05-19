import axios from "axios"

import { useAuthStore } from "@/stores/useAuthStore"

const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000/api/v1"
    : "/api/v1"

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

let refreshPromise: Promise<string> | null = null

export const requestAccessTokenRefresh = async () => {
  const response = await refreshClient.post<{ accessToken: string }>("/auth/refresh")
  return response.data.accessToken
}

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()

  if (accessToken && !config.headers?.Authorization) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const url: string = error.config?.url ?? ""
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined

    if (!originalRequest) {
      return Promise.reject(error)
    }

    if (url.includes("/auth/login") || url.includes("/auth/register") || url.includes("/auth/refresh")) {
      return Promise.reject(error)
    }

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        refreshPromise ??= requestAccessTokenRefresh().finally(() => {
          refreshPromise = null
        })

        const newAccessToken = await refreshPromise
        useAuthStore.getState().setAccessToken(newAccessToken)

        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        return api(originalRequest)
      } catch (refreshError) {
        useAuthStore.getState().clearState()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
