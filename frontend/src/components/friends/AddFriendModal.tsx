import { useState } from "react"
import { ArrowLeft, Search, UserPlus } from "lucide-react"
import { toast } from "sonner"

import UserAvatar from "@/components/chat/UserAvatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFriendStore } from "@/stores/useFriendStore"
import type { User } from "@/types/user"

const AddFriendModal = () => {
  const { loading, searchByUsername, addFriend } = useFriendStore()

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"search" | "confirm">("search")
  const [username, setUsername] = useState("")
  const [message, setMessage] = useState("")
  const [notFound, setNotFound] = useState(false)
  const [foundUser, setFoundUser] = useState<User | null>(null)

  const reset = () => {
    setStep("search")
    setUsername("")
    setMessage("")
    setNotFound(false)
    setFoundUser(null)
  }

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!username.trim()) {
      return
    }

    setNotFound(false)
    const user = await searchByUsername(username.trim())

    if (user) {
      setFoundUser(user)
      setStep("confirm")
    } else {
      setNotFound(true)
    }
  }

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!foundUser) {
      return
    }

    try {
      const result = await addFriend(foundUser._id, message.trim() || undefined)
      toast.success(result)
      setOpen(false)
      reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể gửi lời mời kết bạn.")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) {
          reset()
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          className="flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-accent"
          title="Thêm bạn bè"
        >
          <UserPlus className="size-4" />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {step === "search" ? "Tìm kiếm bạn bè" : "Gửi lời mời kết bạn"}
          </DialogTitle>
        </DialogHeader>

        {step === "search" && (
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-username">Tên đăng nhập (username)</Label>
              <Input
                id="search-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Nhập username cần tìm..."
                className="glass"
                autoFocus
              />
              {notFound && (
                <p className="text-sm text-destructive">
                  Không tìm thấy <span className="font-semibold">@{username}</span>
                </p>
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="flex-1">
                  Huỷ
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={loading || !username.trim()}
                className="flex-1 bg-gradient-chat text-white hover:opacity-90"
              >
                {loading ? (
                  "Đang tìm..."
                ) : (
                  <>
                    <Search className="mr-1.5 size-4" />
                    Tìm
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "confirm" && foundUser && (
          <form onSubmit={handleSend} className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <UserAvatar
                type="sidebar"
                name={foundUser.displayName}
                avatarUrl={foundUser.avatarUrl}
              />
              <div>
                <p className="font-semibold">{foundUser.displayName}</p>
                <p className="text-sm text-muted-foreground">@{foundUser.username}</p>
              </div>
              <span className="ml-auto text-xl">🎉</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="friend-message">
                Lời giới thiệu <span className="font-normal text-muted-foreground">(tuỳ chọn)</span>
              </Label>
              <textarea
                id="friend-message"
                rows={3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Chào bạn ~ Mình muốn kết bạn nhé!"
                className="glass w-full resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep("search")}
              >
                <ArrowLeft className="mr-1.5 size-4" />
                Quay lại
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-chat text-white hover:opacity-90"
              >
                {loading ? (
                  "Đang gửi..."
                ) : (
                  <>
                    <UserPlus className="mr-1.5 size-4" />
                    Kết bạn
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AddFriendModal
