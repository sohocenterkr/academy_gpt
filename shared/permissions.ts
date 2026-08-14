export const permissionList = [
  "dashboard:view",
  "administrators:view",
  "administrators:manage",
  "students:view",
  "students:manage",
  "academics:view",
  "academics:manage",
  "checkins:view",
  "checkins:manage",
  "messages:view",
  "messages:manage",
  "messages:send",
  "card-news:view",
  "card-news:manage",
  "reports:view",
  "audit:view",
  "settings:view",
  "settings:manage"
] as const;

export type Permission = (typeof permissionList)[number];
export type AdminRole = "super_admin" | "admin";

const adminPermissions: readonly Permission[] = [
  "dashboard:view",
  "students:view",
  "students:manage",
  "academics:view",
  "academics:manage",
  "checkins:view",
  "checkins:manage",
  "messages:view",
  "messages:manage",
  "messages:send",
  "card-news:view",
  "card-news:manage",
  "reports:view",
  "settings:view"
];

export const permissionsByRole: Record<
  AdminRole,
  readonly Permission[]
> = {
  super_admin: permissionList,
  admin: adminPermissions
};

export function getPermissionsForRole(
  role: AdminRole
): readonly Permission[] {
  return permissionsByRole[role];
}

export function hasPermission(
  role: AdminRole,
  permission: Permission
): boolean {
  return permissionsByRole[role].includes(permission);
}
