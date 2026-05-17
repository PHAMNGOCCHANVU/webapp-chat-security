import api from "@/lib/axios"
import {
  normalizeConversation,
  normalizeMessage,
  type BackendConversation,
  type BackendMessage,
} from "@/lib/chat-normalizers"
import type { Conversation, ConversationResponse, Message } from "@/types/chat"

const PAGE_LIMIT = 50

interface FetchMessagesResponse {
  messages: Message[]
  nextCursor: string | null
}

interface SendMessageResponse {
  conversation: Conversation
  message: Message
}

export const chatService = {
  async fetchConversations(): Promise<ConversationResponse> {
    const res = await api.get<{ conversations: BackendConversation[] }>("/conversations")

    return {
      conversations: (res.data.conversations ?? []).map((conversation) =>
        normalizeConversation(conversation)
      ),
    }
  },

  async fetchMessages(
    conversationId: string,
    cursor?: string | null
  ): Promise<FetchMessagesResponse> {
    const params = new URLSearchParams({
      limit: String(PAGE_LIMIT),
    })

    if (cursor) {
      params.set("cursor", cursor)
    }

    const res = await api.get<{
      messages: BackendMessage[]
      pagination?: {
        nextCursor?: string | null
      }
    }>(`/messages/${conversationId}?${params.toString()}`)

    return {
      messages: (res.data.messages ?? []).map((message) => normalizeMessage(message)),
      nextCursor: res.data.pagination?.nextCursor ?? null,
    }
  },

  async sendDirectMessage(
    recipientId: string,
    content: string = "",
    imgUrl?: string
  ): Promise<SendMessageResponse> {
    const res = await api.post<{
      conversation: BackendConversation
      message: BackendMessage
    }>("/messages/direct", {
      toUserId: recipientId,
      content,
      imageUrl: imgUrl,
    })

    return {
      conversation: normalizeConversation(res.data.conversation),
      message: normalizeMessage(res.data.message),
    }
  },

  async sendGroupMessage(
    conversationId: string,
    content: string = "",
    imgUrl?: string
  ): Promise<SendMessageResponse> {
    const res = await api.post<{
      conversation: BackendConversation
      message: BackendMessage
    }>("/messages/group", {
      conversationId,
      content,
      imageUrl: imgUrl,
    })

    return {
      conversation: normalizeConversation(res.data.conversation),
      message: normalizeMessage(res.data.message),
    }
  },

  async createConversation(
    type: "direct" | "group",
    name: string,
    memberIds: string[]
  ): Promise<Conversation> {
    const res = await api.post<BackendConversation | { conversation: BackendConversation }>(
      "/conversations",
      {
        type,
        name,
        participants: memberIds,
      }
    )

    const rawConversation =
      "conversation" in res.data ? res.data.conversation : res.data

    return normalizeConversation(rawConversation)
  },
}
