import { Outlet } from "react-router-dom"
import { ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/useAuthStore"

const AdminRoute = () => {
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.roles?.includes("ADMIN")

  if (isAdmin) {
    return <Outlet />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_28%),radial-gradient(circle_at_bottom,#f5d0fe,transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6">
      <div className="glass-strong max-w-lg rounded-[2rem] border border-border/80 p-8 text-center shadow-soft">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-8" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Không đủ quyền truy cập</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Khu vực này dành cho quản trị viên. Bạn vẫn có thể quay lại khu chat chính của hệ thống.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline">
            <a href="/chat">Quay lại chat</a>
          </Button>
          <Button asChild>
            <a href="/login">Đăng nhập lại</a>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AdminRoute
