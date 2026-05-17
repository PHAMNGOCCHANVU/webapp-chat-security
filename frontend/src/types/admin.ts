export type AdminUserStatus = "ACTIVE" | "LOCKED" | "DISABLED" | "DELETED" | string

export type AdminUser = {
  id: string
  username: string
  displayName: string
  email: string
  avatarUrl?: string | null
  phone?: string | null
  bio?: string | null
  status: AdminUserStatus
  roles: string[]
  createdAt: string
  updatedAt?: string
}

export type AdminUserDetail = AdminUser & {
  conversationCount: number
  messageCount: number
  auditLogCount: number
}

export type AdminRole = {
  id: string
  roleName: string
  description?: string | null
  permissions?: AdminPermission[]
  permissionNames?: string[]
  userCount?: number
  isSystem?: boolean
}

export type AdminPermission = {
  id: string
  permissionName: string
  description?: string | null
  module: string
  isSystem?: boolean
}

export type CreateAdminUserPayload = {
  username: string
  displayName: string
  email: string
  password: string
  phone?: string
  bio?: string
  status?: Exclude<AdminUserStatus, "DELETED">
  roles?: string[]
}

export type UpdateAdminUserPayload = {
  username?: string
  displayName?: string
  email?: string
  phone?: string
  bio?: string
  avatarUrl?: string
  status?: AdminUserStatus
}

export type CreateAdminRolePayload = {
  roleName: string
  description?: string
  permissionNames: string[]
}

export type UpdateAdminRolePayload = {
  roleName?: string
  description?: string
  permissionNames?: string[]
}

export type AdminConversationStatus = "ACTIVE" | "ARCHIVED" | "DELETED" | string

export type AdminConversation = {
  id: string
  type: "PRIVATE" | "GROUP" | string
  status: AdminConversationStatus
  conversationName?: string | null
  displayName: string
  createdAt: string
  updatedAt: string
  createdBy: string
  creator: {
    id: string
    username: string
    displayName: string
    avatarUrl?: string | null
  } | null
  memberCount: number
  lastActivityAt?: string | null
}

export type AdminConversationMember = {
  id: string
  username: string
  displayName: string
  avatarUrl?: string | null
  memberRole: "OWNER" | "MEMBER" | string
  joinedAt: string
}

export type AdminConversationDetail = AdminConversation & {
  members: AdminConversationMember[]
}

export type CreateAdminConversationPayload = {
  conversationName: string
  memberIds: string[]
  ownerUserId?: string
}

export type UpdateAdminConversationPayload = {
  conversationName?: string
  status?: AdminConversationStatus
}

export type AdminAuditLog = {
  id: string
  actorUserId?: string | null
  actionType: string
  moduleName?: string | null
  targetTable?: string | null
  targetId?: string | null
  actionStatus: "SUCCESS" | "FAILED" | string
  ipAddress?: string | null
  userAgent?: string | null
  description?: string | null
  createdAt: string
  actor?: {
    id: string
    username: string
    displayName: string
  } | null
}

export type AdminAuditLogFilters = {
  action?: string
  actor?: string
  module?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export type SystemStats = {
  totalUsers: number
  activeUsers: number
  admins: number
  totalRoles: number
  lockedUsers: number
  disabledUsers: number
  deletedUsers: number
  inactiveUsers: number
  totalConversations: number
  groupConversations: number
  directConversations: number
  totalMessages: number
  totalAuditLogs: number
  auditLogsToday: number
  failedLogins: number
  failedLoginsToday: number
}
