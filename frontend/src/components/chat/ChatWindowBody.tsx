import { useEffect, useLayoutEffect, useRef, useState } from "react"

import { useChatStore } from "@/stores/useChatStore"
import { useSocketStore } from "@/stores/useSocketStore"
import ChatWelcomeScreen from "./ChatWelcomeScreen"
import MessageItem from "./MessageItem"

const ChatWindowBody = () => {
  const { activeConversationId, conversations, messages: allMessages, fetchMessages, messageLoading } =
    useChatStore()
  const { socket } = useSocketStore()

  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const convoData = activeConversationId ? allMessages[activeConversationId] : null
  const messages = convoData?.items ?? []
  const hasMore = convoData?.hasMore ?? false
  const selectedConvo = conversations.find(
    (conversation) => conversation._id === activeConversationId
  )
  const latestMessageId = messages[messages.length - 1]?._id

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeConversationId, latestMessageId])

  useEffect(() => {
    if (!socket) {
      return
    }

    const onTyping = (payload: { username: string; isTyping: boolean }) => {
      setTypingUsers((prev) =>
        payload.isTyping
          ? prev.includes(payload.username)
            ? prev
            : [...prev, payload.username]
          : prev.filter((username) => username !== payload.username)
      )
    }

    socket.on("user-typing", onTyping)
    return () => {
      socket.off("user-typing", onTyping)
    }
  }, [socket])

  if (!selectedConvo) {
    return <ChatWelcomeScreen />
  }

  if (!messageLoading && messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <span className="text-4xl">🙂</span>
        <p className="text-sm text-muted-foreground">
          Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-primary-foreground/30">
      <div
        ref={containerRef}
        className="beautiful-scrollbar flex flex-1 flex-col overflow-x-hidden overflow-y-auto p-4"
      >
        {hasMore && (
          <div className="mb-4 flex justify-center">
            <button
              onClick={() => void fetchMessages(activeConversationId ?? undefined)}
              disabled={messageLoading}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              {messageLoading ? "Đang tải..." : "Tải thêm tin nhắn cũ hơn"}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-0.5">
          {messages.map((message, index) => (
            <MessageItem
              key={message._id || index}
              message={message}
              index={index}
              messages={messages}
              selectedConvo={selectedConvo}
            />
          ))}
        </div>

        {typingUsers.length > 0 && (
          <div className="ml-10 mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5">
              <span className="text-xs text-muted-foreground">
                {typingUsers.join(", ")} đang gõ
              </span>
              <span className="flex gap-0.5">
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${index * 150}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

export default ChatWindowBody
