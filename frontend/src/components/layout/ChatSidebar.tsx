import { useState } from "react";
import CreateNewChat from "@/components/chat/CreateNewChat";
import NewGroupChatModal from "@/components/chat/NewGroupChatModal";
import GroupChatList from "@/components/chat/GroupChatList";
import DirectMessageList from "@/components/chat/DirectMessageList";
import AddFriendModal from "@/components/friends/AddFriendModal";
import FriendRequestDialog from "@/components/friends/FriendRequestDialog";
import ConversationSkeleton from "@/components/skeleton/ConversationSkeleton";
import { useChatStore } from "@/stores/useChatStore";
import { useFriendStore } from "@/stores/useFriendStore";
import { Bell } from "lucide-react";

/**
 * ChatSidebar - replaces the placeholder with actual lists.
 */
const ChatSidebar = () => {
  const { convoLoading } = useChatStore();
  const { receivedList } = useFriendStore();
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  return (
    <div className="flex flex-col h-full bg-sidebar/50">
      {/* ── Padding Header ── */}
      <div className="p-4 pb-2">
        <CreateNewChat />
      </div>

      <div className="flex-1 overflow-y-auto beautiful-scrollbar p-4 pt-2 space-y-6">
        {/* ── Nhóm chat ── */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Nhóm chat
            </h3>
            <NewGroupChatModal />
          </div>
          {convoLoading ? <ConversationSkeleton /> : <GroupChatList />}
        </section>

        {/* ── Bạn bè & Tin nhắn 1-1 ── */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              Bạn bè
              {receivedList.length > 0 && (
                <button
                  onClick={() => setRequestModalOpen(true)}
                  className="flex items-center justify-center size-5 rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-white transition-colors relative"
                  title="Lời mời kết bạn"
                >
                  <Bell className="size-3" />
                  <span className="absolute -top-0.5 -right-0.5 size-2 bg-destructive rounded-full" />
                </button>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {receivedList.length === 0 && (
                <button
                  onClick={() => setRequestModalOpen(true)}
                  className="flex items-center justify-center size-7 rounded-full hover:bg-accent text-muted-foreground transition-colors"
                  title="Lời mời kết bạn"
                >
                  <Bell className="size-4" />
                </button>
              )}
              <AddFriendModal />
            </div>
          </div>
          {convoLoading ? <ConversationSkeleton /> : <DirectMessageList />}
        </section>
      </div>

      <FriendRequestDialog
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
      />
    </div>
  );
};

export default ChatSidebar;
