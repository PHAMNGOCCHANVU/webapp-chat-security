import { Badge } from "@/components/ui/badge";

/**
 * Pulsing badge that shows the unread message count for a conversation.
 * Caps display at "9+" to keep the badge compact.
 */
const UnreadCountBadge = ({ unreadCount }: { unreadCount: number }) => {
  return (
    <div className="pulse-ring absolute z-20 -top-1 -right-1">
      <Badge className="size-5 text-xs bg-gradient-chat border border-background">
        {unreadCount > 9 ? "9+" : unreadCount}
      </Badge>
    </div>
  );
};

export default UnreadCountBadge;
