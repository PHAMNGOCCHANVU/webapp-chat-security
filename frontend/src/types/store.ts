// ============================================================
// ZALEGRAM — Zustand store type definitions
// Merged from ZALEGRAM original + Moji_RealtimeChatApp
// ============================================================

import type { Socket } from "socket.io-client";
import type { Conversation, Message } from "./chat";
import type { Friend, FriendRequest, User, UserProfile } from "./user";

export type ConversationPatch = Partial<Conversation> & Pick<Conversation, "id" | "_id">

// ---- Auth ----
export type AuthState = {
  accessToken: string | null;
  user: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  setAccessToken: (accessToken: string | null) => void;
  clearState: () => void;
  signUp: (payload: {
    displayName: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  bootstrap: () => Promise<void>;
};

// ---- Theme ----
export interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

// ---- Chat ----
export interface ChatState {
  conversations: Conversation[];
  messages: Record<
    string,
    {
      items: Message[];
      hasMore: boolean;
      nextCursor?: string | null;
    }
  >;
  activeConversationId: string | null;
  convoLoading: boolean;
  messageLoading: boolean;
  loading: boolean;
  reset: () => void;

  setActiveConversation: (id: string | null) => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId?: string) => Promise<void>;
  sendDirectMessage: (
    recipientId: string,
    content: string,
    imgUrl?: string
  ) => Promise<void>;
  sendGroupMessage: (
    conversationId: string,
    content: string,
    imgUrl?: string
  ) => Promise<void>;
  addMessage: (message: Message) => Promise<void>;
  updateConversation: (conversation: ConversationPatch) => void;
  markAsSeen: () => Promise<void>;
  addConvo: (convo: Conversation) => void;
  createConversation: (
    type: "group" | "direct",
    name: string,
    memberIds: string[]
  ) => Promise<void>;
}

// ---- Socket ----
export interface SocketState {
  socket: Socket | null;
  onlineUsers: string[];
  connectSocket: () => void;
  disconnectSocket: () => void;
  updateOnlineUsers: (userIds: string[]) => void;
}

// ---- Friends ----
export interface FriendState {
  friends: Friend[];
  loading: boolean;
  receivedList: FriendRequest[];
  sentList: FriendRequest[];
  searchByUsername: (username: string) => Promise<User | null>;
  addFriend: (to: string, message?: string) => Promise<string>;
  getAllFriendRequests: () => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  getFriends: () => Promise<void>;
}

// ---- User profile ----
export interface UserState {
  updateAvatarUrl: (formData: FormData) => Promise<void>;
}
