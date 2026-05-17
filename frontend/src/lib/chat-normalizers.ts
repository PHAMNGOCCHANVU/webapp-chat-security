import type { Conversation, LastMessage, Message, Participant, SeenUser } from "@/types/chat"

const EMPTY_DATE = new Date(0).toISOString()

type MaybeDate = Date | string | null | undefined

type BackendUserPreview = {
  id?: string
  _id?: string
  username?: string
  displayName?: string
  avatarUrl?: string | null
}

type BackendParticipant = BackendUserPreview & {
  joinedAt?: MaybeDate
  lastReadAt?: MaybeDate
  unreadCount?: number
  memberRole?: string
}

type BackendSeenBy = {
  seenAt?: MaybeDate
  user?: BackendUserPreview
}

export type BackendMessage = {
  id?: string
  _id?: string
  conversationId: string
  senderId?: string
  sender?: BackendUserPreview
  content?: string | null
  messageContent?: string | null
  imgUrl?: string | null
  imageUrl?: string | null
  createdAt: MaybeDate
  updatedAt?: MaybeDate
  isMine?: boolean
}

export type BackendConversation = {
  id?: string
  _id?: string
  type?: string
  conversationType?: string
  isGroup?: boolean
  name?: string
  conversationName?: string | null
  createdBy?: string
  participants?: BackendParticipant[]
  seenBy?: BackendSeenBy[]
  unreadCount?: number
  unreadCounts?: Record<string, number>
  lastMessageAt?: MaybeDate
  lastMessage?: BackendMessage | null
  createdAt?: MaybeDate
  updatedAt?: MaybeDate
}

const toIsoString = (value: MaybeDate, fallback = EMPTY_DATE) => {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === "string" && value.trim()) {
    return value
  }

  return fallback
}

const getEntityId = (value?: { id?: string; _id?: string }) => value?.id ?? value?._id ?? ""

const normalizeSeenUser = (item: BackendSeenBy): SeenUser | null => {
  const id = getEntityId(item.user)
  if (!id) {
    return null
  }

  return {
    id,
    _id: id,
    displayName: item.user?.displayName ?? item.user?.username,
    avatarUrl: item.user?.avatarUrl ?? null,
    seenAt: item.seenAt ? toIsoString(item.seenAt) : null,
  }
}

export const normalizeParticipant = (participant: BackendParticipant): Participant => {
  const id = getEntityId(participant)

  return {
    id,
    _id: id,
    username: participant.username,
    displayName: participant.displayName ?? participant.username ?? "Người dùng",
    avatarUrl: participant.avatarUrl ?? null,
    joinedAt: toIsoString(participant.joinedAt),
    lastReadAt: participant.lastReadAt ? toIsoString(participant.lastReadAt) : null,
    unreadCount: participant.unreadCount,
    memberRole: participant.memberRole,
  }
}

export const normalizeMessage = (
  message: BackendMessage,
  currentUserId?: string | null
): Message => {
  const id = getEntityId(message)
  const senderId = message.senderId ?? getEntityId(message.sender)

  return {
    id,
    _id: id,
    conversationId: message.conversationId,
    senderId,
    content: message.content ?? message.messageContent ?? null,
    imgUrl: message.imgUrl ?? message.imageUrl ?? null,
    createdAt: toIsoString(message.createdAt),
    updatedAt: message.updatedAt ? toIsoString(message.updatedAt) : null,
    isOwn: currentUserId ? senderId === currentUserId : message.isMine,
  }
}

const normalizeLastMessage = (
  message: BackendMessage | null | undefined,
  currentUserId?: string | null
): LastMessage | null => {
  if (!message) {
    return null
  }

  const normalizedMessage = normalizeMessage(message, currentUserId)
  const senderId = message.senderId ?? getEntityId(message.sender)

  return {
    id: normalizedMessage.id,
    _id: normalizedMessage._id,
    content: normalizedMessage.content ?? "",
    imgUrl: normalizedMessage.imgUrl ?? null,
    createdAt: normalizedMessage.createdAt,
    updatedAt: normalizedMessage.updatedAt ?? null,
    senderId,
    sender: {
      id: senderId,
      _id: senderId,
      displayName: message.sender?.displayName ?? message.sender?.username ?? "",
      avatarUrl: message.sender?.avatarUrl ?? null,
    },
  }
}

export const normalizeConversation = (
  conversation: BackendConversation,
  currentUserId?: string | null
): Conversation => {
  const id = getEntityId(conversation)
  const rawType = (conversation.type ?? conversation.conversationType ?? "").toUpperCase()
  const isGroup = conversation.isGroup ?? rawType === "GROUP"
  const normalizedType = isGroup ? "group" : "direct"
  const participants = (conversation.participants ?? []).map(normalizeParticipant)
  const groupName = conversation.conversationName ?? conversation.name ?? "Nhóm"

  return {
    id,
    _id: id,
    type: normalizedType,
    rawType: isGroup ? "GROUP" : "PRIVATE",
    group: isGroup
      ? {
          name: groupName,
          createdBy: conversation.createdBy ?? "",
        }
      : null,
    participants,
    name: conversation.name ?? groupName,
    lastMessageAt: conversation.lastMessageAt ? toIsoString(conversation.lastMessageAt) : null,
    seenBy: (conversation.seenBy ?? [])
      .map(normalizeSeenUser)
      .filter((item): item is SeenUser => item !== null),
    lastMessage: normalizeLastMessage(conversation.lastMessage, currentUserId),
    unreadCounts:
      conversation.unreadCounts ??
      (currentUserId ? { [currentUserId]: conversation.unreadCount ?? 0 } : {}),
    createdAt: toIsoString(conversation.createdAt),
    updatedAt: toIsoString(conversation.updatedAt),
  }
}
