import { useEffect } from "react"
import { Navigate, Outlet } from "react-router-dom"

import { useAuthStore } from "@/stores/useAuthStore"

const ProtectedRoute = () => {
  const accessToken = useAuthStore((state) => state.accessToken)
  const loading = useAuthStore((state) => state.loading)
  const initialized = useAuthStore((state) => state.initialized)
  const bootstrap = useAuthStore((state) => state.bootstrap)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
          Restoring your session...
        </div>
      </div>
    )
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
