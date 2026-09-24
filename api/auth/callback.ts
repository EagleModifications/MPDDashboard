import { jwtVerify, SignJWT } from "jose"
import fs from "node:fs/promises"
import path from "node:path"
import { findRosterUser } from "../sheets/roster"
import { getPermissions } from "../../src/lib/permissions"
import { SUPER_ADMIN_IDS, type Permission } from "../../src/config/permissions"

const secret = () =>
  new TextEncoder().encode(process.env.SESSION_SECRET!)

async function getPanelPermissions(discordId: string): Promise<string[]> {
  if (SUPER_ADMIN_IDS.includes(discordId)) {
    return ["view", "audit", "import", "requirements", "admin"]
  }

  try {
    const file = path.join(
      process.cwd(),
      "public",
      "config",
      "permissions",
      "permissions.json",
    )
    const membersFile = path.join(
      process.cwd(),
      "public",
      "config",
      "permissions",
      "members.json",
    )

    const config = JSON.parse(await fs.readFile(file, "utf8"))
    const members = JSON.parse(await fs.readFile(membersFile, "utf8"))
    const roles: string[] = members.members?.[discordId]?.roles ?? []

    return [...new Set(
      roles.flatMap((role) => config.permissions?.[role]?.permissions ?? [])
        .filter((permission: string) => permission !== "*"),
    )]
  } catch {
    return []
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)

  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  if (!code || !state) {
    return Response.redirect(`${url.origin}/signed-out`)
  }

  try {
    await jwtVerify(state, secret())
  } catch {
    return Response.redirect(`${url.origin}/signed-out`)
  }

  const tokenResponse = await fetch(
    "https://discord.com/api/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      }),
    },
  )

  if (!tokenResponse.ok) {
    return Response.redirect(`${url.origin}/signed-out`)
  }

  const token = await tokenResponse.json()

  const discordResponse = await fetch(
    "https://discord.com/api/users/@me",
    {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    },
  )

  if (!discordResponse.ok) {
    return Response.redirect(`${url.origin}/signed-out`)
  }

  const discordUser = await discordResponse.json()

  const rosterUser = await findRosterUser(discordUser.id)

  if (!rosterUser) {
    return Response.redirect(
      `${url.origin}/signed-out?error=not_registered`,
    )
  }

  const isSuperAdmin =
    (await import("../../src/config/permissions"))
      .SUPER_ADMIN_IDS.includes(discordUser.id)

  if (
    rosterUser.status.toLowerCase() !== "active" &&
    !isSuperAdmin
  ) {
    return Response.redirect(
      `${url.origin}/signed-out?error=inactive`,
    )
  }

  const permissions = getPermissions(
    discordUser.id,
    rosterUser.rank,
    rosterUser.callsign,
    (await getPanelPermissions(discordUser.id)) as Permission[],
  )

  const session = await new SignJWT({
    discordId: discordUser.id,
    username: discordUser.username,
    displayName:
      discordUser.global_name ??
      discordUser.username,
    avatar: discordUser.avatar,

    ...rosterUser,

    permissions,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret())

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${url.origin}/verifying`,
      "Set-Cookie": [
        `mpd_session=${session}`,
        "HttpOnly",
        "SameSite=Lax",
        "Path=/",
        "Max-Age=604800",
      ].join("; "),
    },
  })
}