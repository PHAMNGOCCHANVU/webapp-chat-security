import { useState } from "react"
import { Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/stores/useAuthStore"
import { useChatStore } from "@/stores/useChatStore"
import { useSocketStore } from "@/stores/useSocketStore"
import type { Conversation } from "@/types/chat"
import EmojiPicker from "./EmojiPicker"

interface MessageInputProps {
  selectedConvo: Conversation
}

const MessageInput = ({ selectedConvo }: MessageInputProps) => {
  const { user } = useAuthStore()
  const { sendDirectMessage, sendGroupMessage } = useChatStore()
  const { socket } = useSocketStore()
  const [value, setValue] = useState("")
  const [isSending, setIsSending] = useState(false)

  if (!user) {
    return null
  }

  const currentUserId = user.id

  const sendMessage = async () => {
    const trimmed = value.trim()
    if (!trimmed || isSending) {
      return
    }

    setValue("")
    setIsSending(true)

    try {
      if (socket?.connected) {
        socket.emit(
          "send-message",
          {
            conversationId: selectedConvo._id,
            content: trimmed,
          },
          (ack: { success: boolean; messageId?: string }) => {
            if (!ack?.success) {
              toast.error("Gửi tin nhắn thất bại, thử lại nhé!")
            }
          }
        )
      } else if (selectedConvo.type === "direct") {
        const otherUser = selectedConvo.participants.find(
          (participant) => participant._id !== currentUserId
        )
        if (!otherUser) {
          throw new Error("Không tìm thấy người nhận")
        }

        await sendDirectMessage(otherUser._id, trimmed)
      } else {
        await sendGroupMessage(selectedConvo._id, trimmed)
      }
    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn:", error)
      toast.error("Lỗi xảy ra khi gửi tin nhắn. Hãy thử lại!")
      setValue(trimmed)
    } finally {
      setIsSending(false)
    }
  }

  const handleTyping = (text: string) => {
    setValue(text)
    if (socket?.connected) {
      socket.emit("typing", {
        conversationId: selectedConvo._id,
        isTyping: text.length > 0,
      })
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  return (
    <div className="flex min-h-[60px] items-center gap-2 border-t border-border bg-background p-3">
      <div className="flex items-center">
        <EmojiPicker onChange={(emoji) => setValue(`${value}${emoji}`)} />
      </div>

      <div className="relative flex-1">
        <Input
          value={value}
          onChange={(event) => handleTyping(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Soạn tin nhắn... (Enter để gửi)"
          className="h-10 border-border/50 bg-muted/50 pr-4 transition-all focus-visible:ring-primary/30"
          disabled={isSending}
        />
      </div>

      <Button
        onClick={() => void sendMessage()}
        disabled={!value.trim() || isSending}
        className="size-10 shrink-0 rounded-full bg-gradient-chat p-0 transition-all hover:scale-105 hover:shadow-glow"
      >
        <Send className="size-4 text-white" />
      </Button>
    </div>
  )
}

export default MessageInput
