import { isAxiosError } from "axios"
import { create } from "zustand"
import { toast } from "sonner"

import { authService } from "@/services/authService"
import type { AuthState } from "@/types/store"

const ACCESS_TOKEN_KEY = "zalegram.accessToken"

const persistAccessToken = (accessToken: string | null) => {
  if (typeof window === "undefined") {
    return
  }

  if (accessToken) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  }
}

const loadAccessToken = () => {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback
  }

  const responseData = error.response?.data

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData
  }

  if (typeof responseData?.error === "string" && responseData.error.trim()) {
    return responseData.error
  }

  if (typeof responseData?.message === "string" && responseData.message.trim()) {
    return responseData.message
  }

  return fallback
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: loadAccessToken(),
  user: null,
  loading: false,
  initialized: false,

  setAccessToken: (accessToken) => {
    persistAccessToken(accessToken)
    set({ accessToken })
  },

  clearState: () => {
    persistAccessToken(null)
    set({
      accessToken: null,
      user: null,
      loading: false,
      initialized: true,
    })
  },

  signUp: async (payload) => {
    set({ loading: true })

    try {
      await authService.signUp(payload)
      toast.success("Account created successfully. Please sign in.")
    } catch (error) {
      const message = getErrorMessage(error, "Sign up failed. Please try again.")
      toast.error(message)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  signIn: async (username, password) => {
    set({ loading: true })

    try {
      const { accessToken, user: signedInUser } = await authService.signIn(username, password)
      persistAccessToken(accessToken)
      let user = signedInUser

      try {
        user = await authService.fetchProfile()
      } catch (profileError) {
        console.warn("Could not hydrate full profile after sign-in:", profileError)
      }

      set({
        accessToken,
        user,
        initialized: true,
      })
      toast.success(`Welcome back, ${user.displayName || user.username}.`)
    } catch (error) {
      const message = getErrorMessage(error, "Sign in failed. Please try again.")
      toast.error(message)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    const { accessToken } = get()
    set({ loading: true })

    try {
      await authService.signOut(accessToken)
      toast.success("You have been signed out.")
    } catch {
      toast.error("Session cleanup on the server failed. Local session was cleared.")
    } finally {
      get().clearState()
    }
  },

  fetchProfile: async () => {
    set({ loading: true })

    try {
      const user = await authService.fetchProfile()
      set({ user, initialized: true })
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined

      if (status === 401 || status === 403) {
        get().clearState()
        return
      }

      toast.error("Could not load your profile.")
      throw error
    } finally {
      set({ loading: false })
    }
  },

  bootstrap: async () => {
    const { accessToken, user, fetchProfile } = get()

    if (!accessToken) {
      set({ initialized: true })
      return
    }

    if (user?.roles?.length) {
      set({ initialized: true })
      return
    }

    await fetchProfile()
  },
}))
