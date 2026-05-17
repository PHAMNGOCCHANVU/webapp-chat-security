import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useChatStore } from "@/stores/useChatStore";
import { useSocket } from "@/hooks/useSocket";
import UserAvatar from "@/components/chat/UserAvatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, LogOut, MessageSquare, Settings, Shield, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SIDEBAR_WIDTH = 320;

interface ChatLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Root layout for ZALEGRAM chat.
 * Also handles:
 *   - Socket connection lifecycle (via useSocket)
 *   - Initial data bootstrap (conversations + friends on mount)
 *
 * Structure:
 * ┌──────────────────────────────────────────────────────────┐
 * │  TopBar (logo | theme | user menu)                       │
 * ├──────────────────┬───────────────────────────────────────┤
 * │  Sidebar (320px) │  Main chat panel (children)           │
 * └──────────────────┴───────────────────────────────────────┘
 */
const ChatLayout = ({ sidebar, children }: ChatLayoutProps) => {
  const { user, signOut } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { fetchConversations } = useChatStore();
  const navigate = useNavigate();
  const isAdmin = user?.roles?.includes("ADMIN");

  // Kết nối / ngắt socket theo trạng thái auth
  useSocket();

  // Bootstrap: load conversations lần đầu
  useEffect(() => {
    void fetchConversations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm z-20 shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <MessageSquare className="size-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-primary bg-clip-text text-transparent">
            ZALEGRAM
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
              <Shield className="size-4 mr-1.5" />
              Quản trị
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full size-9"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="size-4 text-yellow-400" />
            ) : (
              <Moon className="size-4 text-primary" />
            )}
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full p-1 hover:bg-accent transition-colors outline-none">
                <UserAvatar
                  type="chat"
                  name={user?.displayName || user?.username || "Z"}
                  avatarUrl={user?.avatarUrl ?? undefined}
                />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="font-semibold">{user?.displayName}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  @{user?.username}
                </span>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem className="gap-2">
                <Settings className="size-4" />
                Cài đặt
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2">
                <Users className="size-4" />
                Bạn bè
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {isAdmin ? (
                <DropdownMenuItem className="gap-2" onClick={() => navigate("/admin")}>
                  <Shield className="size-4" />
                  Bảng quản trị
                </DropdownMenuItem>
              ) : null}

              <DropdownMenuItem
                variant="destructive"
                className="gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        <aside
          className="shrink-0 border-r border-border flex flex-col overflow-hidden bg-background"
          style={{ width: SIDEBAR_WIDTH }}
        >
          {sidebar}
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ChatLayout;
