import { Card } from "@/components/ui/card";

/**
 * Placeholder shimmer cards shown while the conversation list is loading.
 */
const ConversationSkeleton = () => {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <Card
          key={index}
          className="border-none p-3 glass animate-pulse"
        >
          <div className="flex items-center gap-3">
            {/* Avatar skeleton */}
            <div className="size-12 rounded-full bg-muted shrink-0" />

            {/* Info skeleton */}
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 bg-muted rounded" />
              <div className="h-3 w-3/4 bg-muted rounded" />
            </div>

            {/* Timestamp skeleton */}
            <div className="h-2 w-10 bg-muted rounded shrink-0" />
          </div>
        </Card>
      ))}
    </>
  );
};

export default ConversationSkeleton;
