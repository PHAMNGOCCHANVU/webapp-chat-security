import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/useAuthStore"

const Logout = () => {
  const navigate = useNavigate()
  const signOut = useAuthStore((state) => state.signOut)
  const loading = useAuthStore((state) => state.loading)

  const handleLogout = async () => {
    await signOut()
    navigate("/login", { replace: true })
  }

  return (
    <Button onClick={handleLogout} disabled={loading} variant="outline">
      {loading ? "Signing out..." : "Logout"}
    </Button>
  )
}

export default Logout
