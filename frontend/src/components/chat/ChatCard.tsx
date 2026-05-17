import { cn } from "@/lib/utils";
import { formatOnlineTime } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface ChatCardProps {
  convoId: string;
  name: string;
  timestamp?: Date;
  isActive: boolean;
  onSelect: (id: string) => void;
  unreadCount?: number;
  leftSection: React.ReactNode;
  subtitle: React.ReactNode;
}

/**
 * Generic conversation list card — used by both DirectMessageCard and GroupChatCard.
 * Highlights the active conversation and shows unread count + timestamp.
 */
const ChatCard = ({
  convoId,
  name,
  timestamp,
  isActive,
  onSelect,
  unreadCount,
  leftSection,
  subtitle,
}: ChatCardProps) => {
  return (
    <Card
      className={cn(
        "border-none p-3 cursor-pointer transition-all duration-200 glass hover:bg-muted/30 group",
        isActive &&
          "ring-2 ring-primary/50 bg-gradient-to-tr from-primary/10 to-primary-foreground"
      )}
      onClick={() => onSelect(convoId)}
    >
      <div className="flex items-center gap-3">
        <div className="relative">{leftSection}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <h3
              className={cn(
                "font-semibold text-sm truncate",
                unreadCount && unreadCount > 0 && "text-foreground"
              )}
            >
              {name}
            </h3>
            <span className="text-xs text-muted-foreground shrink-0 ml-1">
              {timestamp ? formatOnlineTime(timestamp) : ""}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {subtitle}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ChatCard;
