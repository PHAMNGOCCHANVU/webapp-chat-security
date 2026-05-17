import { create } from "zustand"
import { persist } from "zustand/middleware"

import { chatService } from "@/services/chatService"
import type { Conversation, Message } from "@/types/chat"
import type { ChatState, ConversationPatch } from "@/types/store"
import { useAuthStore } from "./useAuthStore"
import { useSocketStore } from "./useSocketStore"

const buildLastMessageFromMessage = (message: Message) => ({
  id: message.id,
  _id: message._id,
  content: message.content ?? "",
  imgUrl: message.imgUrl ?? null,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt ?? null,
  senderId: message.senderId,
  sender: {
    id: message.senderId,
    _id: message.senderId,
    displayName: "",
    avatarUrl: null,
  },
})

const applyConversationPatch = (
  currentConversation: Conversation | undefined,
  patch: ConversationPatch
): Conversation | null => {
  const id = patch.id || patch._id
  if (!id) {
    return null
  }

  if (!currentConversation) {
    if (!patch.type) {
      return null
    }

    return {
      id,
      _id: id,
      type: patch.type,
      group: patch.group ?? null,
      participants: patch.participants ?? [],
      name: patch.name,
      rawType: patch.rawType,
      lastMessageAt: patch.lastMessageAt ?? null,
      seenBy: patch.seenBy ?? [],
      lastMessage: patch.lastMessage ?? null,
      unreadCounts: patch.unreadCounts ?? {},
      createdAt: patch.createdAt ?? new Date().toISOString(),
      updatedAt: patch.updatedAt ?? new Date().toISOString(),
    }
  }

  return {
    ...currentConversation,
    ...patch,
    id,
    _id: id,
    group: patch.group ?? currentConversation.group,
    participants: patch.participants ?? currentConversation.participants,
    seenBy: patch.seenBy ?? currentConversation.seenBy,
    lastMessage: patch.lastMessage ?? currentConversation.lastMessage,
    unreadCounts: patch.unreadCounts
      ? {
          ...currentConversation.unreadCounts,
          ...patch.unreadCounts,
        }
      : currentConversation.unreadCounts,
  }
}

const upsertConversationList = (
  conversations: Conversation[],
  patch: ConversationPatch,
  moveToFront = true
) => {
  const id = patch.id || patch._id
  const existing = conversations.find((conversation) => conversation._id === id)
  const merged = applyConversationPatch(existing, patch)

  if (!merged) {
    return conversations
  }

  const remaining = conversations.filter((conversation) => conversation._id !== merged._id)
  if (moveToFront || !existing) {
    return [merged, ...remaining]
  }

  const existingIndex = conversations.findIndex((conversation) => conversation._id === merged._id)
  return [
    ...remaining.slice(0, existingIndex),
    merged,
    ...remaining.slice(existingIndex),
  ]
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      messages: {},
      activeConversationId: null,
      convoLoading: false,
      messageLoading: false,
      loading: false,

      reset: () => {
        set({
          conversations: [],
          messages: {},
          activeConversationId: null,
          convoLoading: false,
          messageLoading: false,
          loading: false,
        })
      },

      setActiveConversation: (id) => {
        const previousConversationId = get().activeConversationId
        const currentUserId = useAuthStore.getState().user?.id
        const socketStore = useSocketStore.getState()

        if (previousConversationId && previousConversationId !== id) {
          socketStore.socket?.emit("leave-room", {
            conversationId: previousConversationId,
          })
        }

        set((state) => ({
          activeConversationId: id,
          conversations:
            id && currentUserId
              ? state.conversations.map((conversation) =>
                  conversation._id === id
                    ? {
                        ...conversation,
                        unreadCounts: {
                          ...conversation.unreadCounts,
                          [currentUserId]: 0,
                        },
                      }
                    : conversation
                )
              : state.conversations,
        }))

        if (!id) {
          socketStore.updateOnlineUsers([])
          return
        }

        socketStore.socket?.emit(
          "join-room",
          {
            conversationId: id,
          },
          (payload?: { usersOnline?: Array<{ userId: string }> }) => {
            socketStore.updateOnlineUsers((payload?.usersOnline ?? []).map((user) => user.userId))
          }
        )
      },

      fetchConversations: async () => {
        try {
          set({ convoLoading: true })
          const data = await chatService.fetchConversations()

          set((state) => ({
            conversations: data.conversations,
            activeConversationId: data.conversations.some(
              (conversation) => conversation._id === state.activeConversationId
            )
              ? state.activeConversationId
              : null,
            convoLoading: false,
          }))
        } catch (error) {
          console.error("Lỗi khi fetchConversations:", error)
          set({ convoLoading: false })
        }
      },

      fetchMessages: async (conversationId) => {
        const { activeConversationId, messages } = get()
        const currentUserId = useAuthStore.getState().user?.id
        const convoId = conversationId ?? activeConversationId

        if (!convoId) {
          return
        }

        const current = messages[convoId]
        if (current?.nextCursor === null) {
          return
        }

        set({ messageLoading: true })

        try {
          const { messages: fetched, nextCursor } = await chatService.fetchMessages(
            convoId,
            current?.nextCursor
          )

          const processed = fetched.map((message) => ({
            ...message,
            isOwn: currentUserId ? message.senderId === currentUserId : message.isOwn,
          }))

          set((state) => {
            const previousItems = state.messages[convoId]?.items ?? []
            const mergedItems = current?.nextCursor ? [...processed, ...previousItems] : processed

            return {
              messages: {
                ...state.messages,
                [convoId]: {
                  items: mergedItems,
                  hasMore: nextCursor !== null,
                  nextCursor,
                },
              },
            }
          })
        } catch (error) {
          console.error("Lỗi khi fetchMessages:", error)
        } finally {
          set({ messageLoading: false })
        }
      },

      sendDirectMessage: async (recipientId, content, imgUrl) => {
        try {
          const { conversation, message } = await chatService.sendDirectMessage(
            recipientId,
            content,
            imgUrl
          )

          get().addConvo(conversation)
          await get().addMessage(message)
        } catch (error) {
          console.error("Lỗi khi gửi direct message:", error)
          throw error
        }
      },

      sendGroupMessage: async (conversationId, content, imgUrl) => {
        try {
          const { conversation, message } = await chatService.sendGroupMessage(
            conversationId,
            content,
            imgUrl
          )

          get().updateConversation(conversation)
          await get().addMessage(message)
        } catch (error) {
          console.error("Lỗi khi gửi group message:", error)
          throw error
        }
      },

      addMessage: async (message: Message) => {
        try {
          const currentUserId = useAuthStore.getState().user?.id
          const normalizedMessage: Message = {
            ...message,
            id: message.id || message._id,
            _id: message._id || message.id,
            isOwn: currentUserId ? message.senderId === currentUserId : message.isOwn,
          }
          const conversationId = normalizedMessage.conversationId
          const previousItems = get().messages[conversationId]?.items ?? []

          if (!conversationId || previousItems.some((item) => item._id === normalizedMessage._id)) {
            return
          }

          set((state) => ({
            messages: {
              ...state.messages,
              [conversationId]: {
                items: [...previousItems, normalizedMessage],
                hasMore: state.messages[conversationId]?.hasMore ?? false,
                nextCursor: state.messages[conversationId]?.nextCursor,
              },
            },
          }))

          const currentConversation = get().conversations.find(
            (conversation) => conversation._id === conversationId
          )
          const nextUnreadCount =
            currentUserId && !normalizedMessage.isOwn && get().activeConversationId !== conversationId
              ? (currentConversation?.unreadCounts[currentUserId] ?? 0) + 1
              : 0

          get().updateConversation({
            id: conversationId,
            _id: conversationId,
            lastMessage: buildLastMessageFromMessage(normalizedMessage),
            lastMessageAt: normalizedMessage.createdAt,
            unreadCounts: currentUserId
              ? {
                  [currentUserId]: nextUnreadCount,
                }
              : undefined,
          })
        } catch (error) {
          console.error("Lỗi khi addMessage:", error)
        }
      },

      updateConversation: (conversationPatch) => {
        set((state) => ({
          conversations: upsertConversationList(
            state.conversations,
            conversationPatch,
            Boolean(conversationPatch.lastMessage || conversationPatch.lastMessageAt)
          ),
        }))
      },

      markAsSeen: async () => {
        const activeConversationId = get().activeConversationId
        const currentUserId = useAuthStore.getState().user?.id

        if (!activeConversationId || !currentUserId) {
          return
        }

        get().updateConversation({
          id: activeConversationId,
          _id: activeConversationId,
          unreadCounts: {
            [currentUserId]: 0,
          },
        })
      },

      addConvo: (convo) => {
        set((state) => ({
          conversations: upsertConversationList(state.conversations, convo),
          activeConversationId: convo._id,
        }))
      },

      createConversation: async (type, name, memberIds) => {
        try {
          set({ loading: true })
          const conversation = await chatService.createConversation(type, name, memberIds)

          get().addConvo(conversation)

          if (!get().messages[conversation._id]) {
            await get().fetchMessages(conversation._id)
          }

          useSocketStore.getState().socket?.emit(
            "join-room",
            {
              conversationId: conversation._id,
            },
            (payload?: { usersOnline?: Array<{ userId: string }> }) => {
              useSocketStore
                .getState()
                .updateOnlineUsers((payload?.usersOnline ?? []).map((user) => user.userId))
            }
          )
        } catch (error) {
          console.error("Lỗi khi createConversation:", error)
          throw error
        } finally {
          set({ loading: false })
        }
      },
    }),
    {
      name: "zalegram-chat",
      partialize: (state) => ({
        conversations: state.conversations,
      }),
    }
  )
)
