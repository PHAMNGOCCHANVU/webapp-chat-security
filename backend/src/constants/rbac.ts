export const SYSTEM_ROLE_NAMES = ["ADMIN", "USER", "OWNER"] as const;

export const PERMISSION_CATALOG = [
  { permissionName: "USER_VIEW", description: "View user accounts" },
  { permissionName: "USER_CREATE", description: "Create new user accounts" },
  { permissionName: "USER_UPDATE", description: "Update user profiles and statuses" },
  { permissionName: "USER_LOCK", description: "Lock or unlock user accounts" },
  { permissionName: "USER_DELETE", description: "Soft-delete user accounts" },
  { permissionName: "ROLE_VIEW", description: "View roles and assigned permissions" },
  { permissionName: "ROLE_CREATE", description: "Create new roles" },
  { permissionName: "ROLE_UPDATE", description: "Update role metadata and permissions" },
  { permissionName: "ROLE_DELETE", description: "Delete removable roles" },
  { permissionName: "ROLE_ASSIGN", description: "Assign or revoke roles on users" },
  { permissionName: "CONVERSATION_VIEW", description: "View conversation metadata" },
  { permissionName: "CONVERSATION_CREATE", description: "Create new conversations" },
  { permissionName: "CONVERSATION_UPDATE", description: "Rename or archive conversations" },
  { permissionName: "CONVERSATION_DELETE", description: "Dissolve or delete conversations" },
  { permissionName: "MEMBER_ADD", description: "Add members to group conversations" },
  { permissionName: "MEMBER_REMOVE", description: "Remove members from group conversations" },
  { permissionName: "AUDIT_VIEW", description: "View audit logs" },
  { permissionName: "SEND_MESSAGE", description: "Send messages in conversations" },
] as const;

export const SYSTEM_ROLES = [
  {
    roleName: "ADMIN",
    description: "System administrator with full platform access",
    permissionNames: PERMISSION_CATALOG.map((permission) => permission.permissionName),
  },
  {
    roleName: "USER",
    description: "Standard user of the chat platform",
    permissionNames: ["CONVERSATION_VIEW", "CONVERSATION_CREATE", "SEND_MESSAGE"],
  },
  {
    roleName: "OWNER",
    description: "Group owner with advanced group-management permissions",
    permissionNames: [
      "CONVERSATION_VIEW",
      "CONVERSATION_CREATE",
      "CONVERSATION_UPDATE",
      "MEMBER_ADD",
      "MEMBER_REMOVE",
      "SEND_MESSAGE",
    ],
  },
] as const;
