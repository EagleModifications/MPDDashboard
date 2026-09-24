import {
  SUPER_ADMIN_IDS,
  RANK_PERMISSIONS,
  CALLSIGN_PERMISSIONS,
  type Permission,
} from "@/config/permissions"

export function getPermissions(
  discordId: string,
  rank: string,
  callsign: string,
  additionalPermissions: Permission[] = [],
): Permission[] {
  if (SUPER_ADMIN_IDS.includes(discordId)) {
    return ["view", "audit", "import", "requirements", "admin"]
  }

  return [
    ...(RANK_PERMISSIONS[rank] ?? []),
    ...(CALLSIGN_PERMISSIONS[callsign] ?? []),
    ...additionalPermissions,
  ].filter(
    (permission, index, permissions) =>
      permissions.indexOf(permission) === index,
  )
}

export function hasPermission(
  permissions: Permission[] | string[],
  required: Permission | string,
) {
  return Boolean(
    permissions.includes("admin") ||
      permissions.some((permission) => permission === required),
  )
}
