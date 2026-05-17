import api from "@/lib/axios"
import type { FriendRequest, User } from "@/types/user"

type BackendUserPreview = {
  id: string
  username: string
  displayName: string
  avatarUrl?: string | null
}

type BackendFriendRequest = {
  id: string
  message?: string | null
  createdAt: string
  respondedAt?: string | null
  sender: BackendUserPreview
  receiver: BackendUserPreview
}

type BackendFriendListItem = {
  friendshipId: string
  createdAt: string
  updatedAt: string
  user: BackendUserPreview
}

const normalizeUser = (user: BackendUserPreview): User => ({
  id: user.id,
  _id: user.id,
  username: user.username,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl ?? undefined,
  email: "",
})

const normalizeRequest = (request: BackendFriendRequest): FriendRequest => ({
  id: request.id,
  _id: request.id,
  from: normalizeUser(request.sender),
  to: normalizeUser(request.receiver),
  message: request.message ?? "",
  createdAt: request.createdAt,
  updatedAt: request.respondedAt ?? request.createdAt,
})

export const friendService = {
  async searchByUsername(username: string): Promise<User | null> {
    const res = await api.get(`/friends/search?username=${encodeURIComponent(username)}`)
    return res.data.user ? normalizeUser(res.data.user) : null
  },

  async sendFriendRequest(toUserId: string, message?: string): Promise<string> {
    const res = await api.post("/friends/requests", { toUserId, message })
    return res.data.message ?? "Đã gửi lời mời kết bạn"
  },

  async getAllFriendRequests(): Promise<{
    sent: FriendRequest[]
    received: FriendRequest[]
  }> {
    const res = await api.get("/friends/requests")

    return {
      sent: (res.data.sentRequests ?? []).map(normalizeRequest),
      received: (res.data.receivedRequests ?? []).map(normalizeRequest),
    }
  },

  async acceptRequest(requestId: string) {
    const res = await api.post(`/friends/requests/${requestId}/accept`)
    return res.data
  },

  async declineRequest(requestId: string) {
    await api.post(`/friends/requests/${requestId}/decline`)
  },

  async getFriendList() {
    const res = await api.get("/friends")
    const friends = Array.isArray(res.data) ? res.data : res.data.friends ?? []

    return (friends as BackendFriendListItem[]).map((item) => ({
      id: item.user.id,
      _id: item.user.id,
      username: item.user.username,
      displayName: item.user.displayName,
      avatarUrl: item.user.avatarUrl ?? undefined,
    }))
  },
}
