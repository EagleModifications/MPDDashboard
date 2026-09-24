export type User = {
  // Discord account
  discordId: string
  username: string
  displayName: string
  avatar?: string

  // MPD roster information
  callsign: string
  badgeNumber: string
  name: string
  rank: string
  timeInDept: string
  timeInRank: string
  status: string

  // Website permissions
  permissions: string[]
}

export async function getSession(): Promise<User | null> {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
    })

    if (!response.ok) {
      console.error(
        `Failed to get session: ${response.status}`,
      )

      return null
    }

    const data = await response.json()

    if (!data.authenticated || !data.user) {
      return null
    }

    return data.user as User
  } catch (error) {
    console.error("Failed to get session:", error)

    return null
  }
}

export function hasPermission(
  user: User | null,
  permission: string,
) {
  return Boolean(
    user?.permissions.includes("admin") ||
      user?.permissions.includes(permission),
  )
}