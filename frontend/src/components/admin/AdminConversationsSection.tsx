import { useDeferredValue, useEffect, useState } from "react"
import {
  Eye,
  Lock,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"
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
import { adminService } from "@/services/adminService"
import type {
  AdminConversation,
  AdminConversationDetail,
  AdminConversationStatus,
  AdminUser,
  CreateAdminConversationPayload,
  UpdateAdminConversationPayload,
} from "@/types/admin"

const CONVERSATION_TYPE_FILTERS = ["ALL", "GROUP", "DIRECT"] as const
const CONVERSATION_STATUS_FILTERS = ["ALL", "ACTIVE", "ARCHIVED", "DELETED"] as const

type ConversationFormState = {
  conversationName: string
  ownerUserId: string
  memberIds: string[]
}

type ConversationUpdateFormState = {
  conversationName: string
  status: "ACTIVE" | "ARCHIVED" | "DELETED"
}

const emptyConversationForm: ConversationFormState = {
  conversationName: "",
  ownerUserId: "",
  memberIds: [],
}

const emptyUpdateForm: ConversationUpdateFormState = {
  conversationName: "",
  status: "ACTIVE",
}

type AdminConversationsSectionProps = {
  refreshTick: number
  onConversationChange?: () => void
}

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Chưa có hoạt động"
  }

  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const getConversationStatusTone = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "default" as const
    case "ARCHIVED":
      return "secondary" as const
    case "DELETED":
      return "destructive" as const
    default:
      return "outline" as const
  }
}

const normalizeConversationStatus = (status?: string | null): ConversationUpdateFormState["status"] => {
  if (status === "ARCHIVED" || status === "DELETED") {
    return status
  }

  return "ACTIVE"
}

const AdminConversationsSection = ({
  refreshTick,
  onConversationChange,
}: AdminConversationsSectionProps) => {
  const [conversations, setConversations] = useState<AdminConversation[]>([])
  const [activeUsers, setActiveUsers] = useState<AdminUser[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<(typeof CONVERSATION_TYPE_FILTERS)[number]>("ALL")
  const [statusFilter, setStatusFilter] = useState<(typeof CONVERSATION_STATUS_FILTERS)[number]>("ALL")
  const [isLoading, setIsLoading] = useState(true)
  const [busyConversationId, setBusyConversationId] = useState<string | null>(null)
  const [detailConversation, setDetailConversation] = useState<AdminConversationDetail | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [pendingMemberId, setPendingMemberId] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [conversationForm, setConversationForm] = useState<ConversationFormState>(emptyConversationForm)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingConversation, setEditingConversation] = useState<AdminConversation | null>(null)
  const [updateForm, setUpdateForm] = useState<ConversationUpdateFormState>(emptyUpdateForm)

  const deferredSearchQuery = useDeferredValue(searchQuery)

  const loadConversations = async () => {
    const nextConversations = await adminService.getConversations(
      deferredSearchQuery,
      typeFilter === "ALL" ? undefined : typeFilter,
      statusFilter === "ALL" ? undefined : statusFilter
    )
    setConversations(nextConversations)
  }

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      try {
        const [nextConversations, nextUsers] = await Promise.all([
          adminService.getConversations(
            deferredSearchQuery,
            typeFilter === "ALL" ? undefined : typeFilter,
            statusFilter === "ALL" ? undefined : statusFilter
          ),
          adminService.getUsers(undefined, "ACTIVE"),
        ])

        if (cancelled) {
          return
        }

        setConversations(nextConversations)
        setActiveUsers(nextUsers.filter((user) => user.status === "ACTIVE"))
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Không thể tải danh sách cuộc trò chuyện.")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [deferredSearchQuery, refreshTick, statusFilter, typeFilter])

  const handleOpenDetail = async (conversationId: string) => {
    setDetailLoading(true)
    setIsDetailDialogOpen(true)

    try {
      const nextConversation = await adminService.getConversation(conversationId)
      setDetailConversation(nextConversation)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải chi tiết cuộc trò chuyện.")
      setIsDetailDialogOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleOpenEdit = (conversation: AdminConversation) => {
    setEditingConversation(conversation)
    setUpdateForm({
      conversationName: conversation.conversationName ?? conversation.displayName,
      status: normalizeConversationStatus(conversation.status),
    })
    setIsEditDialogOpen(true)
  }

  const handleToggleConversationMember = (userId: string) => {
    setConversationForm((current) => {
      const checked = current.memberIds.includes(userId)
      return {
        ...current,
        memberIds: checked
          ? current.memberIds.filter((memberId) => memberId !== userId)
          : [...current.memberIds, userId],
      }
    })
  }

  const handleCreateConversation = async () => {
    if (!conversationForm.ownerUserId) {
      toast.error("Vui lòng chọn người sở hữu nhóm.")
      return
    }

    setBusyConversationId("create")

    try {
      const payload: CreateAdminConversationPayload = {
        conversationName: conversationForm.conversationName,
        ownerUserId: conversationForm.ownerUserId,
        memberIds: conversationForm.memberIds,
      }

      await adminService.createConversation(payload)
      toast.success(`Đã tạo nhóm chat ${conversationForm.conversationName} thành công.`)
      setConversationForm(emptyConversationForm)
      setIsCreateDialogOpen(false)
      await loadConversations()
      onConversationChange?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo nhóm chat.")
    } finally {
      setBusyConversationId(null)
    }
  }

  const handleSaveConversation = async () => {
    if (!editingConversation) {
      return
    }

    setBusyConversationId(editingConversation.id)

    try {
      const payload: UpdateAdminConversationPayload = {
        conversationName: updateForm.conversationName,
        status: updateForm.status,
      }
      await adminService.updateConversation(editingConversation.id, payload)
      toast.success(`Đã cập nhật nhóm ${editingConversation.displayName}.`)
      setIsEditDialogOpen(false)
      setEditingConversation(null)
      await loadConversations()
      onConversationChange?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu thông tin cuộc trò chuyện.")
    } finally {
      setBusyConversationId(null)
    }
  }

  const handleQuickStatusChange = async (
    conversation: AdminConversation,
    status: AdminConversationStatus
  ) => {
    setBusyConversationId(conversation.id)

    try {
      await adminService.updateConversationStatus(conversation.id, status)
      toast.success(`Đã cập nhật trạng thái ${conversation.displayName} thành ${status}.`)
      await loadConversations()
      if (detailConversation?.id === conversation.id) {
        const nextDetail = await adminService.getConversation(conversation.id)
        setDetailConversation(nextDetail)
      }
      onConversationChange?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật trạng thái.")
    } finally {
      setBusyConversationId(null)
    }
  }

  const handleAddMember = async () => {
    if (!detailConversation || !pendingMemberId) {
      return
    }

    setBusyConversationId(detailConversation.id)

    try {
      const nextConversation = await adminService.addConversationMembers(detailConversation.id, [pendingMemberId])
      setDetailConversation(nextConversation)
      setPendingMemberId("")
      toast.success("Đã thêm thành viên vào nhóm thành công.")
      await loadConversations()
      onConversationChange?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm thành viên.")
    } finally {
      setBusyConversationId(null)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!detailConversation) {
      return
    }

    setBusyConversationId(detailConversation.id)

    try {
      const nextConversation = await adminService.removeConversationMember(detailConversation.id, userId)
      setDetailConversation(nextConversation)
      toast.success("Đã xóa thành viên khỏi nhóm.")
      await loadConversations()
      onConversationChange?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa thành viên.")
    } finally {
      setBusyConversationId(null)
    }
  }

  const availableDetailMembers = detailConversation
    ? activeUsers.filter((user) => !detailConversation.members.some((member) => member.id === user.id))
    : []
  const canEditDetailMembers =
    detailConversation?.type === "GROUP" && detailConversation.status !== "DELETED"

  return (
    <section id="conversations-section" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-muted/30 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="font-medium">Quản lý cuộc trò chuyện</p>
          <p className="text-sm text-muted-foreground">
            Quản trị viên quản lý phòng chat nhóm và thành viên qua dữ liệu mô tả (metadata). Nội dung trò
            chuyện riêng tư được ẩn đi nhằm tuân thủ nguyên tắc bảo mật thông tin.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 md:flex-row xl:w-auto">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm kiếm cuộc trò chuyện, người tạo hoặc ID..."
            className="w-full min-w-[280px] bg-background"
          />
          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value as (typeof CONVERSATION_TYPE_FILTERS)[number])
            }
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            {CONVERSATION_TYPE_FILTERS.map((type) => (
              <option key={type} value={type}>
                {type === "ALL" ? "Tất cả loại" : type}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as (typeof CONVERSATION_STATUS_FILTERS)[number])
            }
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            {CONVERSATION_STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === "ALL" ? "Tất cả trạng thái" : status}
              </option>
            ))}
          </select>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="size-4" />
            Tạo nhóm
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/70 bg-muted/20 shadow-none">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Cuộc trò chuyện hiển thị</p>
            <p className="mt-2 text-3xl font-semibold">{conversations.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-muted/20 shadow-none">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Nhóm chat (Group)</p>
            <p className="mt-2 text-3xl font-semibold">
              {conversations.filter((conversation) => conversation.type === "GROUP").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-muted/20 shadow-none">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Đang lưu trữ (Archived)</p>
            <p className="mt-2 text-3xl font-semibold">
              {conversations.filter((conversation) => conversation.status === "ARCHIVED").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-muted/20 shadow-none">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Đã giải tán/xóa (Deleted)</p>
            <p className="mt-2 text-3xl font-semibold">
              {conversations.filter((conversation) => conversation.status === "DELETED").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-border/70">
        <div className="beautiful-scrollbar overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Cuộc trò chuyện</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thành viên</th>
                <th className="px-4 py-3">Người tạo</th>
                <th className="px-4 py-3">Hoạt động cuối</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((conversation) => {
                const isBusy = busyConversationId === conversation.id
                const isGroup = conversation.type === "GROUP"

                return (
                  <tr key={conversation.id} className="border-t border-border/60 bg-background/80">
                    <td className="px-4 py-4 align-top">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{conversation.displayName}</p>
                        <p className="text-xs text-muted-foreground">{conversation.id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <Badge variant="outline">{conversation.type}</Badge>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <Badge variant={getConversationStatusTone(conversation.status)}>
                        {conversation.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 align-top text-muted-foreground">{conversation.memberCount}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="space-y-1 text-muted-foreground">
                        <p>{conversation.creator?.displayName || "Hệ thống"}</p>
                        <p className="text-xs">@{conversation.creator?.username || "không rõ"}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-muted-foreground">
                      {formatDateTime(conversation.lastActivityAt)}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => void handleOpenDetail(conversation.id)}>
                          <Eye className="size-3.5" />
                          Xem
                        </Button>
                        {isGroup ? (
                          <Button size="sm" variant="outline" onClick={() => handleOpenEdit(conversation)}>
                            <Pencil className="size-3.5" />
                            Sửa
                          </Button>
                        ) : null}
                        {isGroup && conversation.status === "ACTIVE" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => void handleQuickStatusChange(conversation, "ARCHIVED")}
                          >
                            <Lock className="size-3.5" />
                            Lưu trữ
                          </Button>
                        ) : null}
                        {isGroup && conversation.status !== "ACTIVE" && conversation.status !== "DELETED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => void handleQuickStatusChange(conversation, "ACTIVE")}
                          >
                            Kích hoạt
                          </Button>
                        ) : null}
                        {isGroup && conversation.status !== "DELETED" ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isBusy}
                            onClick={() => void handleQuickStatusChange(conversation, "DELETED")}
                          >
                            <Trash2 className="size-3.5" />
                            Giải tán
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

      {!conversations.length && !isLoading ? (
        <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-background/80 px-6 py-10 text-center text-sm text-muted-foreground">
          Không tìm thấy cuộc trò chuyện nào phù hợp với bộ lọc.
        </div>
      ) : null}

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          if (!open) {
            setConversationForm(emptyConversationForm)
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Tạo cuộc trò chuyện nhóm</DialogTitle>
            <DialogDescription>
              Tạo phòng chat nhóm mới không để lộ tin nhắn riêng tư. Chọn một người sở hữu và tối thiểu 2
              thành viên khác để lập nhóm.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên nhóm</label>
              <Input
                value={conversationForm.conversationName}
                onChange={(event) =>
                  setConversationForm((current) => ({
                    ...current,
                    conversationName: event.target.value,
                  }))
                }
                placeholder="Nhóm điều phối dự án"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Người sở hữu (Owner)</label>
              <select
                value={conversationForm.ownerUserId}
                onChange={(event) =>
                  setConversationForm((current) => ({
                    ...current,
                    ownerUserId: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Chọn người sở hữu</option>
                {activeUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName} (@{user.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Thành viên</p>
            <div className="grid max-h-72 gap-3 overflow-y-auto rounded-2xl border border-border/70 bg-muted/20 p-4 md:grid-cols-2">
              {activeUsers.map((user) => {
                const checked = conversationForm.memberIds.includes(user.id)

                return (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-3 py-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleConversationMember(user.id)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-muted-foreground">@{user.username}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConversationForm(emptyConversationForm)
                setIsCreateDialogOpen(false)
              }}
            >
              Hủy
            </Button>
            <Button onClick={() => void handleCreateConversation()} disabled={busyConversationId === "create"}>
              <Plus className="size-4" />
              Tạo nhóm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            setEditingConversation(null)
            setUpdateForm(emptyUpdateForm)
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cập nhật cuộc trò chuyện</DialogTitle>
            <DialogDescription>
              Đổi tên nhóm hoặc thay đổi trạng thái vòng đời của nhóm mà không truy cập nội dung tin nhắn.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên nhóm</label>
              <Input
                value={updateForm.conversationName}
                onChange={(event) =>
                  setUpdateForm((current) => ({ ...current, conversationName: event.target.value }))
                }
                placeholder="Tên phòng chat mới"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trạng thái</label>
              <select
                value={updateForm.status}
                onChange={(event) =>
                  setUpdateForm((current) => ({
                    ...current,
                    status: event.target.value as ConversationUpdateFormState["status"],
                  }))
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                {CONVERSATION_STATUS_FILTERS.filter((status) => status !== "ALL").map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setEditingConversation(null)
                setUpdateForm(emptyUpdateForm)
              }}
            >
              Hủy
            </Button>
            <Button onClick={() => void handleSaveConversation()} disabled={busyConversationId === editingConversation?.id}>
              <Pencil className="size-4" />
              Lưu cuộc trò chuyện
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDetailDialogOpen}
        onOpenChange={(open) => {
          setIsDetailDialogOpen(open)
          if (!open) {
            setDetailConversation(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Chi tiết cuộc trò chuyện</DialogTitle>
            <DialogDescription>
              Giao diện này chỉ hiển thị dữ liệu mô tả (metadata). Admin có thể quản lý thành viên nhóm và
              trạng thái mà không đọc nội dung tin nhắn riêng tư.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              Đang tải chi tiết cuộc trò chuyện...
            </div>
          ) : detailConversation ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cuộc trò chuyện</p>
                  <p className="mt-3 text-lg font-semibold">{detailConversation.displayName}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">{detailConversation.type}</Badge>
                    <Badge variant={getConversationStatusTone(detailConversation.status)}>
                      {detailConversation.status}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Hoạt động cuối: {formatDateTime(detailConversation.lastActivityAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Chủ sở hữu (Ownership)</p>
                  <p className="mt-3 text-lg font-semibold">
                    {detailConversation.creator?.displayName || "Hệ thống"}
                  </p>
                  <p className="text-sm text-muted-foreground">@{detailConversation.creator?.username || "không rõ"}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Ngày tạo: {formatDateTime(detailConversation.createdAt)}
                  </p>
                </div>
              </div>

              {detailConversation.type === "GROUP" ? (
                <Card className="border-border/80 shadow-none">
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Thành viên</p>
                        <p className="text-sm text-muted-foreground">
                          Thêm hoặc xóa thành viên nhóm mà không truy cập nội dung chat.
                        </p>
                      </div>
                      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                        <Users className="size-5" />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                      <select
                        value={pendingMemberId}
                        onChange={(event) => setPendingMemberId(event.target.value)}
                        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                      >
                        <option value="">Chọn thành viên đang hoạt động</option>
                        {availableDetailMembers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.displayName} (@{user.username})
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        disabled={!pendingMemberId || busyConversationId === detailConversation.id || !canEditDetailMembers}
                        onClick={() => void handleAddMember()}
                      >
                        <UserPlus className="size-4" />
                        Thêm thành viên
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {detailConversation.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-medium text-foreground">{member.displayName}</p>
                            <p className="text-sm text-muted-foreground">@{member.username}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={member.memberRole === "OWNER" ? "default" : "secondary"}>
                              {member.memberRole}
                            </Badge>
                            <Badge variant="outline">{formatDateTime(member.joinedAt)}</Badge>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busyConversationId === detailConversation.id || !canEditDetailMembers}
                              onClick={() => void handleRemoveMember(member.id)}
                            >
                              Xóa khỏi nhóm
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  Trò chuyện 1-1 chỉ hiển thị thông tin metadata. Thao tác chỉnh sửa thành viên chỉ áp dụng cho phòng chat nhóm.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              Không có thông tin chi tiết cuộc trò chuyện.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default AdminConversationsSection
