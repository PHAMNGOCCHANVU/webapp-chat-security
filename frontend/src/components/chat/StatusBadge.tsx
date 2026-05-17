import { cn } from "@/lib/utils";

/**
 * Small colored dot shown on top of an avatar indicating online/offline status.
 * Must be placed inside a `relative` container (the avatar wrapper).
 */
const StatusBadge = ({ status }: { status: "online" | "offline" }) => {
  return (
    <div
      className={cn(
        "absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-2 border-card",
        status === "online" && "status-online",
        status === "offline" && "status-offline"
      )}
    />
  );
};

export default StatusBadge;
