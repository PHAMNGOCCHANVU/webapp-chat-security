import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/useAuthStore"
import { useChatStore } from "@/stores/useChatStore"
import { useSocketStore } from "@/stores/useSocketStore"
import type { Conversation } from "@/types/chat"
import ChatCard from "./ChatCard"
import StatusBadge from "./StatusBadge"
import UnreadCountBadge from "./UnreadCountBadge"
import UserAvatar from "./UserAvatar"

const DirectMessageCard = ({ convo }: { convo: Conversation }) => {
  const { user } = useAuthStore()
  const { activeConversationId, setActiveConversation, messages, fetchMessages } = useChatStore()
  const { onlineUsers } = useSocketStore()

  if (!user) {
    return null
  }

  const currentUserId = user.id
  const otherUser = convo.participants.find((participant) => participant._id !== currentUserId)
  if (!otherUser) {
    return null
  }

  const unreadCount = convo.unreadCounts[currentUserId] ?? 0
  const lastMessage = convo.lastMessage?.content ?? ""

  const handleSelect = async (id: string) => {
    setActiveConversation(id)
    if (!messages[id]) {
      await fetchMessages(id)
    }
  }

  return (
    <ChatCard
      convoId={convo._id}
      name={otherUser.displayName}
      timestamp={convo.lastMessage?.createdAt ? new Date(convo.lastMessage.createdAt) : undefined}
      isActive={activeConversationId === convo._id}
      onSelect={handleSelect}
      unreadCount={unreadCount}
      leftSection={
        <>
          <UserAvatar
            type="sidebar"
            name={otherUser.displayName}
            avatarUrl={otherUser.avatarUrl ?? undefined}
          />
          <StatusBadge status={onlineUsers.includes(otherUser._id) ? "online" : "offline"} />
          {unreadCount > 0 && <UnreadCountBadge unreadCount={unreadCount} />}
        </>
      }
      subtitle={
        <p
          className={cn(
            "truncate text-sm",
            unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"
          )}
        >
          {lastMessage}
        </p>
      }
    />
  )
}

export default DirectMessageCard
