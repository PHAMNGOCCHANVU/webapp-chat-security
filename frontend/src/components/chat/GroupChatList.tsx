import { useChatStore } from "@/stores/useChatStore";
import GroupChatCard from "./GroupChatCard";

/**
 * Renders the list of group conversations.
 */
const GroupChatList = () => {
  const { conversations } = useChatStore();
  const groupConvos = conversations.filter((c) => c.type === "group");

  if (groupConvos.length === 0) {
    return (
      <p className="text-xs text-muted-foreground px-2 py-3">
        Chưa có nhóm chat nào. Tạo nhóm mới để bắt đầu!
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {groupConvos.map((c) => (
        <GroupChatCard key={c._id} convo={c} />
      ))}
    </div>
  );
};

export default GroupChatList;
