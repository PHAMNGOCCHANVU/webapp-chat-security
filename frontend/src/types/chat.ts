// ============================================================
// ZALEGRAM — Chat domain types
// Ported from Moji_RealtimeChatApp and adapted for ZALEGRAM
// ============================================================

export interface Participant {
  id: string;
  _id: string;
  username?: string;
  displayName: string;
  avatarUrl?: string | null;
  joinedAt: string;
  lastReadAt?: string | null;
  unreadCount?: number;
  memberRole?: string;
}

export interface SeenUser {
  id: string;
  _id: string;
  displayName?: string;
  avatarUrl?: string | null;
  seenAt?: string | null;
}

export interface Group {
  name: string;
  createdBy: string;
}

export interface LastMessage {
  id: string;
  _id: string;
  content: string;
  imgUrl?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  senderId?: string;
  sender: {
    id: string;
    _id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

export interface Conversation {
  id: string;
  _id: string;
  type: "direct" | "group";
  group: Group | null;
  participants: Participant[];
  name?: string;
  rawType?: "PRIVATE" | "GROUP";
  lastMessageAt: string | null;
  seenBy: SeenUser[];
  lastMessage: LastMessage | null;
  /** key = userId, value = unread count */
  unreadCounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationResponse {
  conversations: Conversation[];
}

export interface Message {
  id: string;
  _id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  imgUrl?: string | null;
  updatedAt?: string | null;
  createdAt: string;
  /** computed on the client: true if the message was sent by the current user */
  isOwn?: boolean;
}
