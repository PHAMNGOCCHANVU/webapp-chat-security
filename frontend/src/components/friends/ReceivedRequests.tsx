import { useFriendStore } from "@/stores/useFriendStore";
import FriendRequestItem from "./FriendRequestItem";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * List of received (incoming) friend requests with Accept/Decline actions.
 */
const ReceivedRequests = () => {
  const { acceptRequest, declineRequest, loading, receivedList } =
    useFriendStore();

  if (!receivedList.length) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Bạn chưa có lời mời kết bạn nào.
      </p>
    );
  }

  const handleAccept = async (requestId: string) => {
    await acceptRequest(requestId);
    toast.success("Đã đồng ý kết bạn! 🎉");
  };

  const handleDecline = async (requestId: string) => {
    await declineRequest(requestId);
    toast.info("Đã từ chối lời mời kết bạn.");
  };

  return (
    <div className="space-y-3 mt-3">
      {receivedList.map((req) => (
        <FriendRequestItem
          key={req._id}
          requestInfo={req}
          type="received"
          actions={
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAccept(req._id)}
                disabled={loading}
                className="bg-gradient-chat text-white hover:opacity-90"
              >
                Chấp nhận
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDecline(req._id)}
                disabled={loading}
                className="hover:text-destructive hover:border-destructive"
              >
                Từ chối
              </Button>
            </div>
          }
        />
      ))}
    </div>
  );
};

export default ReceivedRequests;
