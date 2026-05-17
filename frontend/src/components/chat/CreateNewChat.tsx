import { useState } from "react";
import { useFriendStore } from "@/stores/useFriendStore";
import { useChatStore } from "@/stores/useChatStore";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import UserAvatar from "./UserAvatar";
import StatusBadge from "./StatusBadge";
import { useSocketStore } from "@/stores/useSocketStore";

/**
 * CreateNewChat button + modal.
 * Fetches the friend list on click, then displays it.
 * Clicking a friend creates a new direct conversation or navigates to the existing one.
 */
const CreateNewChat = () => {
  const [open, setOpen] = useState(false);
  const { friends, getFriends, loading: friendLoading } = useFriendStore();
  const { createConversation, loading: chatLoading } = useChatStore();
  const { onlineUsers } = useSocketStore();

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      getFriends();
    }
  };

  const handleSelectFriend = async (friendId: string) => {
    await createConversation("direct", "", [friendId]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div className="flex items-center gap-4 p-3 rounded-xl border border-border glass cursor-pointer hover:shadow-soft transition-all group">
          <div className="size-8 bg-gradient-chat rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <MessageCircle className="size-4 text-white" />
          </div>
          <span className="text-sm font-medium">Nhắn tin mới</span>
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chọn bạn bè để nhắn tin</DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto beautiful-scrollbar pr-2">
          {friendLoading && (
            <p className="text-center text-sm text-muted-foreground py-4">Đang tải...</p>
          )}

          {!friendLoading && friends.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Bạn chưa có bạn bè nào.
            </p>
          )}

          {!friendLoading &&
            friends.map((friend) => (
              <div
                key={friend._id}
                onClick={() => handleSelectFriend(friend._id)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-primary/5 cursor-pointer transition-colors"
              >
                <div className="relative">
                  <UserAvatar
                    type="sidebar"
                    name={friend.displayName}
                    avatarUrl={friend.avatarUrl}
                  />
                  <StatusBadge status={onlineUsers.includes(friend._id) ? "online" : "offline"} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{friend.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{friend.username}</p>
                </div>
                <Button size="sm" variant="ghost" disabled={chatLoading}>
                  Nhắn tin
                </Button>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateNewChat;
