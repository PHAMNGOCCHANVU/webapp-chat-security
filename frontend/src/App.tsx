import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"

import AdminRoute from "@/components/auth/AdminRoute"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import AdminDashboardPage from "@/pages/AdminDashboardPage"
import ChatAppPage from "@/pages/ChatAppPage"
import SignInPage from "@/pages/SignInPage"
import SignUpPage from "@/pages/SignUpPage"

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<SignInPage />} />
        <Route path="/signin" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<SignUpPage />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<ChatAppPage />} />
          <Route path="/chat" element={<ChatAppPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
