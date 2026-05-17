import type { Participant } from "@/types/chat";
import UserAvatar from "@/components/chat/UserAvatar";
import { Ellipsis } from "lucide-react";

interface GroupChatAvatarProps {
  participants: Participant[];
  type: "chat" | "sidebar";
}

/**
 * Stacked avatar cluster for group conversations.
 * Shows up to 4 avatars, then an ellipsis icon for additional members.
 */
const GroupChatAvatar = ({ participants, type }: GroupChatAvatarProps) => {
  const limit = Math.min(participants.length, 4);
  const avatars = participants.slice(0, limit).map((member, i) => (
    <UserAvatar
      key={i}
      type={type}
      name={member.displayName}
      avatarUrl={member.avatarUrl ?? undefined}
    />
  ));

  return (
    <div className="relative flex -space-x-2 *:data-[slot=avatar]:ring-background *:data-[slot=avatar]:ring-2">
      {avatars}
      {participants.length > limit && (
        <div className="flex items-center z-10 justify-center size-8 rounded-full bg-muted ring-2 ring-background text-muted-foreground">
          <Ellipsis className="size-4" />
        </div>
      )}
    </div>
  );
};

export default GroupChatAvatar;
