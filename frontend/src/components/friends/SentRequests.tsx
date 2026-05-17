import { useFriendStore } from "@/stores/useFriendStore";
import FriendRequestItem from "./FriendRequestItem";
import { Badge } from "@/components/ui/badge";

/**
 * List of sent (outgoing) friend requests — read-only view.
 */
const SentRequests = () => {
  const { sentList } = useFriendStore();

  if (!sentList.length) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Bạn chưa gửi lời mời kết bạn nào.
      </p>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      {sentList.map((req) => (
        <FriendRequestItem
          key={req._id}
          requestInfo={req}
          type="sent"
          actions={
            <Badge variant="secondary" className="text-xs">
              Đang chờ
            </Badge>
          }
        />
      ))}
    </div>
  );
};

export default SentRequests;
