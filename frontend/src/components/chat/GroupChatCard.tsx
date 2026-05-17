import { useAuthStore } from "@/stores/useAuthStore"
import { useChatStore } from "@/stores/useChatStore"
import type { Conversation } from "@/types/chat"
import ChatCard from "./ChatCard"
import GroupChatAvatar from "./GroupChatAvatar"
import UnreadCountBadge from "./UnreadCountBadge"

const GroupChatCard = ({ convo }: { convo: Conversation }) => {
  const { user } = useAuthStore()
  const { activeConversationId, setActiveConversation, messages, fetchMessages } = useChatStore()

  if (!user) {
    return null
  }

  const currentUserId = user.id
  const unreadCount = convo.unreadCounts[currentUserId] ?? 0
  const name = convo.group?.name ?? convo.name ?? "Nhóm"

  const handleSelect = async (id: string) => {
    setActiveConversation(id)
    if (!messages[id]) {
      await fetchMessages(id)
    }
  }

  return (
    <ChatCard
      convoId={convo._id}
      name={name}
      timestamp={convo.lastMessage?.createdAt ? new Date(convo.lastMessage.createdAt) : undefined}
      isActive={activeConversationId === convo._id}
      onSelect={handleSelect}
      unreadCount={unreadCount}
      leftSection={
        <>
          {unreadCount > 0 && <UnreadCountBadge unreadCount={unreadCount} />}
          <GroupChatAvatar participants={convo.participants} type="sidebar" />
        </>
      }
      subtitle={
        <p className="truncate text-sm text-muted-foreground">
          {convo.participants.length} thành viên
        </p>
      }
    />
  )
}

export default GroupChatCard
