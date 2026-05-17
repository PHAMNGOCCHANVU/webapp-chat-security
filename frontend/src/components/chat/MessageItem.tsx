import { Card } from "@/components/ui/card"
import { cn, formatMessageTime } from "@/lib/utils"
import type { Conversation, Message, Participant } from "@/types/chat"
import UserAvatar from "./UserAvatar"

interface MessageItemProps {
  message: Message
  index: number
  messages: Message[]
  selectedConvo: Conversation
}

const MessageItem = ({ message, index, messages, selectedConvo }: MessageItemProps) => {
  const prev = index > 0 ? messages[index - 1] : undefined
  const isShowTime =
    index === 0 ||
    new Date(message.createdAt).getTime() - new Date(prev?.createdAt ?? 0).getTime() > 300_000
  const isGroupBreak = index === 0 || isShowTime || message.senderId !== prev?.senderId

  const participant = selectedConvo.participants.find(
    (member: Participant) => member._id.toString() === message.senderId.toString()
  )

  return (
    <>
      {isShowTime && (
        <span className="flex justify-center py-2 text-xs text-muted-foreground">
          {formatMessageTime(new Date(message.createdAt))}
        </span>
      )}

      <div
        className={cn(
          "mt-1 flex gap-2 message-bounce",
          message.isOwn ? "justify-end" : "justify-start"
        )}
      >
        {!message.isOwn && (
          <div className="w-8 shrink-0">
            {isGroupBreak && (
              <UserAvatar
                type="chat"
                name={participant?.displayName ?? "?"}
                avatarUrl={participant?.avatarUrl ?? undefined}
              />
            )}
          </div>
        )}

        <div
          className={cn(
            "flex max-w-xs flex-col space-y-1 lg:max-w-md",
            message.isOwn ? "items-end" : "items-start"
          )}
        >
          <Card
            className={cn(
              "p-3 shadow-sm",
              message.isOwn ? "chat-bubble-sent border-0" : "chat-bubble-received"
            )}
          >
            {message.content && (
              <p className="break-words text-sm leading-relaxed">{message.content}</p>
            )}
            {message.imgUrl && (
              <img
                src={message.imgUrl}
                alt="attachment"
                className="mt-1 max-w-full rounded-lg"
              />
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

export default MessageItem
