/**
 * Full-panel shimmer shown while the active chat window is loading its messages.
 */
const ChatWindowSkeleton = () => {
  return (
    <div className="flex w-full h-full bg-transparent animate-pulse">
      <div className="flex bg-primary-foreground/30 rounded-2xl flex-1 items-center justify-center">
        <div className="text-center space-y-4">
          <div className="size-24 mx-auto bg-muted rounded-full shadow-inner" />
          <div className="w-64 h-6 bg-muted rounded mx-auto" />
          <div className="w-44 h-4 bg-muted rounded mx-auto" />
        </div>
      </div>
    </div>
  );
};

export default ChatWindowSkeleton;
