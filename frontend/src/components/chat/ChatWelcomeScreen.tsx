/**
 * Shown in the main panel when no conversation is selected.
 * Re-branded from Moji to ZALEGRAM.
 */
const ChatWelcomeScreen = () => {
  return (
    <div className="flex w-full h-full flex-col items-center justify-center bg-muted/20 rounded-2xl">
      <div className="text-center px-6">
        <div className="size-24 mx-auto mb-6 bg-gradient-chat rounded-full flex items-center justify-center shadow-glow pulse-ring">
          <span className="text-4xl select-none">💬</span>
        </div>
        <h2 className="text-2xl font-bold mb-2 bg-gradient-chat bg-clip-text text-transparent">
          Chào mừng đến với ZALEGRAM!
        </h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
          Chọn một cuộc hội thoại ở cột bên trái để bắt đầu nhắn tin.
        </p>
      </div>
    </div>
  );
};

export default ChatWelcomeScreen;
