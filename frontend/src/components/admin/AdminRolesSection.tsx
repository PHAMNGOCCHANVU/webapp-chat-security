import { useEffect, useState } from "react"
import { Pencil, Plus, Shield, Trash2 } from "lucide-react"
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
import type { AdminPermission, AdminRole, CreateAdminRolePayload, UpdateAdminRolePayload } from "@/types/admin"

type RoleFormState = {
  roleName: string
  description: string
  permissionNames: string[]
}

const emptyRoleForm: RoleFormState = {
  roleName: "",
  description: "",
  permissionNames: [],
}

type AdminRolesSectionProps = {
  refreshTick: number
  onCatalogChange?: () => void
}

const groupPermissionsByModule = (permissions: AdminPermission[]) => {
  const groups = new Map<string, AdminPermission[]>()

  for (const permission of permissions) {
    const existing = groups.get(permission.module) ?? []
    existing.push(permission)
    groups.set(permission.module, existing)
  }

  return Array.from(groups.entries())
}

const AdminRolesSection = ({ refreshTick, onCatalogChange }: AdminRolesSectionProps) => {
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminRole | null>(null)
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm)

  useEffect(() => {
    let cancelled = false

    const loadCatalog = async () => {
      try {
        const [nextRoles, nextPermissions] = await Promise.all([
          adminService.getRoles(),
          adminService.getPermissions(),
        ])

        if (cancelled) {
          return
        }

        setRoles(nextRoles)
        setPermissions(nextPermissions)
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Không thể tải danh sách role và quyền.")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadCatalog()

    return () => {
      cancelled = true
    }
  }, [refreshTick])

  const permissionGroups = groupPermissionsByModule(permissions)

  const resetForm = () => {
    setRoleForm(emptyRoleForm)
    setEditingRole(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setIsRoleDialogOpen(true)
  }

  const handleOpenEdit = (role: AdminRole) => {
    setEditingRole(role)
    setRoleForm({
      roleName: role.roleName,
      description: role.description ?? "",
      permissionNames: role.permissionNames ?? [],
    })
    setIsRoleDialogOpen(true)
  }

  const handleTogglePermission = (permissionName: string) => {
    setRoleForm((current) => {
      const checked = current.permissionNames.includes(permissionName)
      return {
        ...current,
        permissionNames: checked
          ? current.permissionNames.filter((name) => name !== permissionName)
          : [...current.permissionNames, permissionName],
      }
    })
  }

  const reloadCatalog = async () => {
    const [nextRoles, nextPermissions] = await Promise.all([
      adminService.getRoles(),
      adminService.getPermissions(),
    ])
    setRoles(nextRoles)
    setPermissions(nextPermissions)
  }

  const handleSubmitRole = async () => {
    setIsSubmitting(true)

    try {
      if (editingRole) {
        const payload: UpdateAdminRolePayload = {
          roleName: roleForm.roleName,
          description: roleForm.description,
          permissionNames: roleForm.permissionNames,
        }
        await adminService.updateRole(editingRole.id, payload)
        toast.success(`Đã cập nhật role ${roleForm.roleName}.`)
      } else {
        const payload: CreateAdminRolePayload = {
          roleName: roleForm.roleName,
          description: roleForm.description,
          permissionNames: roleForm.permissionNames,
        }
        await adminService.createRole(payload)
        toast.success(`Đã tạo thành công role ${roleForm.roleName}.`)
      }

      setIsRoleDialogOpen(false)
      resetForm()
      await reloadCatalog()
      onCatalogChange?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu thông tin role.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRole = async () => {
    if (!deleteTarget) {
      return
    }

    setIsSubmitting(true)

    try {
      await adminService.deleteRole(deleteTarget.id)
      toast.success(`Đã xóa role ${deleteTarget.roleName}.`)
      setDeleteTarget(null)
      setIsDeleteDialogOpen(false)
      await reloadCatalog()
      onCatalogChange?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa role này.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="roles-section" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-muted/30 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="font-medium">Quản lý Role</p>
          <p className="text-sm text-muted-foreground">
            Tạo các role tùy chỉnh, chỉnh sửa mô tả và gán các quyền trong danh mục RBAC. Các role hệ thống
            như ADMIN, USER, và OWNER được bảo vệ không thể xóa.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4" />
          Tạo Role
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-muted/20 shadow-none">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Tổng số Role</p>
            <p className="mt-2 text-3xl font-semibold">{roles.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-muted/20 shadow-none">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Quyền hạn (Permissions)</p>
            <p className="mt-2 text-3xl font-semibold">{permissions.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-muted/20 shadow-none">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Role hệ thống</p>
            <p className="mt-2 text-3xl font-semibold">{roles.filter((role) => role.isSystem).length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id} className="border-border/80">
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold tracking-tight">{role.roleName}</h3>
                    {role.isSystem ? <Badge variant="secondary">Hệ thống</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {role.description || "Chưa có mô tả."}
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Shield className="size-5" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{role.userCount ?? 0} người dùng</Badge>
                <Badge variant="outline">{role.permissionNames?.length ?? 0} quyền hạn</Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {(role.permissionNames ?? []).map((permissionName) => (
                  <Badge key={permissionName} variant="secondary">
                    {permissionName}
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => handleOpenEdit(role)}>
                  <Pencil className="size-3.5" />
                  Sửa
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={role.isSystem}
                  onClick={() => {
                    setDeleteTarget(role)
                    setIsDeleteDialogOpen(true)
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Xóa
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!roles.length && !isLoading ? (
        <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-background/80 px-6 py-10 text-center text-sm text-muted-foreground">
          Không có role nào khả dụng.
        </div>
      ) : null}

      <Dialog
        open={isRoleDialogOpen}
        onOpenChange={(open) => {
          setIsRoleDialogOpen(open)
          if (!open) {
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Cập nhật Role" : "Tạo Role"}</DialogTitle>
            <DialogDescription>
              Quản lý tên role, mô tả và tập hợp các quyền được gán. Role hệ thống vẫn có thể cập nhật mô
              tả và quyền hạn, nhưng tên của chúng được bảo vệ không thể thay đổi.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên Role</label>
              <Input
                value={roleForm.roleName}
                onChange={(event) =>
                  setRoleForm((current) => ({ ...current, roleName: event.target.value.toUpperCase() }))
                }
                placeholder="MODERATOR"
                disabled={Boolean(editingRole?.isSystem)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mô tả</label>
              <Input
                value={roleForm.description}
                onChange={(event) =>
                  setRoleForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Mô tả những quyền hạn và trách nhiệm của role này"
              />
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium">Quyền hạn gán</p>
            <div className="grid gap-4 xl:grid-cols-2">
              {permissionGroups.map(([moduleName, modulePermissions]) => (
                <div key={moduleName} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Module: {moduleName}
                  </p>
                  <div className="mt-4 space-y-3">
                    {modulePermissions.map((permission) => {
                      const checked = roleForm.permissionNames.includes(permission.permissionName)

                      return (
                        <label
                          key={permission.id}
                          className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-3 py-3 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleTogglePermission(permission.permissionName)}
                            className="mt-1"
                          />
                          <div className="space-y-1">
                            <p className="font-medium">{permission.permissionName}</p>
                            <p className="text-muted-foreground">
                              {permission.description || "Không có mô tả chi tiết"}
                            </p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRoleDialogOpen(false)
                resetForm()
              }}
            >
              Hủy
            </Button>
            <Button onClick={() => void handleSubmitRole()} disabled={isSubmitting}>
              {editingRole ? <Pencil className="size-4" /> : <Plus className="size-4" />}
              {editingRole ? "Lưu thay đổi" : "Tạo Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa Role</DialogTitle>
            <DialogDescription>
              Các role tùy chỉnh chỉ có thể được xóa khi chúng không được gán cho bất kỳ tài khoản người dùng nào.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
            <p className="font-medium text-foreground">{deleteTarget?.roleName}</p>
            <p className="mt-1 text-sm text-muted-foreground">{deleteTarget?.description || "Không có mô tả"}</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={() => void handleDeleteRole()} disabled={isSubmitting}>
              <Trash2 className="size-4" />
              Xác nhận xóa Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default AdminRolesSection
