import { useChatStore } from "@/stores/useChatStore";
import DirectMessageCard from "./DirectMessageCard";

/**
 * Renders the list of direct (1-on-1) conversations filtered from the full list.
 */
const DirectMessageList = () => {
  const { conversations } = useChatStore();
  const directConvos = conversations.filter((c) => c.type === "direct");

  if (directConvos.length === 0) {
    return (
      <p className="text-xs text-muted-foreground px-2 py-3">
        Chưa có cuộc trò chuyện nào. Hãy kết bạn và bắt đầu nhắn tin!
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {directConvos.map((c) => (
        <DirectMessageCard key={c._id} convo={c} />
      ))}
    </div>
  );
};

export default DirectMessageList;
