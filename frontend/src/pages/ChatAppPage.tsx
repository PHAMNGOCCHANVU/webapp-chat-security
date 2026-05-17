import ChatLayout from "@/components/layout/ChatLayout";
import ChatSidebar from "@/components/layout/ChatSidebar";
import ChatWindowLayout from "@/components/chat/ChatWindowLayout";

/**
 * Main Chat Application Page
 * Glues together ChatLayout, ChatSidebar, and ChatWindowLayout.
 */
const ChatAppPage = () => {
  return (
    <ChatLayout sidebar={<ChatSidebar />}>
      {/* Cửa sổ chat chính sẽ render ở đây */}
      <ChatWindowLayout />
    </ChatLayout>
  );
};

export default ChatAppPage;
