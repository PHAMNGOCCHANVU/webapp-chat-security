import { create } from "zustand"
import { io, type Socket } from "socket.io-client"

import { normalizeMessage } from "@/lib/chat-normalizers"
import type { SocketState } from "@/types/store"
import { useChatStore } from "./useChatStore"

const SOCKET_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : window.location.origin

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  onlineUsers: [],

  updateOnlineUsers: (userIds) => {
    set({
      onlineUsers: Array.from(new Set(userIds.filter(Boolean))),
    })
  },

  connectSocket: () => {
    const existingSocket = get().socket
    if (existingSocket?.connected) {
      return
    }

    existingSocket?.removeAllListeners()
    existingSocket?.disconnect()

    const socket: Socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    set({ socket })

    socket.on("connect", () => {
      console.log("ZALEGRAM Socket connected:", socket.id)

      const activeConversationId = useChatStore.getState().activeConversationId
      if (!activeConversationId) {
        return
      }

      socket.emit(
        "join-room",
        {
          conversationId: activeConversationId,
        },
        (payload?: { usersOnline?: Array<{ userId: string }> }) => {
          get().updateOnlineUsers((payload?.usersOnline ?? []).map((user) => user.userId))
        }
      )
    })

    socket.on("connect_error", (error) => {
      console.warn("Socket connection error:", error.message)
    })

    socket.on(
      "new-message",
      (message: {
        id: string
        conversationId: string
        content: string | null
        imageUrl?: string | null
        sender: { id: string; username: string; displayName: string }
        createdAt: string
        updatedAt: string
      }) => {
        void useChatStore.getState().addMessage(normalizeMessage(message))
      }
    )

    socket.on(
      "user-joined",
      (payload: { usersOnline: Array<{ userId: string }> }) => {
        get().updateOnlineUsers((payload.usersOnline ?? []).map((user) => user.userId))
      }
    )

    socket.on(
      "user-left",
      (payload: { usersOnline: Array<{ userId: string }> }) => {
        get().updateOnlineUsers((payload.usersOnline ?? []).map((user) => user.userId))
      }
    )

    socket.on("error", (error: { message: string; code: string }) => {
      console.error("Socket server error:", error.code, error.message)
    })

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason)
      set({ onlineUsers: [] })
    })
  },

  disconnectSocket: () => {
    const socket = get().socket
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      set({ socket: null, onlineUsers: [] })
    }
  },
}))
