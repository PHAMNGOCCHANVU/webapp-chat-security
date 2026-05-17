// ============================================================
// ZALEGRAM — User domain types
// ============================================================

/** Profile returned by the ZALEGRAM backend auth endpoints */
export type UserProfile = {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl?: string | null
  bio?: string
  phone?: string
  status?: string
  roles?: string[]
  permissions?: string[]
  createdAt?: string
  updatedAt?: string
}

/** Minimal user shape used inside Moji-style chat/friend features */
export interface User {
  id: string
  _id: string
  username: string
  email: string
  displayName: string
  avatarUrl?: string
  bio?: string
  phone?: string
  createdAt?: string
  updatedAt?: string
}

export interface Friend {
  id: string
  _id: string
  username: string
  displayName: string
  avatarUrl?: string
}

export interface FriendRequest {
  id: string
  _id: string
  from?: {
    id: string
    _id: string
    username: string
    displayName: string
    avatarUrl?: string
  }
  to?: {
    id: string
    _id: string
    username: string
    displayName: string
    avatarUrl?: string
  }
  message: string
  createdAt: string
  updatedAt: string
}
