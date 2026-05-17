import { isAxiosError } from "axios"
import { create } from "zustand"

import { friendService } from "@/services/friendService"
import type { FriendState } from "@/types/store"

export const useFriendStore = create<FriendState>((set) => ({
  friends: [],
  loading: false,
  receivedList: [],
  sentList: [],

  searchByUsername: async (username) => {
    try {
      set({ loading: true })
      return await friendService.searchByUsername(username)
    } catch (error) {
      console.error("Lỗi khi tìm user:", error)
      return null
    } finally {
      set({ loading: false })
    }
  },

  addFriend: async (to, message) => {
    try {
      set({ loading: true })
      return await friendService.sendFriendRequest(to, message)
    } catch (error) {
      const messageText =
        isAxiosError(error) &&
        typeof error.response?.data?.error === "string" &&
        error.response.data.error.trim()
          ? error.response.data.error
          : error instanceof Error && error.message
            ? error.message
            : "Lỗi xảy ra khi gửi lời mời kết bạn. Hãy thử lại."

      console.error("Lỗi khi addFriend:", error)
      throw new Error(messageText, {
        cause: error,
      })
    } finally {
      set({ loading: false })
    }
  },

  getAllFriendRequests: async () => {
    try {
      set({ loading: true })
      const { sent, received } = await friendService.getAllFriendRequests()
      set({ sentList: sent, receivedList: received })
    } catch (error) {
      console.error("Lỗi khi getAllFriendRequests:", error)
      set({ sentList: [], receivedList: [] })
    } finally {
      set({ loading: false })
    }
  },

  acceptRequest: async (requestId) => {
    try {
      set({ loading: true })
      await friendService.acceptRequest(requestId)
      set((state) => ({
        receivedList: state.receivedList.filter((request) => request._id !== requestId),
      }))
    } catch (error) {
      console.error("Lỗi khi acceptRequest:", error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  declineRequest: async (requestId) => {
    try {
      set({ loading: true })
      await friendService.declineRequest(requestId)
      set((state) => ({
        receivedList: state.receivedList.filter((request) => request._id !== requestId),
      }))
    } catch (error) {
      console.error("Lỗi khi declineRequest:", error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  getFriends: async () => {
    try {
      set({ loading: true })
      const friends = await friendService.getFriendList()
      set({ friends })
    } catch (error) {
      console.error("Lỗi khi getFriends:", error)
      set({ friends: [] })
    } finally {
      set({ loading: false })
    }
  },
}))
