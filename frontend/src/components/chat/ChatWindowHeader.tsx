import { Separator } from "@/components/ui/separator"
import { useAuthStore } from "@/stores/useAuthStore"
import { useChatStore } from "@/stores/useChatStore"
import { useSocketStore } from "@/stores/useSocketStore"
import GroupChatAvatar from "./GroupChatAvatar"
import StatusBadge from "./StatusBadge"
import UserAvatar from "./UserAvatar"

const ChatWindowHeader = () => {
  const { activeConversationId, conversations } = useChatStore()
  const { user } = useAuthStore()
  const { onlineUsers } = useSocketStore()

  const chat = conversations.find((conversation) => conversation._id === activeConversationId)
  if (!chat) {
    return null
  }

  const currentUserId = user?.id
  const otherUser =
    chat.type === "direct"
      ? chat.participants.find((participant) => participant._id !== currentUserId)
      : undefined
  const isOnline = Boolean(otherUser && onlineUsers.includes(otherUser._id))
  const title =
    chat.type === "direct"
      ? otherUser?.displayName ?? "Người dùng"
      : chat.group?.name ?? chat.name ?? "Nhóm"

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background px-4 py-2.5">
      <div className="relative">
        {chat.type === "direct" ? (
          <>
            <UserAvatar
              type="sidebar"
              name={otherUser?.displayName ?? "?"}
              avatarUrl={otherUser?.avatarUrl ?? undefined}
            />
            <StatusBadge status={isOnline ? "online" : "offline"} />
          </>
        ) : (
          <GroupChatAvatar participants={chat.participants} type="sidebar" />
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {chat.type === "direct" ? (
          <p className="text-xs text-muted-foreground">
            {isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {chat.participants.length} thành viên
          </p>
        )}
      </div>
    </header>
  )
}

export default ChatWindowHeader
