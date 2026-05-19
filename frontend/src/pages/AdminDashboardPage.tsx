import { startTransition, useDeferredValue, useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Database,
  Eye,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  Pencil,
  Plus,
  RefreshCcw,
  ScrollText,
  Shield,
  Sun,
  Trash2,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import AdminConversationsSection from "@/components/admin/AdminConversationsSection"
import AdminRolesSection from "@/components/admin/AdminRolesSection"
import { adminService } from "@/services/adminService"
import { useAuthStore } from "@/stores/useAuthStore"
import { useThemeStore } from "@/stores/useThemeStore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type {
  AdminAuditLog,
  AdminRole,
  AdminUser,
  AdminUserDetail,
  AdminUserStatus,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
  SystemStats,
} from "@/types/admin"

const AUDIT_ACTION_OPTIONS = [
  "ALL",
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGOUT",
  "CREATE_USER",
  "UPDATE_USER",
  "LOCK_USER",
  "UNLOCK_USER",
  "DELETE_USER",
  "ASSIGN_ROLE",
  "REVOKE_ROLE",
  "CREATE_ROLE",
  "UPDATE_ROLE",
  "DELETE_ROLE",
  "CREATE_GROUP",
  "UPDATE_GROUP",
  "ADD_MEMBER",
  "REMOVE_MEMBER",
  "ACCESS_DENIED",
]
const AUDIT_MODULE_OPTIONS = [
  "ALL",
  "AUTH",
  "USER",
  "ROLE",
  "CONVERSATION",
  "MEMBER",
  "MESSAGE",
  "FRIEND",
  "SOCKET",
  "SYSTEM",
] as const
const AUDIT_STATUS_OPTIONS = ["ALL", "SUCCESS", "FAILED"] as const

const USER_STATUS_FILTERS = ["ALL", "ACTIVE", "LOCKED", "DISABLED", "DELETED"] as const
const USER_FORM_STATUSES = ["ACTIVE", "LOCKED", "DISABLED"] as const

type AdminTab = "overview" | "users" | "roles" | "conversations" | "audit"
type UserFormMode = "create" | "edit"

type UserFormState = {
  username: string
  displayName: string
  email: string
  password: string
  phone: string
  bio: string
  status: "ACTIVE" | "LOCKED" | "DISABLED"
  roles: string[]
}

const numberFormatter = new Intl.NumberFormat("vi-VN")

const emptyUserForm: UserFormState = {
  username: "",
  displayName: "",
  email: "",
  password: "",
  phone: "",
  bio: "",
  status: "ACTIVE",
  roles: ["USER"],
}

const formatNumber = (value: number) => numberFormatter.format(value)

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Không có dữ liệu"
  }

  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const normalizeUserStatus = (status: string): AdminUserStatus =>
  status === "BANNED" ? "DISABLED" : (status as AdminUserStatus)

const getRoleTone = (roles: string[]) => (roles.includes("ADMIN") ? "default" : "secondary")

const getStatusTone = (status: string) => {
  switch (normalizeUserStatus(status)) {
    case "ACTIVE":
      return "default" as const
    case "LOCKED":
      return "destructive" as const
    case "DISABLED":
      return "secondary" as const
    case "DELETED":
      return "outline" as const
    default:
      return "outline" as const
  }
}

const normalizeFormStatus = (status?: string | null): UserFormState["status"] => {
  const normalized = normalizeUserStatus(status ?? "ACTIVE")
  if (normalized === "LOCKED" || normalized === "DISABLED") {
    return normalized
  }

  return "ACTIVE"
}

const buildFormFromUser = (user: AdminUserDetail): UserFormState => ({
  username: user.username,
  displayName: user.displayName,
  email: user.email,
  password: "",
  phone: user.phone ?? "",
  bio: user.bio ?? "",
  status: normalizeFormStatus(user.status),
  roles: user.roles.length ? user.roles : ["USER"],
})

const AdminDashboardPage = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()

  const [stats, setStats] = useState<SystemStats | null>(null)
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [logs, setLogs] = useState<AdminAuditLog[]>([])
  const [activeTab, setActiveTab] = useState<AdminTab>("overview")
  const [selectedAction, setSelectedAction] = useState("ALL")
  const [selectedAuditModule, setSelectedAuditModule] =
    useState<(typeof AUDIT_MODULE_OPTIONS)[number]>("ALL")
  const [selectedAuditStatus, setSelectedAuditStatus] =
    useState<(typeof AUDIT_STATUS_OPTIONS)[number]>("ALL")
  const [auditActor, setAuditActor] = useState("")
  const [auditDateFrom, setAuditDateFrom] = useState("")
  const [auditDateTo, setAuditDateTo] = useState("")
  const [userQuery, setUserQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<(typeof USER_STATUS_FILTERS)[number]>("ALL")
  const [auditQuery, setAuditQuery] = useState("")
  const [refreshTick, setRefreshTick] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [detailUser, setDetailUser] = useState<AdminUserDetail | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [formMode, setFormMode] = useState<UserFormMode>("create")
  const [isUserFormOpen, setIsUserFormOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm)
  const [isSubmittingUserForm, setIsSubmittingUserForm] = useState(false)

  const deferredUserQuery = useDeferredValue(userQuery)
  const deferredAuditQuery = useDeferredValue(auditQuery)
  const deferredAuditActor = useDeferredValue(auditActor)

  useEffect(() => {
    let cancelled = false

    const loadDashboard = async () => {
      setIsRefreshing(true)

      try {
        const [nextStats, nextRoles, nextUsers, nextLogs] = await Promise.all([
          adminService.getSystemStats(),
          adminService.getRoles(),
          adminService.getUsers(deferredUserQuery, statusFilter === "ALL" ? undefined : statusFilter),
          adminService.getAuditLogs({
            action: selectedAction === "ALL" ? undefined : selectedAction,
            actor: deferredAuditActor || undefined,
            module: selectedAuditModule === "ALL" ? undefined : selectedAuditModule,
            status: selectedAuditStatus === "ALL" ? undefined : selectedAuditStatus,
            dateFrom: auditDateFrom || undefined,
            dateTo: auditDateTo || undefined,
          }),
        ])

        if (cancelled) {
          return
        }

        startTransition(() => {
          setStats(nextStats)
          setRoles(nextRoles)
          setUsers(nextUsers)
          setLogs(nextLogs)
        })
      } catch {
        if (!cancelled) {
          toast.error("Không thể tải dữ liệu admin dashboard.")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [
    auditDateFrom,
    auditDateTo,
    deferredAuditActor,
    deferredUserQuery,
    refreshTick,
    selectedAction,
    selectedAuditModule,
    selectedAuditStatus,
    statusFilter,
  ])

  const keyword = deferredAuditQuery.trim().toLowerCase()
  const filteredLogs = keyword
    ? logs.filter((log) =>
        [
          log.actionType,
          log.actionStatus,
          log.description ?? "",
          log.moduleName ?? "",
          log.targetTable ?? "",
          log.targetId ?? "",
          log.actor?.displayName ?? "",
          log.actor?.username ?? "",
          log.ipAddress ?? "",
          log.userAgent ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      )
    : logs

  const availableRoleNames = roles.length ? roles.map((role) => role.roleName) : ["USER", "ADMIN", "OWNER"]

  const handleSignOut = async () => {
    await signOut()
    navigate("/login", { replace: true })
  }

  const handleRefresh = () => {
    setRefreshTick((value) => value + 1)
  }

  const openSection = (nextTab: AdminTab, sectionId: string) => {
    setActiveTab(nextTab)
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 80)
  }

  const resetUserForm = () => {
    setUserForm(emptyUserForm)
    setEditingUserId(null)
    setFormMode("create")
  }

  const handleOpenCreateUser = () => {
    resetUserForm()
    setIsUserFormOpen(true)
  }

  const handleOpenDetails = async (userId: string) => {
    setDetailLoading(true)
    setIsDetailDialogOpen(true)

    try {
      const nextUser = await adminService.getUser(userId)
      setDetailUser(nextUser)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải chi tiết người dùng.")
      setIsDetailDialogOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleOpenEditUser = async (userId: string) => {
    setFormMode("edit")
    setEditingUserId(userId)
    setIsSubmittingUserForm(false)

    try {
      const nextUser = await adminService.getUser(userId)
      setUserForm(buildFormFromUser(nextUser))
      setIsUserFormOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải thông tin để chỉnh sửa.")
      resetUserForm()
    }
  }

  const handleToggleFormRole = (roleName: string) => {
    setUserForm((currentForm) => {
      const hasRole = currentForm.roles.includes(roleName)
      const nextRoles = hasRole
        ? currentForm.roles.filter((role) => role !== roleName)
        : [...currentForm.roles, roleName]

      return {
        ...currentForm,
        roles: nextRoles.length ? nextRoles : ["USER"],
      }
    })
  }

  const handleSubmitUserForm = async () => {
    if (!userForm.roles.length) {
      toast.error("Vui lòng gán ít nhất một role.")
      return
    }

    setIsSubmittingUserForm(true)

    try {
      if (formMode === "create") {
        const payload: CreateAdminUserPayload = {
          username: userForm.username,
          displayName: userForm.displayName,
          email: userForm.email,
          password: userForm.password,
          phone: userForm.phone || undefined,
          bio: userForm.bio || undefined,
          status: userForm.status,
          roles: userForm.roles,
        }

        await adminService.createUser(payload)
        toast.success(`Đã tạo thành công người dùng ${userForm.username}.`)
      } else if (editingUserId) {
        const payload: UpdateAdminUserPayload = {
          username: userForm.username,
          displayName: userForm.displayName,
          email: userForm.email,
          phone: userForm.phone || "",
          bio: userForm.bio || "",
          status: userForm.status,
        }

        await adminService.updateUser(editingUserId, payload)

        const currentUserRoles = new Set(
          detailUser?.id === editingUserId
            ? detailUser.roles
            : users.find((item) => item.id === editingUserId)?.roles ?? []
        )
        const nextRoles = new Set(userForm.roles)

        for (const roleName of availableRoleNames) {
          const currentlyHasRole = currentUserRoles.has(roleName)
          const shouldHaveRole = nextRoles.has(roleName)

          if (!currentlyHasRole && shouldHaveRole) {
            await adminService.assignRole(editingUserId, roleName)
          }

          if (currentlyHasRole && !shouldHaveRole) {
            await adminService.revokeRole(editingUserId, roleName)
          }
        }

        toast.success(`Đã cập nhật thông tin người dùng ${userForm.username}.`)
      }

      setIsUserFormOpen(false)
      resetUserForm()
      handleRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu thay đổi người dùng.")
    } finally {
      setIsSubmittingUserForm(false)
    }
  }

  const handleStatusChange = async (
    account: AdminUser,
    nextStatus: "ACTIVE" | "LOCKED" | "DISABLED" | "DELETED"
  ) => {
    setBusyUserId(account.id)

    try {
      await adminService.updateUserStatus(account.id, nextStatus)
      toast.success(`Đã cập nhật trạng thái ${account.username} thành ${nextStatus}.`)
      handleRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật trạng thái tài khoản.")
    } finally {
      setBusyUserId(null)
    }
  }

  const handleToggleAdminRole = async (account: AdminUser) => {
    setBusyUserId(account.id)

    try {
      if (account.roles.includes("ADMIN")) {
        await adminService.revokeRole(account.id, "ADMIN")
        toast.success(`Đã thu hồi quyền ADMIN của ${account.username}.`)
      } else {
        await adminService.assignRole(account.id, "ADMIN")
        toast.success(`Đã cấp quyền ADMIN cho ${account.username}.`)
      }

      handleRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật quyền người dùng.")
    } finally {
      setBusyUserId(null)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteTarget) {
      return
    }

    setBusyUserId(deleteTarget.id)

    try {
      await adminService.deleteUser(deleteTarget.id)
      toast.success(`Đã xóa tài khoản ${deleteTarget.username} khỏi danh sách sử dụng.`)
      setDeleteTarget(null)
      handleRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa tài khoản này khỏi danh sách sử dụng.")
    } finally {
      setBusyUserId(null)
    }
  }

  const statCards = stats
    ? [
        {
          label: "Tổng người dùng",
          value: stats.totalUsers,
          accent: `${formatNumber(stats.deletedUsers)} tài khoản đã xóa nhưng vẫn giữ lại dữ liệu`,
          icon: Users,
          theme: "from-sky-500/20 via-sky-500/5 to-transparent",
        },
        {
          label: "Tài khoản hoạt động",
          value: stats.activeUsers,
          accent: `${formatNumber(stats.admins)} admin hiện tại`,
          icon: UserCheck,
          theme: "from-emerald-500/20 via-emerald-500/5 to-transparent",
        },
        {
          label: "Tài khoản bị khóa",
          value: stats.lockedUsers,
          accent: `${formatNumber(stats.disabledUsers)} tài khoản vô hiệu hóa`,
          icon: Lock,
          theme: "from-amber-500/25 via-amber-500/5 to-transparent",
        },
        {
          label: "Tổng cuộc trò chuyện",
          value: stats.totalConversations,
          accent: `${formatNumber(stats.directConversations)} cuộc trò chuyện 1-1`,
          icon: MessageSquare,
          theme: "from-indigo-500/20 via-indigo-500/5 to-transparent",
        },
        {
          label: "Nhóm chat",
          value: stats.groupConversations,
          accent: `${formatNumber(stats.totalMessages)} tin nhắn đã lưu trữ`,
          icon: Database,
          theme: "from-violet-500/20 via-violet-500/5 to-transparent",
        },
        {
          label: "Audit Log hôm nay",
          value: stats.auditLogsToday,
          accent: `${formatNumber(stats.totalAuditLogs)} log trong hệ thống`,
          icon: ScrollText,
          theme: "from-rose-500/20 via-rose-500/5 to-transparent",
        },
        {
          label: "Đăng nhập thất bại",
          value: stats.failedLoginsToday,
          accent: `${formatNumber(stats.failedLogins)} tổng số lần thất bại`,
          icon: AlertTriangle,
          theme: "from-orange-500/25 via-orange-500/5 to-transparent",
        },
      ]
    : []

  const navigationCards = stats
    ? [
        {
          title: "Người dùng",
          description:
            "Xem danh sách, tìm kiếm, kiểm tra thông tin, tạo mới, cập nhật, khóa, vô hiệu hóa, gán role và xóa tài khoản khỏi danh sách sử dụng.",
          metrics: [
            `Tổng: ${formatNumber(stats.totalUsers)}`,
            `Hoạt động: ${formatNumber(stats.activeUsers)}`,
            `Đã xóa: ${formatNumber(stats.deletedUsers)}`,
          ],
          icon: Users,
          onClick: () => openSection("users", "users-section"),
        },
        {
          title: "Role",
          description: "Theo dõi phạm vi phân quyền RBAC và quản lý các tài khoản có quyền truy cập nâng cao.",
          metrics: [
            `${formatNumber(stats.totalRoles)} role`,
            `${formatNumber(stats.admins)} admin`,
            `${formatNumber(roles.length || 3)} đang hiển thị`,
          ],
          icon: Shield,
          onClick: () => openSection("roles", "roles-section"),
        },
        {
          title: "Cuộc trò chuyện",
          description:
            "Giám sát các cuộc hội thoại nhóm, chat riêng và số lượng tin nhắn thực tế để quản lý tài nguyên.",
          metrics: [
            `Tổng: ${formatNumber(stats.totalConversations)}`,
            `Nhóm: ${formatNumber(stats.groupConversations)}`,
            `1-1: ${formatNumber(stats.directConversations)}`,
          ],
          icon: MessageSquare,
          onClick: () => openSection("conversations", "conversations-section"),
        },
        {
          title: "Audit Log",
          description: "Xem lại các hoạt động nhạy cảm, lần đăng nhập lỗi và các thao tác của quản trị viên.",
          metrics: [
            `Hôm nay: ${formatNumber(stats.auditLogsToday)}`,
            `Thất bại: ${formatNumber(stats.failedLoginsToday)}`,
            `Tổng: ${formatNumber(stats.totalAuditLogs)}`,
          ],
          icon: ScrollText,
          onClick: () => openSection("audit", "audit-section"),
        },
      ]
    : []

  const auditSummaryCards = [
    {
      label: "Log hiển thị",
      value: filteredLogs.length,
    },
    {
      label: "Thao tác thất bại",
      value: filteredLogs.filter((log) => log.actionStatus === "FAILED").length,
    },
    {
      label: "Truy cập bị từ chối",
      value: filteredLogs.filter((log) => log.actionType === "ACCESS_DENIED").length,
    },
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,transparent_22%),radial-gradient(circle_at_right,#f5d0fe,transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)] text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-xl">
         <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a,#4f46e5,#14b8a6)] shadow-soft">
              <Shield className="size-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">ZALEGRAM</p>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                  Admin Console
                </Badge>
              </div>
              <h1 className="text-lg font-semibold tracking-tight">Trang quản trị hệ thống</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/chat")}>
              <ArrowLeft className="mr-1.5 size-4" />
              Quay lại chat
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="size-9 rounded-full"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="size-4 text-yellow-400" /> : <Moon className="size-4 text-primary" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-1.5 size-4" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 md:px-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <Card className="overflow-hidden border-primary/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(37,99,235,0.92),rgba(20,184,166,0.85))] text-white shadow-2xl shadow-sky-950/20">
            <CardContent className="space-y-6 pt-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl space-y-3">
                  <Badge className="bg-white/14 text-white hover:bg-white/14">Tổng quan</Badge>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-semibold tracking-tight lg:text-4xl">
                      Giám sát hệ thống & Quản lý người dùng toàn diện
                    </h2>
                    <p className="max-w-xl text-sm text-sky-50/88 lg:text-base">
                      Giao diện quản trị cung cấp bảng giám sát hệ thống, quản lý người dùng, kiểm
                      soát Role và theo dõi Audit Log bảo mật.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                  <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-100/80">Admin hiện tại</p>
                    <p className="mt-3 text-lg font-semibold">{user?.displayName ?? user?.username ?? "Admin"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(user?.roles ?? []).map((role) => (
                        <Badge key={role} className="bg-white/14 text-white hover:bg-white/14">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-100/80">Trạng thái hệ thống</p>
                    <p className="mt-3 text-lg font-semibold">
                      {stats ? `${formatNumber(stats.auditLogsToday)} hoạt động hôm nay` : "Đang tải"}
                    </p>
                    <p className="mt-2 text-sm text-sky-50/80">
                      {stats
                        ? `${formatNumber(stats.failedLoginsToday)} lần đăng nhập lỗi và ${formatNumber(
                            stats.deletedUsers
                          )} tài khoản đã xóa nhưng vẫn được giữ lại dữ liệu`
                        : "Đang thu thập dữ liệu giám sát..."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  className="border border-white/15 bg-white/12 text-white hover:bg-white/20"
                  onClick={() => openSection("users", "users-section")}
                >
                  Mở quản lý người dùng
                  <ArrowUpRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCcw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  Tải lại dữ liệu
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong border-border/80">
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                    Trọng tâm giám sát
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">Các thông số quan trọng cần lưu ý</h3>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Activity className="size-5" />
                </div>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="font-medium text-foreground">Quản lý người dùng</p>
                  <p className="mt-1">
                    Quản lý trạng thái ACTIVE, LOCKED, DISABLED, và DELETED của người dùng mà không làm ảnh
                    hưởng tới dữ liệu chat.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="font-medium text-foreground">Quản trị Role</p>
                  <p className="mt-1">
                    Gán hoặc thu hồi quyền ADMIN của tài khoản phục vụ cho việc demo phân quyền hệ thống RBAC.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="font-medium text-foreground">Theo dõi Audit Log</p>
                  <p className="mt-1">
                    Hiển thị các lần đăng nhập lỗi, các thay đổi dữ liệu nhạy cảm và các thao tác bảo mật để admin
                    kiểm tra.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {statCards.map((item) => (
            <Card key={item.label} className="overflow-hidden border-border/80">
              <CardContent className="pt-6">
                <div className={`rounded-[1.75rem] bg-gradient-to-br ${item.theme} p-5`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                      <p className="mt-3 text-4xl font-semibold tracking-tight">
                        {stats ? formatNumber(item.value) : "..."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-background/80 bg-background/85 p-3 shadow-soft">
                      <item.icon className="size-5 text-foreground" />
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{item.accent}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {navigationCards.map((item) => (
            <Card key={item.title} className="border-border/80">
              <CardContent className="space-y-5 pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Truy cập nhanh</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight">{item.title}</h3>
                  </div>
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <item.icon className="size-5" />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{item.description}</p>

                <div className="flex flex-wrap gap-2">
                  {item.metrics.map((metric) => (
                    <Badge key={metric} variant="secondary">
                      {metric}
                    </Badge>
                  ))}
                </div>

                <Button variant="outline" className="w-full justify-between" onClick={item.onClick}>
                  Mở mục {item.title}
                  <ArrowUpRight className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="border-border/80">
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminTab)}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                    Không gian làm việc
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    Giám sát dữ liệu và thực hiện các thao tác hệ thống
                  </h2>
                </div>
                <TabsList className="h-auto w-full max-w-xl flex-wrap bg-muted/70 p-1 lg:w-auto">
                  <TabsTrigger value="overview" className="px-4 py-2">
                    <Activity className="size-4" />
                    Tổng quan
                  </TabsTrigger>
                  <TabsTrigger value="users" className="px-4 py-2">
                    <Users className="size-4" />
                    Người dùng
                  </TabsTrigger>
                  <TabsTrigger value="roles" className="px-4 py-2">
                    <Shield className="size-4" />
                    Role
                  </TabsTrigger>
                  <TabsTrigger value="conversations" className="px-4 py-2">
                    <MessageSquare className="size-4" />
                    Cuộc trò chuyện
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="px-4 py-2">
                    <ScrollText className="size-4" />
                    Audit Log
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="mt-6 space-y-6">
                <section id="roles-section" className="grid gap-4 xl:grid-cols-2">
                  <Card className="border-border/80 bg-muted/20 shadow-none">
                    <CardContent className="space-y-5 pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Role</p>
                          <h3 className="mt-2 text-xl font-semibold tracking-tight">Tổng quan RBAC</h3>
                        </div>
                        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                          <Shield className="size-5" />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-sm text-muted-foreground">Role đã cấu hình</p>
                          <p className="mt-2 text-3xl font-semibold">
                            {stats ? formatNumber(stats.totalRoles) : "..."}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-sm text-muted-foreground">Tài khoản admin</p>
                          <p className="mt-2 text-3xl font-semibold">
                            {stats ? formatNumber(stats.admins) : "..."}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-sm text-muted-foreground">Có thể gán trong UI</p>
                          <p className="mt-2 text-3xl font-semibold">{formatNumber(availableRoleNames.length)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {roles.map((role) => (
                          <Badge key={role.id} variant={role.roleName === "ADMIN" ? "default" : "secondary"}>
                            {role.roleName}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 bg-muted/20 shadow-none">
                    <CardContent className="space-y-5 pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                            Trạng thái tài khoản
                          </p>
                          <h3 className="mt-2 text-xl font-semibold tracking-tight">Phân bố trạng thái</h3>
                        </div>
                        <div className="rounded-2xl bg-destructive/10 p-3 text-destructive">
                          <Lock className="size-5" />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-sm text-muted-foreground">Hoạt động (Active)</p>
                          <p className="mt-2 text-3xl font-semibold">
                            {stats ? formatNumber(stats.activeUsers) : "..."}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-sm text-muted-foreground">Bị khóa (Locked)</p>
                          <p className="mt-2 text-3xl font-semibold">
                            {stats ? formatNumber(stats.lockedUsers) : "..."}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-sm text-muted-foreground">Vô hiệu hóa (Disabled)</p>
                          <p className="mt-2 text-3xl font-semibold">
                            {stats ? formatNumber(stats.disabledUsers) : "..."}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-sm text-muted-foreground">Đã xóa (Deleted)</p>
                          <p className="mt-2 text-3xl font-semibold">
                            {stats ? formatNumber(stats.deletedUsers) : "..."}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </section>

                <section id="conversations-section" className="grid gap-4 xl:grid-cols-2">
                  <Card className="border-border/80 bg-muted/20 shadow-none">
                    <CardContent className="space-y-5 pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                            Cuộc trò chuyện
                          </p>
                          <h3 className="mt-2 text-xl font-semibold tracking-tight">Lưu vết Realtime</h3>
                        </div>
                        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                          <MessageSquare className="size-5" />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-sm text-muted-foreground">Tất cả cuộc hội thoại</p>
                          <p className="mt-2 text-3xl font-semibold">
                            {stats ? formatNumber(stats.totalConversations) : "..."}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-sm text-muted-foreground">Nhóm chat (Group)</p>
                          <p className="mt-2 text-3xl font-semibold">
                            {stats ? formatNumber(stats.groupConversations) : "..."}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-sm text-muted-foreground">Trò chuyện 1-1 (Direct)</p>
                          <p className="mt-2 text-3xl font-semibold">
                            {stats ? formatNumber(stats.directConversations) : "..."}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/80 bg-muted/20 shadow-none">
                    <CardContent className="space-y-5 pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                            Trạng thái bảo mật
                          </p>
                          <h3 className="mt-2 text-xl font-semibold tracking-tight">Nhật ký bảo mật</h3>
                        </div>
                        <div className="rounded-2xl bg-rose-500/10 p-3 text-rose-600">
                          <ScrollText className="size-5" />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-sm text-muted-foreground">Audit Log hôm nay</p>
                          <p className="mt-2 text-3xl font-semibold">
                            {stats ? formatNumber(stats.auditLogsToday) : "..."}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-sm text-muted-foreground">Đăng nhập lỗi hôm nay</p>
                          <p className="mt-2 text-3xl font-semibold">
                            {stats ? formatNumber(stats.failedLoginsToday) : "..."}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background p-4">
                          <p className="text-sm text-muted-foreground">Tổng số Audit Log</p>
                          <p className="mt-2 text-3xl font-semibold">
                            {stats ? formatNumber(stats.totalAuditLogs) : "..."}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              </TabsContent>

              <TabsContent value="users" className="mt-6 space-y-4">
                <section id="users-section" className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-muted/30 p-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="font-medium">Quản lý người dùng</p>
                      <p className="text-sm text-muted-foreground">
                        Tìm kiếm theo username, email hoặc tên hiển thị, sau đó thực hiện tạo mới, xem chi tiết,
                        cập nhật, phân quyền, khóa, vô hiệu hóa, khôi phục hoặc xóa tài khoản khỏi danh sách sử dụng.
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-3 md:flex-row xl:w-auto">
                      <Input
                        value={userQuery}
                        onChange={(event) => setUserQuery(event.target.value)}
                        placeholder="Tìm kiếm username, email, tên hiển thị..."
                        className="w-full min-w-[280px] bg-background"
                      />
                      <select
                        value={statusFilter}
                        onChange={(event) =>
                          setStatusFilter(event.target.value as (typeof USER_STATUS_FILTERS)[number])
                        }
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                      >
                        {USER_STATUS_FILTERS.map((status) => (
                          <option key={status} value={status}>
                            {status === "ALL" ? "Tất cả trạng thái" : status}
                          </option>
                        ))}
                      </select>
                      <Button onClick={handleOpenCreateUser}>
                        <UserPlus className="size-4" />
                        Tạo người dùng
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <Card className="border-border/70 bg-muted/20 shadow-none">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Người dùng hiển thị</p>
                        <p className="mt-2 text-3xl font-semibold">{formatNumber(users.length)}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-border/70 bg-muted/20 shadow-none">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Đang hoạt động trong danh sách</p>
                        <p className="mt-2 text-3xl font-semibold">
                          {formatNumber(users.filter((item) => normalizeUserStatus(item.status) === "ACTIVE").length)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-border/70 bg-muted/20 shadow-none">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Admin trong danh sách</p>
                        <p className="mt-2 text-3xl font-semibold">
                          {formatNumber(users.filter((item) => item.roles.includes("ADMIN")).length)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-border/70 bg-muted/20 shadow-none">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Đã xóa trong danh sách</p>
                        <p className="mt-2 text-3xl font-semibold">
                          {formatNumber(users.filter((item) => normalizeUserStatus(item.status) === "DELETED").length)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="overflow-hidden rounded-[1.5rem] border border-border/70">
                    <div className="beautiful-scrollbar overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted/60 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">Tài khoản</th>
                            <th className="px-4 py-3">Trạng thái</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Liên hệ</th>
                            <th className="px-4 py-3">Cập nhật cuối</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((account) => {
                            const normalizedStatus = normalizeUserStatus(account.status)
                            const isSelf = account.id === user?.id
                            const isBusy = busyUserId === account.id
                            const canSoftDelete = normalizedStatus !== "DELETED"
                            const canGrantAdmin = !isSelf

                            return (
                              <tr key={account.id} className="border-t border-border/60 bg-background/80">
                                <td className="px-4 py-4 align-top">
                                  <div className="space-y-1">
                                    <p className="font-medium text-foreground">{account.displayName}</p>
                                    <p className="text-muted-foreground">@{account.username}</p>
                                    <p className="text-xs text-muted-foreground">{account.email}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <Badge variant={getStatusTone(normalizedStatus)}>{normalizedStatus}</Badge>
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <div className="flex flex-wrap gap-2">
                                    {account.roles.map((roleName) => (
                                      <Badge key={roleName} variant={getRoleTone(account.roles)}>
                                        {roleName}
                                      </Badge>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-4 align-top text-muted-foreground">
                                  <div>{account.phone || "Không có SĐT"}</div>
                                  <div className="text-xs">
                                    {account.bio ? "Có ghi chú hồ sơ" : "Không có ghi chú hồ sơ"}
                                  </div>
                                </td>
                                <td className="px-4 py-4 align-top text-muted-foreground">
                                  {formatDateTime(account.updatedAt ?? account.createdAt)}
                                </td>
                                <td className="px-4 py-4 align-top">
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => void handleOpenDetails(account.id)}
                                    >
                                      <Eye className="size-3.5" />
                                      Xem
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => void handleOpenEditUser(account.id)}
                                    >
                                      <Pencil className="size-3.5" />
                                      Sửa
                                    </Button>
                                    {normalizedStatus === "ACTIVE" ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={isBusy || isSelf}
                                        onClick={() => void handleStatusChange(account, "LOCKED")}
                                      >
                                        <Lock className="size-3.5" />
                                        Khóa
                                      </Button>
                                    ) : null}
                                    {normalizedStatus === "LOCKED" ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={isBusy || isSelf}
                                        onClick={() => void handleStatusChange(account, "ACTIVE")}
                                      >
                                        <Unlock className="size-3.5" />
                                        Mở khóa
                                      </Button>
                                    ) : null}
                                    {normalizedStatus === "ACTIVE" || normalizedStatus === "LOCKED" ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={isBusy || isSelf}
                                        onClick={() => void handleStatusChange(account, "DISABLED")}
                                      >
                                        Vô hiệu hóa
                                      </Button>
                                    ) : null}
                                    {normalizedStatus === "DISABLED" || normalizedStatus === "DELETED" ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={isBusy || isSelf}
                                        onClick={() => void handleStatusChange(account, "ACTIVE")}
                                      >
                                        Kích hoạt
                                      </Button>
                                    ) : null}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isBusy || !canGrantAdmin}
                                      onClick={() => void handleToggleAdminRole(account)}
                                    >
                                      {account.roles.includes("ADMIN") ? "Thu hồi admin" : "Gán admin"}
                                    </Button>
                                    {canSoftDelete ? (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={isBusy || isSelf}
                                        onClick={() => setDeleteTarget(account)}
                                      >
                                        <Trash2 className="size-3.5" />
                                        Xóa
                                      </Button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {!users.length && (
                    <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-background/80 px-6 py-10 text-center text-sm text-muted-foreground">
                      Không tìm thấy người dùng phù hợp với bộ lọc hiện tại.
                    </div>
                  )}
                </section>
              </TabsContent>

              <TabsContent value="roles" className="mt-6 space-y-4">
                <AdminRolesSection refreshTick={refreshTick} onCatalogChange={handleRefresh} />
              </TabsContent>

              <TabsContent value="conversations" className="mt-6 space-y-4">
                <AdminConversationsSection
                  refreshTick={refreshTick}
                  onConversationChange={handleRefresh}
                />
              </TabsContent>

              <TabsContent value="audit" className="mt-6 space-y-4">
                <section id="audit-section" className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-muted/30 p-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="font-medium">Giám sát Audit Log</p>
                      <p className="text-sm text-muted-foreground">
                        Truy vết đăng nhập, quản trị người dùng, thay đổi role, quản lý nhóm và các lần truy cập bị
                        từ chối kèm theo context chi tiết của request.
                      </p>
                    </div>
                    <div className="grid w-full gap-3 md:grid-cols-2 xl:w-auto xl:grid-cols-3 2xl:grid-cols-4">
                      <select
                        value={selectedAction}
                        onChange={(event) => setSelectedAction(event.target.value)}
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                      >
                        {AUDIT_ACTION_OPTIONS.map((action) => (
                          <option key={action} value={action}>
                            {action === "ALL" ? "Tất cả thao tác" : action}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedAuditModule}
                        onChange={(event) =>
                          setSelectedAuditModule(
                            event.target.value as (typeof AUDIT_MODULE_OPTIONS)[number]
                          )
                        }
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                      >
                        {AUDIT_MODULE_OPTIONS.map((moduleName) => (
                          <option key={moduleName} value={moduleName}>
                            {moduleName === "ALL" ? "Tất cả module" : moduleName}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedAuditStatus}
                        onChange={(event) =>
                          setSelectedAuditStatus(
                            event.target.value as (typeof AUDIT_STATUS_OPTIONS)[number]
                          )
                        }
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                      >
                        {AUDIT_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status === "ALL" ? "Tất cả kết quả" : status}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={auditActor}
                        onChange={(event) => setAuditActor(event.target.value)}
                        placeholder="Lọc theo người thực hiện..."
                        className="w-full min-w-[220px] bg-background"
                      />
                      <Input
                        value={auditDateFrom}
                        onChange={(event) => setAuditDateFrom(event.target.value)}
                        type="date"
                        className="w-full min-w-[180px] bg-background"
                      />
                      <Input
                        value={auditDateTo}
                        onChange={(event) => setAuditDateTo(event.target.value)}
                        type="date"
                        className="w-full min-w-[180px] bg-background"
                      />
                      <Input
                        value={auditQuery}
                        onChange={(event) => setAuditQuery(event.target.value)}
                        placeholder="Tìm kiếm chi tiết, đối tượng, IP, user agent..."
                        className="w-full min-w-[320px] bg-background md:col-span-2 xl:col-span-3 2xl:col-span-1"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {auditSummaryCards.map((item) => (
                      <Card key={item.label} className="border-border/70 bg-muted/20 shadow-none">
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground">{item.label}</p>
                          <p className="mt-2 text-3xl font-semibold">{formatNumber(item.value)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="overflow-hidden rounded-[1.5rem] border border-border/70">
                    <div className="beautiful-scrollbar overflow-x-auto">
                      <table className="min-w-[1400px] text-sm">
                        <thead className="bg-muted/60 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">Thời gian</th>
                            <th className="px-4 py-3">Người thực hiện</th>
                            <th className="px-4 py-3">Thao tác</th>
                            <th className="px-4 py-3">Module</th>
                            <th className="px-4 py-3">Đối tượng</th>
                            <th className="px-4 py-3">Trạng thái</th>
                            <th className="px-4 py-3">IP Address</th>
                            <th className="px-4 py-3">User Agent</th>
                            <th className="px-4 py-3">Chi tiết</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLogs.map((log) => (
                            <tr key={log.id} className="border-t border-border/60 bg-background/80 align-top">
                              <td className="px-4 py-4 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                              <td className="px-4 py-4">
                                <div className="space-y-1">
                                  <p className="font-medium text-foreground">
                                    {log.actor?.displayName || "Hệ thống"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {log.actor?.username
                                      ? `@${log.actor.username}`
                                      : log.actorUserId || "Không có actor ID"}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <Badge variant="outline">{log.actionType}</Badge>
                              </td>
                              <td className="px-4 py-4">
                                <Badge variant="secondary">{log.moduleName || "SYSTEM"}</Badge>
                              </td>
                              <td className="px-4 py-4 text-muted-foreground">
                                <div>{log.targetTable || "-"}</div>
                                <div className="text-xs">{log.targetId || "Không có target ID"}</div>
                              </td>
                              <td className="px-4 py-4">
                                <Badge variant={log.actionStatus === "SUCCESS" ? "default" : "destructive"}>
                                  {log.actionStatus}
                                </Badge>
                              </td>
                              <td className="px-4 py-4 text-muted-foreground">{log.ipAddress || "-"}</td>
                              <td className="px-4 py-4 text-muted-foreground">
                                <div className="max-w-[280px] truncate" title={log.userAgent || "-"}>
                                  {log.userAgent || "-"}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-muted-foreground">
                                <div className="max-w-[360px] whitespace-pre-wrap">
                                  {log.description || "Không lưu thông tin chi tiết."}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {!filteredLogs.length && (
                    <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-background/80 px-6 py-10 text-center text-sm text-muted-foreground">
                      Không tìm thấy bản ghi Audit Log nào phù hợp với bộ lọc.
                    </div>
                  )}
                </section>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <Dialog
        open={isDetailDialogOpen}
        onOpenChange={(open) => {
          setIsDetailDialogOpen(open)
          if (!open) {
            setDetailUser(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chi tiết người dùng</DialogTitle>
            <DialogDescription>
              Xem thông tin cá nhân, các role được gán và thống kê hoạt động mà không chỉnh sửa bản ghi.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              Đang tải chi tiết người dùng...
            </div>
          ) : detailUser ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Thông tin cá nhân</p>
                  <p className="mt-3 text-lg font-semibold">{detailUser.displayName}</p>
                  <p className="text-muted-foreground">@{detailUser.username}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{detailUser.email}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Trạng thái & Role</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={getStatusTone(detailUser.status)}>{normalizeUserStatus(detailUser.status)}</Badge>
                    {detailUser.roles.map((roleName) => (
                      <Badge key={roleName} variant={getRoleTone(detailUser.roles)}>
                        {roleName}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">Số điện thoại: {detailUser.phone || "Không có SĐT"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tiểu sử</p>
                <p className="mt-3 text-sm text-muted-foreground">{detailUser.bio || "Chưa cập nhật tiểu sử."}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background p-4">
                  <p className="text-sm text-muted-foreground">Số cuộc hội thoại</p>
                  <p className="mt-2 text-3xl font-semibold">{formatNumber(detailUser.conversationCount)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background p-4">
                  <p className="text-sm text-muted-foreground">Tin nhắn đã gửi</p>
                  <p className="mt-2 text-3xl font-semibold">{formatNumber(detailUser.messageCount)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background p-4">
                  <p className="text-sm text-muted-foreground">Bản ghi Audit Log</p>
                  <p className="mt-2 text-3xl font-semibold">{formatNumber(detailUser.auditLogCount)}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ngày tạo</p>
                  <p className="mt-2 text-sm text-muted-foreground">{formatDateTime(detailUser.createdAt)}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cập nhật cuối</p>
                  <p className="mt-2 text-sm text-muted-foreground">{formatDateTime(detailUser.updatedAt)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              Không tìm thấy dữ liệu chi tiết của người dùng.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isUserFormOpen}
        onOpenChange={(open) => {
          setIsUserFormOpen(open)
          if (!open) {
            resetUserForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{formMode === "create" ? "Tạo người dùng" : "Cập nhật người dùng"}</DialogTitle>
            <DialogDescription>
              {formMode === "create"
                ? "Tạo tài khoản mới, gán các role và cấu hình trạng thái ban đầu."
                : "Cập nhật dữ liệu cá nhân, trạng thái hoạt động và role mà không ảnh hưởng tới dữ liệu chat."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên hiển thị</label>
              <Input
                value={userForm.displayName}
                onChange={(event) =>
                  setUserForm((current) => ({ ...current, displayName: event.target.value }))
                }
                placeholder="Nguyen Van A"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên đăng nhập</label>
              <Input
                value={userForm.username}
                onChange={(event) => setUserForm((current) => ({ ...current, username: event.target.value }))}
                placeholder="nguyenvana"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={userForm.email}
                onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="user@example.com"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Số điện thoại</label>
              <Input
                value={userForm.phone}
                onChange={(event) => setUserForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="0901234567"
              />
            </div>
            {formMode === "create" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Mật khẩu</label>
                <Input
                  value={userForm.password}
                  onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Mật khẩu bảo mật"
                  type="password"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium">Trạng thái</label>
              <select
                value={userForm.status}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    status: event.target.value as UserFormState["status"],
                  }))
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                {USER_FORM_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tiểu sử</label>
            <textarea
              value={userForm.bio}
              onChange={(event) => setUserForm((current) => ({ ...current, bio: event.target.value }))}
              placeholder="Ghi chú nội bộ tùy chọn về tài khoản này"
              className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Role gán</label>
            <div className="flex flex-wrap gap-3">
              {availableRoleNames.map((roleName) => {
                const checked = userForm.roles.includes(roleName)

                return (
                  <label
                    key={roleName}
                    className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleFormRole(roleName)}
                    />
                    <span>{roleName}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUserFormOpen(false)
                resetUserForm()
              }}
            >
              Hủy
            </Button>
            <Button onClick={() => void handleSubmitUserForm()} disabled={isSubmittingUserForm}>
              {formMode === "create" ? <Plus className="size-4" /> : <Pencil className="size-4" />}
              {formMode === "create" ? "Tạo người dùng" : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa mềm tài khoản</DialogTitle>
            <DialogDescription>
              Thao tác này sẽ đổi trạng thái tài khoản thành DELETED và đăng xuất phiên hoạt động hiện tại. Tin
              nhắn, hội thoại và lịch sử hoạt động vẫn được lưu trữ để phục vụ mục đích kiểm toán bảo mật.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
            <p className="font-medium text-foreground">{deleteTarget?.displayName}</p>
            <p className="mt-1 text-sm text-muted-foreground">@{deleteTarget?.username}</p>
            <p className="mt-2 text-sm text-muted-foreground">{deleteTarget?.email}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteUser()}
              disabled={busyUserId === deleteTarget?.id}
            >
              <Trash2 className="size-4" />
              Xác nhận xóa tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
          <div className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-soft">
            Đang tải dữ liệu dashboard...
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminDashboardPage
