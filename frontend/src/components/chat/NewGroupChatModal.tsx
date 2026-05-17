import { useState } from "react"
import { UserPlus, Users, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useChatStore } from "@/stores/useChatStore"
import { useFriendStore } from "@/stores/useFriendStore"
import type { Friend } from "@/types/user"
import UserAvatar from "./UserAvatar"

const NewGroupChatModal = () => {
  const [open, setOpen] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [search, setSearch] = useState("")
  const [invitedUsers, setInvitedUsers] = useState<Friend[]>([])

  const { friends, getFriends } = useFriendStore()
  const { loading, createConversation } = useChatStore()

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      void getFriends()
      setGroupName("")
      setSearch("")
      setInvitedUsers([])
    }
  }

  const handleSelectFriend = (friend: Friend) => {
    if (!invitedUsers.some((user) => user._id === friend._id)) {
      setInvitedUsers((prev) => [...prev, friend])
    }
    setSearch("")
  }

  const handleRemoveFriend = (friendId: string) => {
    setInvitedUsers((prev) => prev.filter((user) => user._id !== friendId))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!groupName.trim()) {
      toast.error("Vui lòng nhập tên nhóm!")
      return
    }

    if (invitedUsers.length < 2) {
      toast.warning("Bạn phải mời ít nhất 2 thành viên vào nhóm!")
      return
    }

    try {
      await createConversation(
        "group",
        groupName.trim(),
        invitedUsers.map((user) => user._id)
      )
      toast.success("Tạo nhóm thành công!")
      setOpen(false)
    } catch {
      toast.error("Lỗi khi tạo nhóm!")
    }
  }

  const filteredFriends = friends.filter(
    (friend) =>
      friend.displayName.toLowerCase().includes(search.toLowerCase()) &&
      !invitedUsers.some((user) => user._id === friend._id)
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-accent"
          title="Tạo nhóm"
        >
          <Users className="size-4" />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tạo nhóm chat mới</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Tên nhóm</Label>
            <Input
              id="groupName"
              placeholder="Nhập tên nhóm..."
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              className="glass"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Mời thành viên</Label>
            <div className="relative">
              <Input
                placeholder="Tìm bạn bè..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              {search && filteredFriends.length > 0 && (
                <div className="beautiful-scrollbar absolute inset-x-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-background shadow-lg">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend._id}
                      onClick={() => handleSelectFriend(friend)}
                      className="flex cursor-pointer items-center gap-2 p-2 hover:bg-accent"
                    >
                      <UserAvatar
                        type="chat"
                        name={friend.displayName}
                        avatarUrl={friend.avatarUrl}
                      />
                      <span className="text-sm">{friend.displayName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {invitedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {invitedUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1"
                  >
                    <span className="text-xs font-medium">{user.displayName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(user._id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="submit"
              disabled={loading || !groupName.trim() || invitedUsers.length < 2}
              className="w-full bg-gradient-chat text-white"
            >
              {loading ? (
                "Đang tạo..."
              ) : (
                <>
                  <UserPlus className="mr-2 size-4" />
                  Tạo nhóm
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default NewGroupChatModal
