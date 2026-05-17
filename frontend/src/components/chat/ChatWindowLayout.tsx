import { useChatStore } from "@/stores/useChatStore";
import ChatWelcomeScreen from "./ChatWelcomeScreen";
import ChatWindowHeader from "./ChatWindowHeader";
import ChatWindowBody from "./ChatWindowBody";
import MessageInput from "./MessageInput";
import ChatWindowSkeleton from "@/components/skeleton/ChatWindowSkeleton";

/**
 * Full chat window: header + scrollable body + message composer.
 * Shown in the main panel when a conversation is active.
 */
const ChatWindowLayout = () => {
  const { activeConversationId, conversations, messageLoading } = useChatStore();

  const selectedConvo =
    conversations.find((c) => c._id === activeConversationId) ?? null;

  if (!selectedConvo) {
    return <ChatWelcomeScreen />;
  }

  if (messageLoading && !selectedConvo) {
    return <ChatWindowSkeleton />;
  }

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden rounded-sm shadow-inner">
      {/* Header */}
      <ChatWindowHeader />

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        <ChatWindowBody key={selectedConvo._id} />
      </div>

      {/* Message input */}
      <MessageInput selectedConvo={selectedConvo} />
    </div>
  );
};

export default ChatWindowLayout;
