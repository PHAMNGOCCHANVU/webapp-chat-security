import type { ReactNode } from "react"

import UserAvatar from "@/components/chat/UserAvatar"
import type { FriendRequest } from "@/types/user"

interface RequestItemProps {
  requestInfo: FriendRequest
  actions: ReactNode
  type: "sent" | "received"
}

const FriendRequestItem = ({ requestInfo, actions, type }: RequestItemProps) => {
  if (!requestInfo) {
    return null
  }

  const info = type === "sent" ? requestInfo.to : requestInfo.from
  if (!info) {
    return null
  }

  return (
    <div className="glass flex items-center justify-between rounded-xl border border-border p-3">
      <div className="flex items-center gap-3">
        <UserAvatar type="sidebar" name={info.displayName} avatarUrl={info.avatarUrl} />
        <div>
          <p className="text-sm font-semibold">{info.displayName}</p>
          <p className="text-xs text-muted-foreground">@{info.username}</p>
        </div>
      </div>
      {actions}
    </div>
  )
}

export default FriendRequestItem
