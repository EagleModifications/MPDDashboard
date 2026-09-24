import { jwtVerify } from "jose"
import fs from "node:fs/promises"
import path from "node:path"
import { getPermissions } from "../../src/lib/permissions"
import type { Permission } from "../../src/config/permissions"

const secret = () =>
  new TextEncoder().encode(process.env.SESSION_SECRET!)

async function getPanelPermissions(discordId: string): Promise<string[]> {
  try {
    const config = JSON.parse(await fs.readFile(
      path.join(process.cwd(), "public", "config", "permissions", "permissions.json"),
      "utf8",
    ))
    const members = JSON.parse(await fs.readFile(
      path.join(process.cwd(), "public", "config", "permissions", "members.json"),
      "utf8",
    ))
    const roles: string[] = members.members?.[discordId]?.roles ?? []
    return [...new Set(roles.flatMap((role) => config.permissions?.[role]?.permissions ?? []))]
  } catch {
    return []
  }
}

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") ?? ""

  const match = cookie.match(/mpd_session=([^;]+)/)

  if (!match) {
    return Response.json(
      { authenticated: false },
      { status: 401 },
    )
  }

  try {
    const { payload } = await jwtVerify(
      match[1],
      secret(),
    )

    const discordId = String(payload.discordId ?? "")
    const permissions = getPermissions(
      discordId,
      String(payload.rank ?? ""),
      String(payload.callsign ?? ""),
      (await getPanelPermissions(discordId)) as Permission[],
    )

    return Response.json({
      authenticated: true,
      user: {
        ...payload,
        permissions,
      },
    })
  } catch {
    return Response.json(
      { authenticated: false },
      { status: 401 },
    )
  }
}