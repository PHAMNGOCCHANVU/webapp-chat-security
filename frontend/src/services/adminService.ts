import api from "@/lib/axios"
import type {
  AdminAuditLog,
  AdminAuditLogFilters,
  AdminConversation,
  AdminConversationDetail,
  AdminConversationStatus,
  AdminPermission,
  AdminRole,
  AdminUser,
  AdminUserDetail,
  CreateAdminConversationPayload,
  CreateAdminRolePayload,
  CreateAdminUserPayload,
  SystemStats,
  UpdateAdminConversationPayload,
  UpdateAdminRolePayload,
  UpdateAdminUserPayload,
} from "@/types/admin"

export const adminService = {
  async getUsers(search?: string, status?: string): Promise<AdminUser[]> {
    const searchParams = new URLSearchParams()

    if (search?.trim()) {
      searchParams.set("search", search.trim())
    }

    if (status?.trim()) {
      searchParams.set("status", status.trim())
    }

    const query = searchParams.toString()
    const response = await api.get<AdminUser[]>(query ? `/admin/users?${query}` : "/admin/users")
    return response.data
  },

  async getUser(userId: string): Promise<AdminUserDetail> {
    const response = await api.get<AdminUserDetail>(`/admin/users/${userId}`)
    return response.data
  },

  async createUser(payload: CreateAdminUserPayload) {
    const response = await api.post<AdminUser>("/admin/users", payload)
    return response.data
  },

  async updateUser(userId: string, payload: UpdateAdminUserPayload) {
    const response = await api.put<AdminUser>(`/admin/users/${userId}`, payload)
    return response.data
  },

  async updateUserStatus(userId: string, status: "ACTIVE" | "LOCKED" | "DISABLED" | "DELETED") {
    const response = await api.patch<Pick<AdminUser, "id" | "username" | "status">>(
      `/admin/users/${userId}/status`,
      { status }
    )
    return response.data
  },

  async getRoles(): Promise<AdminRole[]> {
    const response = await api.get<AdminRole[]>("/admin/roles")
    return response.data
  },

  async getPermissions(): Promise<AdminPermission[]> {
    const response = await api.get<AdminPermission[]>("/admin/permissions")
    return response.data
  },

  async createRole(payload: CreateAdminRolePayload) {
    const response = await api.post<AdminRole>("/admin/roles", payload)
    return response.data
  },

  async updateRole(roleId: string, payload: UpdateAdminRolePayload) {
    const response = await api.put<AdminRole>(`/admin/roles/${roleId}`, payload)
    return response.data
  },

  async deleteRole(roleId: string) {
    const response = await api.delete<{ message: string; role: AdminRole }>(`/admin/roles/${roleId}`)
    return response.data
  },

  async assignRole(userId: string, role: string) {
    const response = await api.post<AdminUserDetail>(`/admin/users/${userId}/roles`, { role })
    return response.data
  },

  async revokeRole(userId: string, role: string) {
    const response = await api.delete<AdminUserDetail>(`/admin/users/${userId}/roles/${role}`)
    return response.data
  },

  async deleteUser(userId: string) {
    const response = await api.delete<{ message: string; user: AdminUser }>(`/admin/users/${userId}`)
    return response.data
  },

  async getAuditLogs(filters?: AdminAuditLogFilters): Promise<AdminAuditLog[]> {
    const searchParams = new URLSearchParams()

    if (filters?.action?.trim()) {
      searchParams.set("action", filters.action.trim())
    }

    if (filters?.actor?.trim()) {
      searchParams.set("actor", filters.actor.trim())
    }

    if (filters?.module?.trim()) {
      searchParams.set("module", filters.module.trim())
    }

    if (filters?.status?.trim()) {
      searchParams.set("status", filters.status.trim())
    }

    if (filters?.dateFrom?.trim()) {
      searchParams.set("dateFrom", filters.dateFrom.trim())
    }

    if (filters?.dateTo?.trim()) {
      searchParams.set("dateTo", filters.dateTo.trim())
    }

    const query = searchParams.toString()
    const response = await api.get<AdminAuditLog[]>(
      query ? `/admin/audit-logs?${query}` : "/admin/audit-logs"
    )

    return response.data
  },

  async getSystemStats(): Promise<SystemStats> {
    const response = await api.get<SystemStats>("/admin/stats")
    return response.data
  },

  async getConversations(search?: string, type?: string, status?: string): Promise<AdminConversation[]> {
    const searchParams = new URLSearchParams()

    if (search?.trim()) {
      searchParams.set("search", search.trim())
    }

    if (type?.trim()) {
      searchParams.set("type", type.trim())
    }

    if (status?.trim()) {
      searchParams.set("status", status.trim())
    }

    const query = searchParams.toString()
    const response = await api.get<AdminConversation[]>(
      query ? `/admin/conversations?${query}` : "/admin/conversations"
    )
    return response.data
  },

  async getConversation(conversationId: string): Promise<AdminConversationDetail> {
    const response = await api.get<AdminConversationDetail>(`/admin/conversations/${conversationId}`)
    return response.data
  },

  async createConversation(payload: CreateAdminConversationPayload) {
    const response = await api.post<AdminConversationDetail>("/admin/conversations", payload)
    return response.data
  },

  async updateConversation(conversationId: string, payload: UpdateAdminConversationPayload) {
    const response = await api.put<AdminConversationDetail>(`/admin/conversations/${conversationId}`, payload)
    return response.data
  },

  async addConversationMembers(conversationId: string, memberIds: string[]) {
    const response = await api.post<AdminConversationDetail>(`/admin/conversations/${conversationId}/members`, {
      memberIds,
    })
    return response.data
  },

  async removeConversationMember(conversationId: string, userId: string) {
    const response = await api.delete<AdminConversationDetail>(
      `/admin/conversations/${conversationId}/members/${userId}`
    )
    return response.data
  },

  async updateConversationStatus(conversationId: string, status: AdminConversationStatus) {
    const response = await api.patch<AdminConversationDetail>(`/admin/conversations/${conversationId}/status`, {
      status,
    })
    return response.data
  },
}
