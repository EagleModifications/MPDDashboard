import "dotenv/config"

import fs from "node:fs/promises"
import path from "node:path"

import cookieParser from "cookie-parser"
import express from "express"
import multer from "multer"
import { google } from "googleapis"
import { jwtVerify, SignJWT } from "jose"
import XLSX from "xlsx"

import { syncGoogleRosters } from "./googleRosterSync"

import {
  SUPER_ADMIN_IDS,
  type Permission,
} from "../src/config/permissions"

import {
  getPermissions as calculatePermissions,
  hasPermission as permissionsInclude,
} from "../src/lib/permissions"

const app = express()

const PORT = 3001

/* ─────────────────────────────────────────────
   Middleware
───────────────────────────────────────────── */

app.use(
  express.json({
    limit: "10mb",
  }),
)

app.use(cookieParser())

const upload = multer({
  storage: multer.memoryStorage(),
})

/* Permission enforcement for protected API families. */
app.use("/api/import", async (req, res, next) => {
  if (req.path.startsWith("/google/rosters")) {
    const auth = await requirePermission(req, res, "import")
    if (!auth) return
    return next()
  }

  const auth = await requirePermission(req, res, "import")
  if (!auth) return
  return next()
})

app.use("/api/requirements", async (req, res, next) => {
  const auth = await requirePermission(req, res, "requirements")
  if (!auth) return
  return next()
})

app.use("/api/activity", async (req, res, next) => {
  const auth = await requirePermission(req, res, "view")
  if (!auth) return
  return next()
})

app.use("/api/audit", async (req, res, next) => {
  const auth = await requirePermission(req, res, "audit")
  if (!auth) return
  return next()
})

/* ─────────────────────────────────────────────
   Session Secret
───────────────────────────────────────────── */

const sessionSecret = () =>
  new TextEncoder().encode(
    process.env.SESSION_SECRET!,
  )

/* ─────────────────────────────────────────────
   Google Sheets
───────────────────────────────────────────── */

async function findRosterUser(
  discordId: string,
) {
  const auth =
    new google.auth.GoogleAuth({
      credentials: {
        client_email:
          process.env
            .GOOGLE_SERVICE_ACCOUNT_EMAIL,

        private_key:
          process.env.GOOGLE_PRIVATE_KEY?.replace(
            /\\n/g,
            "\n",
          ),
      },

      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
      ],
    })

  const sheets = google.sheets({
    version: "v4",
    auth,
  })

  const result =
    await sheets.spreadsheets.values.get({
      spreadsheetId:
        process.env.GOOGLE_SHEET_ID!,

      range: `${process.env.GOOGLE_SHEET_ROSTER_IMPORT}!A:H`,
    })

  const rows =
    result.data.values ?? []

  for (const row of rows.slice(1)) {
    const id = String(
      row[6] ?? "",
    ).trim()

    if (id === discordId) {
      return {
        callsign: String(
          row[0] ?? "",
        ),

        badgeNumber: String(
          row[1] ?? "",
        ),

        name: String(
          row[2] ?? "",
        ),

        rank: String(
          row[3] ?? "",
        ),

        timeInDept: String(
          row[4] ?? "",
        ),

        timeInRank: String(
          row[5] ?? "",
        ),

        discordId: id,

        status: String(
          row[7] ?? "",
        ),
      }
    }
  }

  return null
}

/* ─────────────────────────────────────────────
   Permissions
───────────────────────────────────────────── */

const permissionsConfigPath = path.join(
  process.cwd(),
  "public",
  "config",
  "permissions",
  "permissions.json",
)

const membersPermissionsPath = path.join(
  process.cwd(),
  "public",
  "config",
  "permissions",
  "members.json",
)

type PermissionGroup = {
  name: string
  description: string
  permissions: string[]
}

type PermissionConfig = {
  permissions: Record<string, PermissionGroup>
}

type MemberPermissionConfig = {
  members: Record<string, { roles: string[] }>
}

async function readPermissionConfig(): Promise<PermissionConfig> {
  try {
    const data = JSON.parse(
      await fs.readFile(permissionsConfigPath, "utf8"),
    ) as PermissionConfig

    return {
      permissions: data.permissions ?? {},
    }
  } catch {
    return { permissions: {} }
  }
}

async function readMemberPermissions(): Promise<MemberPermissionConfig> {
  try {
    const data = JSON.parse(
      await fs.readFile(membersPermissionsPath, "utf8"),
    ) as MemberPermissionConfig

    return {
      members: data.members ?? {},
    }
  } catch {
    return { members: {} }
  }
}

async function writeMemberPermissions(
  data: MemberPermissionConfig,
) {
  await fs.mkdir(path.dirname(membersPermissionsPath), { recursive: true })
  await fs.writeFile(
    membersPermissionsPath,
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  )
}

async function getPanelPermissions(discordId: string): Promise<Permission[]> {
  if (SUPER_ADMIN_IDS.includes(discordId)) {
    return ["view", "audit", "import", "requirements", "admin"]
  }

  const [config, members] = await Promise.all([
    readPermissionConfig(),
    readMemberPermissions(),
  ])

  const roles = members.members[discordId]?.roles ?? []
  const granted = new Set<Permission>()

  for (const role of roles) {
    for (const permission of config.permissions[role]?.permissions ?? []) {
      if (permission === "*") {
        return ["view", "audit", "import", "requirements", "admin"]
      }

      if (
        permission === "view" ||
        permission === "audit" ||
        permission === "import" ||
        permission === "requirements" ||
        permission === "admin"
      ) {
        granted.add(permission)
      }
    }
  }

  return [...granted]
}

async function getCurrentPermissions(
  discordId: string,
  rank: string,
  callsign: string,
): Promise<Permission[]> {
  return calculatePermissions(
    discordId,
    rank,
    callsign,
    await getPanelPermissions(discordId),
  )
}

async function getAuthenticatedPayload(req: express.Request) {
  const session = req.cookies.mpd_session

  if (!session) {
    return null
  }

  try {
    const { payload } = await jwtVerify(session, sessionSecret())
    return payload
  } catch {
    return null
  }
}

async function requirePermission(
  req: express.Request,
  res: express.Response,
  permission: Permission,
) {
  const payload = await getAuthenticatedPayload(req)

  if (!payload?.discordId) {
    res.status(401).json({
      success: false,
      error: "Authentication required.",
    })
    return null
  }

  const permissions = await getCurrentPermissions(
    String(payload.discordId),
    String(payload.rank ?? ""),
    String(payload.callsign ?? ""),
  )

  if (!permissionsInclude(permissions, permission)) {
    res.status(403).json({
      success: false,
      error: "You do not have permission to perform this action.",
    })
    return null
  }

  return { payload, permissions }
}

/* ─────────────────────────────────────────────
   Discord OAuth Login
───────────────────────────────────────────── */

app.get(
  "/api/auth/login",
  async (_req, res) => {
    try {
      const state =
        await new SignJWT({
          purpose: "discord-oauth",
        })
          .setProtectedHeader({
            alg: "HS256",
          })
          .setIssuedAt()
          .setExpirationTime("10m")
          .sign(sessionSecret())

      const params =
        new URLSearchParams({
          client_id:
            process.env
              .DISCORD_CLIENT_ID!,

          response_type: "code",

          redirect_uri:
            process.env
              .DISCORD_REDIRECT_URI!,

          scope: "identify",

          state,
        })

      res.redirect(
        `https://discord.com/oauth2/authorize?${params.toString()}`,
      )
    } catch (error) {
      console.error(
        "Discord login error:",
        error,
      )

      res.status(500).json({
        error:
          "Failed to start Discord login.",
      })
    }
  },
)

/* ─────────────────────────────────────────────
   Discord OAuth Callback
───────────────────────────────────────────── */

app.get(
  "/api/auth/callback",
  async (req, res) => {
    try {
      const code = String(
        req.query.code ?? "",
      )

      const state = String(
        req.query.state ?? "",
      )

      if (!code || !state) {
        return res.redirect(
          "https://mpd-dashboard-lovat.vercel.app/signed-out?error=oauth",
        )
      }

      /* Verify OAuth state */

      try {
        const { payload } =
          await jwtVerify(
            state,
            sessionSecret(),
          )

        if (
          payload.purpose !==
          "discord-oauth"
        ) {
          return res.redirect(
            "https://mpd-dashboard-lovat.vercel.app/signed-out?error=state",
          )
        }
      } catch {
        return res.redirect(
          "https://mpd-dashboard-lovat.vercel.app/signed-out?error=state",
        )
      }

      /* Get Discord access token */

      const tokenResponse =
        await fetch(
          "https://discord.com/api/oauth2/token",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded",
            },

            body: new URLSearchParams({
              client_id:
                process.env
                  .DISCORD_CLIENT_ID!,

              client_secret:
                process.env
                  .DISCORD_CLIENT_SECRET!,

              grant_type:
                "authorization_code",

              code,

              redirect_uri:
                process.env
                  .DISCORD_REDIRECT_URI!,
            }),
          },
        )

      if (!tokenResponse.ok) {
        console.error(
          "Discord token request failed:",
          await tokenResponse.text(),
        )

        return res.redirect(
          "https://mpd-dashboard-lovat.vercel.app/signed-out?error=discord",
        )
      }

      const token =
        await tokenResponse.json()

      /* Get Discord user */

      const discordResponse =
        await fetch(
          "https://discord.com/api/users/@me",
          {
            headers: {
              Authorization:
                `Bearer ${token.access_token}`,
            },
          },
        )

      if (!discordResponse.ok) {
        console.error(
          "Failed to get Discord user:",
          await discordResponse.text(),
        )

        return res.redirect(
          "https://mpd-dashboard-lovat.vercel.app/signed-out?error=discord",
        )
      }

      const discordUser =
        await discordResponse.json()

      /*
       * Discord information
       *
       * global_name = Discord display name
       * username    = Discord username
       * avatar      = Discord avatar hash
       */

      const discordId =
        String(discordUser.id)

      const username =
        String(
          discordUser.username ?? "",
        )

      const displayName =
        String(
          discordUser.global_name ||
            discordUser.username ||
            "",
        )

      const avatar =
        discordUser.avatar
          ? String(discordUser.avatar)
          : undefined

      console.log(
        `Discord login: ${displayName} (@${username}) (${discordId})`,
      )

      /* Find Discord ID in Roster Import */

      const rosterUser =
        await findRosterUser(
          discordId,
        )

      if (!rosterUser) {
        console.log(
          `Discord ID ${discordId} not found in Roster Import.`,
        )

        return res.redirect(
          "https://mpd-dashboard-lovat.vercel.app/signed-out?error=not_registered",
        )
      }

      /* Check status */

      const isSuperAdmin =
        SUPER_ADMIN_IDS.includes(
          discordId,
        )

      if (
        rosterUser.status
          .toLowerCase() !== "active" &&
        !isSuperAdmin
      ) {
        console.log(
          `${rosterUser.name} is inactive.`,
        )

        return res.redirect(
          "https://mpd-dashboard-lovat.vercel.app/signed-out?error=inactive",
        )
      }

      /* Calculate permissions */

      const permissions = await getCurrentPermissions(
        discordId,
        rosterUser.rank,
        rosterUser.callsign,
      )

      console.log(
        `Permissions for ${rosterUser.name}:`,
        permissions,
      )

      /* Create session */

      const session =
        await new SignJWT({
          /* Discord account */

          discordId,

          username,

          displayName,

          avatar,

          /* MPD roster */

          callsign:
            rosterUser.callsign,

          badgeNumber:
            rosterUser.badgeNumber,

          name:
            rosterUser.name,

          rank:
            rosterUser.rank,

          timeInDept:
            rosterUser.timeInDept,

          timeInRank:
            rosterUser.timeInRank,

          status:
            rosterUser.status,

          /* Permissions */

          permissions,
        })
          .setProtectedHeader({
            alg: "HS256",
          })
          .setIssuedAt()
          .setExpirationTime("7d")
          .sign(sessionSecret())

      /* Save session */

      res.cookie(
        "mpd_session",
        session,
        {
          httpOnly: true,

          sameSite: "lax",

          secure: false,

          maxAge:
            7 *
            24 *
            60 *
            60 *
            1000,

          path: "/",
        },
      )

      /* Send user to verifying page */

      return res.redirect(
        "https://mpd-dashboard-lovat.vercel.app/verifying",
      )
    } catch (error) {
      console.error(
        "OAuth callback error:",
        error,
      )

      return res.redirect(
        "https://mpd-dashboard-lovat.vercel.app/signed-out?error=server",
      )
    }
  },
)

/* ─────────────────────────────────────────────
   Get Current Session
───────────────────────────────────────────── */

app.get(
  "/api/auth/session",
  async (req, res) => {
    const session =
      req.cookies.mpd_session

    if (!session) {
      return res.json({
        authenticated: false,

        user: null,
      })
    }

    try {
      const { payload } =
        await jwtVerify(
          session,
          sessionSecret(),
        )

      if (!payload.discordId) {
        throw new Error("Session is missing Discord ID")
      }

      const permissions = await getCurrentPermissions(
        String(payload.discordId),
        String(payload.rank ?? ""),
        String(payload.callsign ?? ""),
      )

      return res.json({
        authenticated: true,

        user: {
          ...payload,
          permissions,
        },
      })
    } catch {
      res.clearCookie(
        "mpd_session",
      )

      return res.json({
        authenticated: false,

        user: null,
      })
    }
  },
)

/* ─────────────────────────────────────────────
   Logout
───────────────────────────────────────────── */

app.get(
  "/api/auth/logout",
  (_req, res) => {
    res.clearCookie(
      "mpd_session",
    )

    res.redirect(
      "https://mpd-dashboard-lovat.vercel.app/signed-out?logout=true",
    )
  },
)

/* ─────────────────────────────────────────────
   Permission Management
───────────────────────────────────────────── */

app.get("/api/permissions", async (req, res) => {
  const auth = await requirePermission(req, res, "admin")

  if (!auth) return

  const [config, members] = await Promise.all([
    readPermissionConfig(),
    readMemberPermissions(),
  ])

  return res.json({
    success: true,
    permissions: config.permissions,
    members: members.members,
    superAdminIds: SUPER_ADMIN_IDS,
  })
})

app.put("/api/permissions/members/:discordId", async (req, res) => {
  const auth = await requirePermission(req, res, "admin")

  if (!auth) return

  const discordId = String(req.params.discordId ?? "").trim()
  const roles = Array.isArray(req.body?.roles)
    ? req.body.roles.map((role: unknown) => String(role).trim()).filter(Boolean)
    : []

  if (!/^\d{17,20}$/.test(discordId)) {
    return res.status(400).json({
      success: false,
      error: "Enter a valid Discord ID.",
    })
  }

  if (SUPER_ADMIN_IDS.includes(discordId)) {
    return res.status(400).json({
      success: false,
      error: "The bootstrap administrator cannot be modified here.",
    })
  }

  const config = await readPermissionConfig()
  const validRoles = roles.filter((role: string) =>
    Object.prototype.hasOwnProperty.call(config.permissions, role),
  )

  if (String(auth.payload.discordId) === discordId && !validRoles.includes("administrator")) {
    return res.status(400).json({
      success: false,
      error: "You cannot remove your own administrator access.",
    })
  }

  if (validRoles.length !== roles.length) {
    return res.status(400).json({
      success: false,
      error: "One or more selected permission groups are invalid.",
    })
  }

  const members = await readMemberPermissions()

  if (validRoles.length === 0) {
    delete members.members[discordId]
  } else {
    members.members[discordId] = {
      roles: [...new Set(validRoles)],
    }
  }

  await writeMemberPermissions(members)

  return res.json({
    success: true,
    member: members.members[discordId] ?? null,
  })
})

app.delete("/api/permissions/members/:discordId", async (req, res) => {
  const auth = await requirePermission(req, res, "admin")

  if (!auth) return

  const discordId = String(req.params.discordId ?? "").trim()

  if (SUPER_ADMIN_IDS.includes(discordId)) {
    return res.status(400).json({
      success: false,
      error: "The bootstrap administrator cannot be removed.",
    })
  }

  const authDiscordId = String(auth.payload.discordId ?? "")

  if (authDiscordId === discordId) {
    return res.status(400).json({
      success: false,
      error: "You cannot remove your own administrator access.",
    })
  }

  const members = await readMemberPermissions()
  delete members.members[discordId]
  await writeMemberPermissions(members)

  return res.json({ success: true })
})

/* ─────────────────────────────────────────────
   Roster Import
───────────────────────────────────────────── */

const rosterImportPath =
  path.join(
    process.cwd(),
    "public",
    "config",
    "imports",
    "activity",
    "roster.json",
  )

type RosterMember = {
  callsign: string
  badgeNumber: string
  name: string
  rank: string
  timeInDept: string
  timeInRank: string
  discordId: string
  status: string
}

type RosterImport = {
  members: RosterMember[]
}

async function readRosterImport(): Promise<RosterImport> {
  try {
    const file =
      await fs.readFile(
        rosterImportPath,
        "utf8",
      )

    const data =
      JSON.parse(file)

    return {
      members:
        Array.isArray(
          data.members,
        )
          ? data.members
          : [],
    }
  } catch {
    return {
      members: [],
    }
  }
}

async function writeRosterImport(
  data: RosterImport,
) {
  await fs.mkdir(
    path.dirname(
      rosterImportPath,
    ),
    {
      recursive: true,
    },
  )

  await fs.writeFile(
    rosterImportPath,
    JSON.stringify(
      data,
      null,
      2,
    ),
    "utf8",
  )
}

function parseRosterText(
  data: string,
): RosterMember[] {
  const lines =
    data
      .split(/\r?\n/)
      .map((line) =>
        line.trim(),
      )
      .filter(Boolean)

  const members: RosterMember[] = []

  for (const line of lines) {
    const lowerLine =
      line.toLowerCase()

    /*
     * Ignore header.
     */

    if (
      lowerLine.includes(
        "callsign",
      ) &&
      lowerLine.includes(
        "discord id",
      )
    ) {
      continue
    }

    let columns: string[]

    /*
     * Google Sheets paste.
     */

    if (line.includes("\t")) {
      columns =
        line.split("\t")
    }

    /*
     * CSV.
     */

    else {
      columns =
        line.split(",")
    }

    if (columns.length < 8) {
      continue
    }

    const callsign =
      columns[0]
        ?.trim()
        .replace(
          /^["']|["']$/g,
          "",
        ) ?? ""

    const badgeNumber =
      columns[1]
        ?.trim()
        .replace(
          /^["']|["']$/g,
          "",
        ) ?? ""

    const name =
      columns[2]
        ?.trim()
        .replace(
          /^["']|["']$/g,
          "",
        ) ?? ""

    const rank =
      columns[3]
        ?.trim()
        .replace(
          /^["']|["']$/g,
          "",
        ) ?? ""

    const timeInDept =
      columns[4]
        ?.trim()
        .replace(
          /^["']|["']$/g,
          "",
        ) ?? ""

    const timeInRank =
      columns[5]
        ?.trim()
        .replace(
          /^["']|["']$/g,
          "",
        ) ?? ""

    const discordId =
      columns[6]
        ?.trim()
        .replace(
          /^["']|["']$/g,
          "",
        ) ?? ""

    const status =
      columns[7]
        ?.trim()
        .replace(
          /^["']|["']$/g,
          "",
        ) ?? ""

    /*
     * Discord IDs should be
     * 17–20 digits.
     */

    if (
      discordId &&
      !/^\d{17,20}$/.test(
        discordId,
      )
    ) {
      continue
    }

    /*
     * Completely empty roster
     * slots are ignored.
     */

    if (
      !callsign &&
      !badgeNumber &&
      !name &&
      !discordId
    ) {
      continue
    }

    members.push({
      callsign,
      badgeNumber,
      name,
      rank,
      timeInDept,
      timeInRank,
      discordId,
      status,
    })
  }

  return members
}

function parseRosterSpreadsheet(
  buffer: Buffer,
): RosterMember[] {
  const workbook =
    XLSX.read(
      buffer,
      {
        type: "buffer",
      },
    )

  const sheetName =
    workbook.SheetNames[0]

  if (!sheetName) {
    return []
  }

  const sheet =
    workbook.Sheets[
      sheetName
    ]

  const rows =
    XLSX.utils.sheet_to_json<
      unknown[]
    >(sheet, {
      header: 1,
      defval: "",
    })

  const text =
    rows
      .map((row) =>
        row
          .map((value) =>
            String(
              value ?? "",
            ),
          )
          .join("\t"),
      )
      .join("\n")

  return parseRosterText(
    text,
  )
}

app.post(
  "/api/import/roster",
  upload.single("file"),
  async (req, res) => {
    try {
      let members: RosterMember[] = []

      /*
       * Uploaded CSV / TXT / XLS / XLSX
       */

      if (req.file) {
        const extension =
          path
            .extname(
              req.file.originalname,
            )
            .toLowerCase()

        if (
          extension === ".xlsx" ||
          extension === ".xls"
        ) {
          members =
            parseRosterSpreadsheet(
              req.file.buffer,
            )
        } else {
          members =
            parseRosterText(
              req.file.buffer.toString(
                "utf8",
              ),
            )
        }
      }

      /*
       * Pasted Google Sheets data
       */

      else {
        const data =
          req.body?.data

        if (
          typeof data !==
            "string" ||
          !data.trim()
        ) {
          return res
            .status(400)
            .json({
              error:
                "No roster data was provided.",
            })
        }

        members =
          parseRosterText(
            data,
          )
      }

      if (
        members.length === 0
      ) {
        return res
          .status(400)
          .json({
            error:
              "No valid roster rows were found.",
          })
      }

      /*
       * Replace the existing
       * roster with the imported
       * roster.
       *
       * The roster is the source
       * of truth for Discord login.
       */

      await writeRosterImport({
        members,
      })

      return res.json({
        success: true,
        message:
          `Roster import successful. ${members.length} members imported.`,
        imported:
          members.length,
        totalMembers:
          members.length,
      })
    } catch (error) {
      console.error(
        "Roster import error:",
        error,
      )

      return res
        .status(500)
        .json({
          error:
            error instanceof Error
              ? error.message
              : "Roster import failed.",
        })
    }
  },
)

/* ─────────────────────────────────────────────
   Activity Imports
   Department / SWAT / MTF-7 / MCD / TRU / TEU / SAR
───────────────────────────────────────────── */

const VALID_IMPORT_DIVISIONS = [
  "department",
  "swat",
  "mtf7",
  "mcd",
  "tru",
  "teu",
  "sar",
] as const

type ImportDivision =
  (typeof VALID_IMPORT_DIVISIONS)[number]

type ActivityMember = {
  hours: number
}

type ActivityImport = {
  department: string
  members: Record<
    string,
    ActivityMember
  >
}

function getActivityImportPath(
  division: ImportDivision,
) {
  return path.join(
    process.cwd(),
    "public",
    "config",
    "imports",
    "activity",
    `${division}.json`,
  )
}

async function readActivityImport(
  division: ImportDivision,
): Promise<ActivityImport> {
  try {
    const file =
      await fs.readFile(
        getActivityImportPath(
          division,
        ),
        "utf8",
      )

    const data =
      JSON.parse(file)

    return {
      department:
        typeof data.department ===
        "string"
          ? data.department
          : division,

      members:
        data.members &&
        typeof data.members ===
          "object"
          ? data.members
          : {},
    }
  } catch {
    return {
      department: division,
      members: {},
    }
  }
}

async function writeActivityImport(
  division: ImportDivision,
  data: ActivityImport,
) {
  const filePath =
    getActivityImportPath(
      division,
    )

  await fs.mkdir(
    path.dirname(filePath),
    {
      recursive: true,
    },
  )

  await fs.writeFile(
    filePath,
    JSON.stringify(
      data,
      null,
      2,
    ),
    "utf8",
  )
}

function parseActivityText(
  data: string,
): Array<[string, number]> {
  const lines =
    data
      .split(/\r?\n/)
      .map((line) =>
        line.trim(),
      )
      .filter(Boolean)

  const rows: Array<
    [string, number]
  > = []

  for (const line of lines) {
    const lowerLine =
      line.toLowerCase()

    /*
     * Ignore header.
     */

    if (
      lowerLine.includes(
        "discord id",
      ) &&
      lowerLine.includes(
        "hour",
      )
    ) {
      continue
    }

    const columns =
      line.includes("\t")
        ? line.split("\t")
        : line.split(",")

    if (columns.length < 2) {
      continue
    }

    const discordId =
      columns[0]
        .trim()
        .replace(
          /^["']|["']$/g,
          "",
        )

    const hoursText =
      columns
        .slice(1)
        .join(" ")
        .trim()
        .replace(
          /^["']|["']$/g,
          "",
        )

    const hours =
      Number(
        hoursText.replace(
          /[^\d.-]/g,
          "",
        ),
      )

    /*
     * Discord IDs must be
     * 17–20 digits.
     */

    if (
      !/^\d{17,20}$/.test(
        discordId,
      )
    ) {
      continue
    }

    /*
     * Hours must be a valid
     * number.
     */

    if (
      !Number.isFinite(hours)
    ) {
      continue
    }

    rows.push([
      discordId,
      Math.max(
        0,
        hours,
      ),
    ])
  }

  return rows
}

function parseActivitySpreadsheet(
  buffer: Buffer,
): Array<[string, number]> {
  const workbook =
    XLSX.read(
      buffer,
      {
        type: "buffer",
      },
    )

  const sheetName =
    workbook.SheetNames[0]

  if (!sheetName) {
    return []
  }

  const sheet =
    workbook.Sheets[
      sheetName
    ]

  const rows =
    XLSX.utils.sheet_to_json<
      unknown[]
    >(sheet, {
      header: 1,
      defval: "",
    })

  const text =
    rows
      .map((row) =>
        row
          .map((value) =>
            String(
              value ?? "",
            ),
          )
          .join("\t"),
      )
      .join("\n")

  return parseActivityText(
    text,
  )
}

async function handleActivityImport(
  division: ImportDivision,
  req: express.Request,
  res: express.Response,
) {
  try {
    let rows: Array<
      [string, number]
    > = []

    /*
     * Uploaded CSV / TXT / XLS / XLSX
     */

    if (req.file) {
      const extension =
        path
          .extname(
            req.file.originalname,
          )
          .toLowerCase()

      if (
        extension === ".xlsx" ||
        extension === ".xls"
      ) {
        rows =
          parseActivitySpreadsheet(
            req.file.buffer,
          )
      } else {
        rows =
          parseActivityText(
            req.file.buffer.toString(
              "utf8",
            ),
          )
      }
    }

    /*
     * Pasted data.
     */

    else {
      const data =
        req.body?.data

      if (
        typeof data !==
          "string" ||
        !data.trim()
      ) {
        return res
          .status(400)
          .json({
            error:
              "No import data was provided.",
          })
      }

      rows =
        parseActivityText(
          data,
        )
    }

    /*
     * No valid rows.
     */

    if (rows.length === 0) {
      return res
        .status(400)
        .json({
          error:
            `No valid Discord ID and Hours rows were found for ${division.toUpperCase()}.`,
        })
    }

    const existing =
      await readActivityImport(
        division,
      )

    const members = {
      ...existing.members,
    }

    let added = 0
    let updated = 0

    /*
     * Existing Discord IDs:
     * update their hours.
     *
     * New Discord IDs:
     * add them.
     *
     * Missing IDs:
     * remain untouched.
     *
     * Duplicate IDs:
     * last value wins.
     */

    for (const [
      discordId,
      hours,
    ] of rows) {
      if (
        Object.prototype.hasOwnProperty.call(
          members,
          discordId,
        )
      ) {
        updated++
      } else {
        added++
      }

      members[discordId] = {
        hours,
      }
    }

    await writeActivityImport(
      division,
      {
        department:
          existing.department ||
          division,

        members,
      },
    )

    return res.json({
      success: true,

      message:
        `${division.toUpperCase()} import successful. ` +
        `${added} added, ` +
        `${updated} updated. ` +
        `${Object.keys(members).length} total members.`,

      added,

      updated,

      imported:
        rows.length,

      totalMembers:
        Object.keys(
          members,
        ).length,
    })
  } catch (error) {
    console.error(
      `${division} import error:`,
      error,
    )

    return res
      .status(500)
      .json({
        error:
          error instanceof Error
            ? error.message
            : `${division.toUpperCase()} import failed.`,
      })
  }
}

app.post(
  "/api/import/activity/department",
  upload.single("file"),
  async (req, res) => {
    await handleActivityImport(
      "department",
      req,
      res,
    )
  },
)

app.post(
  "/api/import/activity/swat",
  upload.single("file"),
  async (req, res) => {
    await handleActivityImport(
      "swat",
      req,
      res,
    )
  },
)

app.post(
  "/api/import/activity/mtf7",
  upload.single("file"),
  async (req, res) => {
    await handleActivityImport(
      "mtf7",
      req,
      res,
    )
  },
)

app.post(
  "/api/import/activity/mcd",
  upload.single("file"),
  async (req, res) => {
    await handleActivityImport(
      "mcd",
      req,
      res,
    )
  },
)

app.post(
  "/api/import/activity/tru",
  upload.single("file"),
  async (req, res) => {
    await handleActivityImport(
      "tru",
      req,
      res,
    )
  },
)

app.post(
  "/api/import/activity/teu",
  upload.single("file"),
  async (req, res) => {
    await handleActivityImport(
      "teu",
      req,
      res,
    )
  },
)

app.post(
  "/api/import/activity/sar",
  upload.single("file"),
  async (req, res) => {
    await handleActivityImport(
      "sar",
      req,
      res,
    )
  },
)

/* ─────────────────────────────────────────────
   Activity Requirements
   Department / SWAT / MTF-7 / MCD / TRU / TEU / SAR
───────────────────────────────────────────── */

const VALID_REQUIREMENT_DIVISIONS = [
  "department",
  "swat",
  "mtf7",
  "mcd",
  "tru",
  "teu",
  "sar",
] as const

type RequirementDivision =
  (typeof VALID_REQUIREMENT_DIVISIONS)[number]

type ActivityRequirements = {
  division: string
  requirements: Record<
    string,
    {
      hours: number
    }
  >
}

function getActivityRequirementsPath(
  division: RequirementDivision,
) {
  return path.join(
    process.cwd(),
    "public",
    "config",
    "requirements",
    "activity",
    `${division}.json`,
  )
}

async function readActivityRequirements(
  division: RequirementDivision,
): Promise<ActivityRequirements> {
  const filePath = getActivityRequirementsPath(division)

  try {
    const raw = await fs.readFile(filePath, "utf8")
    return JSON.parse(raw)
  } catch {
    return {
      division,
      requirements: {},
    }
  }
}

async function writeActivityRequirements(
  division: RequirementDivision,
  requirements: Record<string, { hours: number }>,
) {
  const filePath = getActivityRequirementsPath(division)

  await fs.mkdir(path.dirname(filePath), {
    recursive: true,
  })

  const data: ActivityRequirements = {
    division,
    requirements,
  }

  await fs.writeFile(
    filePath,
    JSON.stringify(data, null, 2),
    "utf8",
  )

  return data
}

async function handleActivityRequirementsSave(
  req: express.Request,
  res: express.Response,
  division: RequirementDivision,
) {
  try {
    const body = req.body

    if (
      !body ||
      typeof body !== "object" ||
      !body.requirements ||
      typeof body.requirements !== "object"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid requirements data.",
      })
    }

    const requirements: Record<
      string,
      {
        hours: number
      }
    > = {}

    for (const [rankId, value] of Object.entries(
      body.requirements,
    )) {
      if (
        !value ||
        typeof value !== "object" ||
        !("hours" in value)
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid requirement for rank: ${rankId}`,
        })
      }

      const hours = Number(
        (value as { hours: unknown }).hours,
      )

      if (!Number.isFinite(hours) || hours < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid hours for rank: ${rankId}`,
        })
      }

      requirements[rankId] = {
        hours: Math.floor(hours),
      }
    }

    const saved = await writeActivityRequirements(
      division,
      requirements,
    )

    return res.json({
      success: true,
      message: `${division.toUpperCase()} requirements saved successfully.`,
      requirements: saved.requirements,
    })
  } catch (error) {
    console.error(
      `[requirements] Failed to save ${division} requirements:`,
      error,
    )

    return res.status(500).json({
      success: false,
      message: "Failed to save requirements.",
    })
  }
}

app.post(
  "/api/requirements/activity/department",
  async (req, res) => {
    await handleActivityRequirementsSave(
      req,
      res,
      "department",
    )
  },
)

app.post(
  "/api/requirements/activity/swat",
  async (req, res) => {
    await handleActivityRequirementsSave(
      req,
      res,
      "swat",
    )
  },
)

app.post(
  "/api/requirements/activity/mtf7",
  async (req, res) => {
    await handleActivityRequirementsSave(
      req,
      res,
      "mtf7",
    )
  },
)

app.post(
  "/api/requirements/activity/mcd",
  async (req, res) => {
    await handleActivityRequirementsSave(
      req,
      res,
      "mcd",
    )
  },
)

app.post(
  "/api/requirements/activity/tru",
  async (req, res) => {
    await handleActivityRequirementsSave(
      req,
      res,
      "tru",
    )
  },
)

app.post(
  "/api/requirements/activity/teu",
  async (req, res) => {
    await handleActivityRequirementsSave(
      req,
      res,
      "teu",
    )
  },
)

app.post(
  "/api/requirements/activity/sar",
  async (req, res) => {
    await handleActivityRequirementsSave(
      req,
      res,
      "sar",
    )
  },
)

/* ─────────────────────────────────────────────
   Activity Dashboard
───────────────────────────────────────────── */

const ACTIVITY_DASHBOARD_DIVISIONS = [
  "department",
  "swat",
  "mtf7",
  "mcd",
  "tru",
  "teu",
  "sar",
] as const

type ActivityDashboardDivision = (typeof ACTIVITY_DASHBOARD_DIVISIONS)[number]

type ActivityDashboardPerson = {
  discordId: string
  name: string
  callsign: string
  rank: string
  hours: number
  timeInRank: string
  timeInDepartment: string
  exempt: boolean
}

type ActivityDashboardRequirement = { hours: number }
type ActivityDashboardRank = { id: string; name: string }

type ActivityDashboardData = {
  personnel: {
    total: number
    compliant: number
    nonCompliant: number
    exempt: number
    compliance: number
  }
  command: {
    highCommand: number
    trialHighCommand: number
    lowCommand: number
    supervisors: number
    patrol: number
    cadets: number
  }
  divisions: {
    swat: number
    mtf7: number
    mcd: number
    tru: number
    teu: number
    sar: number
  }
  alerts: {
    departmentFailures: number
    divisionFailures: number
  }
  departmentTop: ActivityDashboardPerson[]
  divisionTop: {
    swat: ActivityDashboardPerson[]
    mtf7: ActivityDashboardPerson[]
    mcd: ActivityDashboardPerson[]
    tru: ActivityDashboardPerson[]
    teu: ActivityDashboardPerson[]
    sar: ActivityDashboardPerson[]
  }
  promotionWatchlist: ActivityDashboardPerson[]
}

/* ─────────────────────────────────────────────
   Config
───────────────────────────────────────────── */

function getActivityDashboardImportPath(
  division: ActivityDashboardDivision,
) {
  return path.join(
    process.cwd(),
    "public",
    "config",
    "imports",
    "activity",
    `${division}.json`,
  )
}

function getActivityDashboardRosterPath(
  division: ActivityDashboardDivision,
) {
  const filename =
    division === "department"
      ? "roster.json"
      : `${division}-roster.json`

  return path.join(
    process.cwd(),
    "public",
    "config",
    "imports",
    "activity",
    filename,
  )
}

function getActivityDashboardRequirementsPath(
  division: ActivityDashboardDivision,
) {
  return path.join(
    process.cwd(),
    "public",
    "config",
    "requirements",
    "activity",
    `${division}.json`,
  )
}

function getActivityDashboardRankPath(
  division: ActivityDashboardDivision,
) {
  return path.join(
    process.cwd(),
    "public",
    "config",
    "ranks",
    `${division}.json`,
  )
}

/* ─────────────────────────────────────────────
   JSON Helpers
───────────────────────────────────────────── */

async function readActivityDashboardJson(
  filePath: string,
): Promise<any> {
  try {
    const text =
      await fs.readFile(
        filePath,
        "utf8",
      )

    if (!text.trim()) {
      return null
    }

    return JSON.parse(text)
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return null
    }

    throw error
  }
}

function activityDashboardNumber(
  value: unknown,
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value
  }

  if (
    typeof value === "string"
  ) {
    const parsed =
      Number.parseFloat(
        value.replace(
          /[^0-9.-]/g,
          "",
        ),
      )

    if (
      Number.isFinite(parsed)
    ) {
      return parsed
    }
  }

  return 0
}

function activityDashboardString(
  value: unknown,
): string {
  if (
    typeof value === "string"
  ) {
    return value.trim()
  }

  if (
    typeof value === "number"
  ) {
    return String(value)
  }

  return ""
}

function activityDashboardBoolean(
  value: unknown,
): boolean {
  if (
    typeof value === "boolean"
  ) {
    return value
  }

  if (
    typeof value === "number"
  ) {
    return value === 1
  }

  if (
    typeof value === "string"
  ) {
    const normalized =
      value
        .trim()
        .toLowerCase()

    return [
      "true",
      "yes",
      "1",
      "exempt",
    ].includes(
      normalized,
    )
  }

  return false
}

/* ─────────────────────────────────────────────
   Roster
───────────────────────────────────────────── */

type ActivityDashboardRosterPerson = {
  callsign?: string
  badgeNumber?: string
  name?: string
  rank?: string
  timeInDept?: string
  timeInRank?: string
  discordId?: string
  status?: string
  exempt?: boolean
}

function activityDashboardRosterRecords(
  data: any,
): ActivityDashboardRosterPerson[] {
  if (
    Array.isArray(data)
  ) {
    return data
  }

  if (
    data &&
    typeof data === "object" &&
    Array.isArray(data.members)
  ) {
    return data.members
  }

  return []
}

function activityDashboardRosterMap(
  data: any,
): Map<string, ActivityDashboardRosterPerson> {
  const map =
    new Map<
      string,
      ActivityDashboardRosterPerson
    >()

  for (
    const person of activityDashboardRosterRecords(
      data,
    )
  ) {
    const discordId =
      activityDashboardString(
        person.discordId,
      )

    if (!discordId) {
      continue
    }

    map.set(
      discordId,
      person,
    )
  }

  return map
}

/* ─────────────────────────────────────────────
   Activity Members
───────────────────────────────────────────── */

function activityDashboardActivityRecords(
  data: any,
): Array<{
  discordId: string
  hours: number
  exempt: boolean
}> {
  if (
    !data ||
    typeof data !== "object" ||
    !data.members ||
    typeof data.members !== "object"
  ) {
    return []
  }

  return Object.entries(
    data.members,
  ).map(
    ([discordId, member]) => {
      const value =
        member as Record<
          string,
          unknown
        >

      return {
        discordId,

        hours:
          activityDashboardNumber(
            value.hours,
          ),

        exempt:
          activityDashboardBoolean(
            value.exempt,
          ),
      }
    },
  )
}

/* ─────────────────────────────────────────────
   Build People From Real Roster + Activity
───────────────────────────────────────────── */

function activityDashboardBuildPeople(
  rosterData: any,
  activityData: any,
): ActivityDashboardPerson[] {
  const roster =
    activityDashboardRosterMap(
      rosterData,
    )

  const activity =
    activityDashboardActivityRecords(
      activityData,
    )

  return activity.map(
    (member) => {
      const rosterPerson =
        roster.get(
          member.discordId,
        )

      return {
        discordId:
          member.discordId,

        name:
          activityDashboardString(
            rosterPerson?.name,
          ) || "Unknown",

        callsign:
          activityDashboardString(
            rosterPerson?.callsign,
          ) || "-",

        rank:
          activityDashboardString(
            rosterPerson?.rank,
          ) || "Unknown",

        hours:
          member.hours,

        timeInRank:
          activityDashboardString(
            rosterPerson?.timeInRank,
          ) || "-",

        timeInDepartment:
          activityDashboardString(
            rosterPerson?.timeInDept,
          ) || "-",

        exempt:
          member.exempt ||
          activityDashboardBoolean(
            rosterPerson?.exempt,
          ),
      }
    },
  )
}

/* ─────────────────────────────────────────────
   Requirements
───────────────────────────────────────────── */

async function readActivityDashboardRequirements(
  division: ActivityDashboardDivision,
): Promise<
  Record<
    string,
    ActivityDashboardRequirement
  >
> {
  const data =
    await readActivityDashboardJson(
      getActivityDashboardRequirementsPath(
        division,
      ),
    )

  if (
    !data ||
    typeof data !== "object"
  ) {
    return {}
  }

  if (
    !data.requirements ||
    typeof data.requirements !== "object"
  ) {
    return {}
  }

  return data.requirements
}

/* ─────────────────────────────────────────────
   Ranks
───────────────────────────────────────────── */

async function readActivityDashboardRanks(
  division: ActivityDashboardDivision,
): Promise<ActivityDashboardRank[]> {
  const data =
    await readActivityDashboardJson(
      getActivityDashboardRankPath(
        division,
      ),
    )

  if (
    Array.isArray(data)
  ) {
    return data
  }

  if (
    data &&
    Array.isArray(data.ranks)
  ) {
    return data.ranks
  }

  return []
}

function activityDashboardRankIdFromName(
  ranks: ActivityDashboardRank[],
  rankName: string,
): string | null {
  const normalized =
    rankName
      .trim()
      .toLowerCase()

  const rank =
    ranks.find(
      (item) =>
        activityDashboardString(
          item.name,
        ).toLowerCase() ===
        normalized,
    )

  return rank?.id ?? null
}

/* ─────────────────────────────────────────────
   Command Categories
───────────────────────────────────────────── */

function activityDashboardCommandCategory(
  rankName: string,
): keyof ActivityDashboardData["command"] {
  const rank =
    rankName
      .trim()
      .toLowerCase()

  if (
    [
      "chief of police",
      "assistant chief of police",
      "deputy chief of police",
      "chief of staff",
      "colonel",
    ].includes(rank)
  ) {
    return "highCommand"
  }

  if (
    [
      "lieutenant colonel",
      "major",
      "captain",
      "1st lieutenant",
      "2nd lieutenant",
    ].includes(rank)
  ) {
    return "trialHighCommand"
  }

  if (
    [
      "master sergeant",
      "staff sergeant",
    ].includes(rank)
  ) {
    return "lowCommand"
  }

  if (
    [
      "sergeant",
      "corporal",
      "lance corporal",
    ].includes(rank)
  ) {
    return "supervisors"
  }

  if (
    [
      "officer 1",
      "officer 2",
      "officer 3",
    ].includes(rank)
  ) {
    return "patrol"
  }

  return "cadets"
}

/* ─────────────────────────────────────────────
   GET /api/activity/dashboard
───────────────────────────────────────────── */

app.get(
  "/api/activity/dashboard",
  async (
    _req,
    res,
  ) => {
    try {
      /*
       * Load all divisions.
       *
       * IMPORTANT:
       * Each division now reads:
       *
       * roster:
       * public/config/imports/activity/
       *
       * activity:
       * public/config/imports/activity/
       */

      const importData =
        await Promise.all(
          ACTIVITY_DASHBOARD_DIVISIONS.map(
            async (
              division,
            ) => {
              const [
                rosterData,
                activityData,
              ] =
                await Promise.all([
                  readActivityDashboardJson(
                    getActivityDashboardRosterPath(
                      division,
                    ),
                  ),

                  readActivityDashboardJson(
                    getActivityDashboardImportPath(
                      division,
                    ),
                  ),
                ])

              return {
                division,

                people:
                  activityDashboardBuildPeople(
                    rosterData,
                    activityData,
                  ),
              }
            },
          ),
        )

      /*
       * Master personnel.
       *
       * Department is the source for
       * department personnel.
       */

      const departmentItem =
        importData.find(
          (item) =>
            item.division ===
            "department",
        )

      const personnel =
        departmentItem?.people ??
        []

      /*
       * Requirements.
       */

      const requirementsMap =
        new Map<
          ActivityDashboardDivision,
          Record<
            string,
            ActivityDashboardRequirement
          >
        >()

      for (
        const division of
        ACTIVITY_DASHBOARD_DIVISIONS
      ) {
        requirementsMap.set(
          division,
          await readActivityDashboardRequirements(
            division,
          ),
        )
      }

      /*
       * Rank configurations.
       */

      const rankMap =
        new Map<
          ActivityDashboardDivision,
          ActivityDashboardRank[]
        >()

      for (
        const division of
        ACTIVITY_DASHBOARD_DIVISIONS
      ) {
        rankMap.set(
          division,
          await readActivityDashboardRanks(
            division,
          ),
        )
      }

      /* ─────────────────────────────────────────
         Department Compliance
      ───────────────────────────────────────── */

      const departmentRequirements =
        requirementsMap.get(
          "department",
        ) ?? {}

      const departmentRanks =
        rankMap.get(
          "department",
        ) ?? []

      let compliant = 0
      let nonCompliant = 0
      let exempt = 0

      for (
        const person of personnel
      ) {
        if (person.exempt) {
          exempt++
          continue
        }

        const rankId =
          activityDashboardRankIdFromName(
            departmentRanks,
            person.rank,
          )

        const requirement =
          rankId
            ? departmentRequirements[
                rankId
              ]
            : undefined

        /*
         * If there is no configured
         * requirement, don't incorrectly
         * count the person as failed.
         */

        if (!requirement) {
          continue
        }

        if (
          person.hours >=
          requirement.hours
        ) {
          compliant++
        } else {
          nonCompliant++
        }
      }

      const totalPersonnel =
        personnel.length

      const compliancePopulation =
        compliant +
        nonCompliant

      const compliance =
        compliancePopulation > 0
          ? (compliant /
              compliancePopulation) *
            100
          : 0

      /* ─────────────────────────────────────────
         Command
      ───────────────────────────────────────── */

      const command = {
        highCommand: 0,
        trialHighCommand: 0,
        lowCommand: 0,
        supervisors: 0,
        patrol: 0,
        cadets: 0,
      }

      for (
        const person of personnel
      ) {
        const category =
          activityDashboardCommandCategory(
            person.rank,
          )

        command[
          category
        ]++
      }

      /* ─────────────────────────────────────────
         Division People
      ───────────────────────────────────────── */

      const getDivision =
        (
          division: ActivityDashboardDivision,
        ) =>
          importData.find(
            (item) =>
              item.division ===
              division,
          )?.people ?? []

      const swat =
        getDivision("swat")

      const mtf7 =
        getDivision("mtf7")

      const mcd =
        getDivision("mcd")

      const tru =
        getDivision("tru")

      const teu =
        getDivision("teu")

      const sar =
        getDivision("sar")

      /* ─────────────────────────────────────────
         Department Top 10
      ───────────────────────────────────────── */

      const departmentTop =
        [...personnel]
          .sort(
            (a, b) =>
              b.hours -
              a.hours,
          )
          .slice(
            0,
            10,
          )

      /* ─────────────────────────────────────────
         Division Top 5
      ───────────────────────────────────────── */

      const topFive = (
        people: ActivityDashboardPerson[],
      ) =>
        [...people]
          .sort(
            (a, b) =>
              b.hours -
              a.hours,
          )
          .slice(
            0,
            5,
          )

      /* ─────────────────────────────────────────
         Department Failures
      ───────────────────────────────────────── */

      const departmentFailures =
        personnel.filter(
          (person) => {
            if (person.exempt) {
              return false
            }

            const rankId =
              activityDashboardRankIdFromName(
                departmentRanks,
                person.rank,
              )

            const requirement =
              rankId
                ? departmentRequirements[
                    rankId
                  ]
                : undefined

            if (!requirement) {
              return false
            }

            return (
              person.hours <
              requirement.hours
            )
          },
        ).length

      /* ─────────────────────────────────────────
         Division Failures
      ───────────────────────────────────────── */

      let divisionFailures = 0

      const checkDivisionFailures = (
        division:
          | "swat"
          | "mtf7"
          | "mcd"
          | "tru"
          | "teu"
          | "sar",
        people:
          ActivityDashboardPerson[],
      ) => {
        const requirements =
          requirementsMap.get(
            division,
          ) ?? {}

        const ranks =
          rankMap.get(
            division,
          ) ?? []

        for (
          const person of people
        ) {
          if (person.exempt) {
            continue
          }

          const rankId =
            activityDashboardRankIdFromName(
              ranks,
              person.rank,
            )

          const requirement =
            rankId
              ? requirements[
                  rankId
                ]
              : undefined

          if (
            requirement &&
            person.hours <
              requirement.hours
          ) {
            divisionFailures++
          }
        }
      }

      checkDivisionFailures(
        "swat",
        swat,
      )

      checkDivisionFailures(
        "mtf7",
        mtf7,
      )

      checkDivisionFailures(
        "mcd",
        mcd,
      )

      checkDivisionFailures(
        "tru",
        tru,
      )

      checkDivisionFailures(
        "teu",
        teu,
      )

      checkDivisionFailures(
        "sar",
        sar,
      )

      /* ─────────────────────────────────────────
         Promotion Watchlist
      ───────────────────────────────────────── */

      const promotionWatchlist =
        personnel
          .filter(
            (person) => {
              if (person.exempt) {
                return false
              }

              const rankId =
                activityDashboardRankIdFromName(
                  departmentRanks,
                  person.rank,
                )

              const requirement =
                rankId
                  ? departmentRequirements[
                      rankId
                    ]
                  : undefined

              if (!requirement) {
                return false
              }

              return (
                person.hours >=
                requirement.hours
              )
            },
          )
          .sort(
            (a, b) =>
              b.hours -
              a.hours,
          )

      /* ─────────────────────────────────────────
         Response
      ───────────────────────────────────────── */

      const response:
        ActivityDashboardData = {
        personnel: {
          total:
            totalPersonnel,

          compliant,

          nonCompliant,

          exempt,

          compliance:
            Number(
              compliance.toFixed(
                2,
              ),
            ),
        },

        command,

        divisions: {
          swat:
            swat.length,

          mtf7:
            mtf7.length,

          mcd:
            mcd.length,

          tru:
            tru.length,

          teu:
            teu.length,

          sar:
            sar.length,
        },

        alerts: {
          departmentFailures,

          divisionFailures,
        },

        departmentTop,

        divisionTop: {
          swat:
            topFive(swat),

          mtf7:
            topFive(mtf7),

          mcd:
            topFive(mcd),

          tru:
            topFive(tru),

          teu:
            topFive(teu),

          sar:
            topFive(sar),
        },

        promotionWatchlist,
      }

      return res.json(
        response,
      )
    } catch (error) {
      console.error(
        "[activity-dashboard] Failed to build dashboard:",
        error,
      )

      return res.status(500).json({
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to load activity dashboard.",
      })
    }
  },
)

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */

type MasterAuditRosterPerson = {
  callsign?: string
  badgeNumber?: string
  name?: string
  rank?: string
  timeInDept?: string
  timeInRank?: string
  discordId?: string
  status?: string
}

type MasterAuditActivityMember = {
  hours?: number
}

type MasterAuditActivity = {
  department?: string
  members?: Record<
    string,
    MasterAuditActivityMember
  >
}

type MasterAuditRequirement = {
  hours?: number
}

type MasterAuditRequirements = {
  department?: string
  requirements?: Record<
    string,
    MasterAuditRequirement
  >
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

async function readMasterAuditJson<T>(
  filePath: string,
): Promise<T> {
  const raw = await fs.readFile(
    filePath,
    "utf8",
  )

  return JSON.parse(raw) as T
}

function getMasterAuditRoster(
  data: unknown,
): MasterAuditRosterPerson[] {
  /*
   * Supports:
   *
   * [
   *   {
   *     ...
   *   }
   * ]
   *
   * and:
   *
   * {
   *   "members": [
   *     {
   *       ...
   *     }
   *   ]
   * }
   */

  if (Array.isArray(data)) {
    return data as MasterAuditRosterPerson[]
  }

  if (
    data &&
    typeof data === "object"
  ) {
    const members =
      (
        data as {
          members?: unknown
        }
      ).members

    if (Array.isArray(members)) {
      return members as MasterAuditRosterPerson[]
    }
  }

  return []
}

/* ─────────────────────────────────────────────
   MASTER AUDIT HELPERS
───────────────────────────────────────────── */

function cleanMasterAuditValue(
  value: unknown,
): string {
  return String(value ?? "").trim()
}

function isBlankMasterAuditValue(
  value: unknown,
): boolean {
  const normalized =
    cleanMasterAuditValue(value).toLowerCase()

  return (
    normalized === "" ||
    normalized === "-" ||
    normalized === "--" ||
    normalized === "—" ||
    normalized === "#" ||
    normalized === "#n/a" ||
    normalized === "n/a" ||
    normalized === "na" ||
    normalized === "null" ||
    normalized === "undefined"
  )
}

function isValidMasterAuditPerson(
  person: {
    callsign?: unknown
    badgeNumber?: unknown
    name?: unknown
    rank?: unknown
    discordId?: unknown
  },
): boolean {
  return (
    !isBlankMasterAuditValue(person.callsign) &&
    !isBlankMasterAuditValue(person.badgeNumber) &&
    !isBlankMasterAuditValue(person.name) &&
    !isBlankMasterAuditValue(person.rank) &&
    !isBlankMasterAuditValue(person.discordId)
  )
}

/* ─────────────────────────────────────────────
   MASTER AUDIT CONFIGURATION
───────────────────────────────────────────── */

const masterAuditActivityDirectory =
  path.join(
    process.cwd(),
    "public",
    "config",
    "imports",
    "activity",
  )

const masterAuditRequirementsDirectory =
  path.join(
    process.cwd(),
    "public",
    "config",
    "requirements",
    "activity",
  )

const masterAuditConfigs = {
  department: {
    label: "Department",

    rosterPath: path.join(
      masterAuditActivityDirectory,
      "roster.json",
    ),

    activityPath: path.join(
      masterAuditActivityDirectory,
      "department.json",
    ),

    requirementsPath: path.join(
      masterAuditRequirementsDirectory,
      "department.json",
    ),
  },

  swat: {
    label: "SWAT",

    rosterPath: path.join(
      masterAuditActivityDirectory,
      "swat-roster.json",
    ),

    activityPath: path.join(
      masterAuditActivityDirectory,
      "swat.json",
    ),

    requirementsPath: path.join(
      masterAuditRequirementsDirectory,
      "swat.json",
    ),
  },

  mtf7: {
    label: "MTF-7",

    rosterPath: path.join(
      masterAuditActivityDirectory,
      "mtf7-roster.json",
    ),

    activityPath: path.join(
      masterAuditActivityDirectory,
      "mtf7.json",
    ),

    requirementsPath: path.join(
      masterAuditRequirementsDirectory,
      "mtf7.json",
    ),
  },

  mcd: {
    label: "MCD",

    rosterPath: path.join(
      masterAuditActivityDirectory,
      "mcd-roster.json",
    ),

    activityPath: path.join(
      masterAuditActivityDirectory,
      "mcd.json",
    ),

    requirementsPath: path.join(
      masterAuditRequirementsDirectory,
      "mcd.json",
    ),
  },

  tru: {
    label: "TRU",

    rosterPath: path.join(
      masterAuditActivityDirectory,
      "tru-roster.json",
    ),

    activityPath: path.join(
      masterAuditActivityDirectory,
      "tru.json",
    ),

    requirementsPath: path.join(
      masterAuditRequirementsDirectory,
      "tru.json",
    ),
  },
} as const

type MasterAuditDivision =
  keyof typeof masterAuditConfigs

/* ─────────────────────────────────────────────
   MASTER AUDIT FILE CHECK
───────────────────────────────────────────── */

async function ensureMasterAuditFileExists(
  filePath: string,
  label: string,
  fileType: string,
): Promise<void> {
  try {
    await fs.access(filePath)
  } catch {
    throw new Error(
      `${label} ${fileType} file does not exist: ${filePath}`,
    )
  }
}

/* ─────────────────────────────────────────────
   MASTER AUDIT ROSTER SYNC
───────────────────────────────────────────── */

/*
 * Every time Master Audit is requested, refresh ALL
 * Master Audit rosters from Google Sheets first.
 *
 * Google Sheet tab
 *        ↓
 * googleRosterSync.ts
 *        ↓
 * JSON roster file
 *
 * Department:
 * GOOGLE_SHEET_ROSTER_IMPORT
 *        ↓
 * roster.json
 *
 * SWAT:
 * GOOGLE_SHEET_SWAT_ROSTER_IMPORT
 *        ↓
 * swat-roster.json
 *
 * MTF-7:
 * GOOGLE_SHEET_MTF7_ROSTER_IMPORT
 *        ↓
 * mtf7-roster.json
 *
 * MCD:
 * GOOGLE_SHEET_MCD_ROSTER_IMPORT
 *        ↓
 * mcd-roster.json
 *
 * TRU:
 * GOOGLE_SHEET_TRU_ROSTER_IMPORT
 *        ↓
 * tru-roster.json
 */

async function syncMasterAuditRosters(): Promise<void> {
  console.log("")
  console.log(
    "====================================",
  )
  console.log(
    "[google-sync] MASTER AUDIT ROSTER SYNC",
  )
  console.log(
    "====================================",
  )

  const result =
    await syncGoogleRosters()

  if (!result?.success) {
    throw new Error(
      result?.error ??
        "Google roster synchronization failed.",
    )
  }

  console.log(
    "[google-sync] All Master Audit rosters synchronized successfully.",
  )
}

/* ─────────────────────────────────────────────
   GET MASTER AUDIT
───────────────────────────────────────────── */

app.get(
  "/api/audit/master/:division",
  async (req, res) => {
    const division =
      String(
        req.params.division ?? "",
      ).toLowerCase() as MasterAuditDivision

    const config =
      masterAuditConfigs[division]

    if (!config) {
      return res.status(404).json({
        error:
          "Unknown master audit division",

        division,
      })
    }

    try {
      console.log("")
      console.log(
        "====================================",
      )
      console.log(
        `[master-audit] Loading ${config.label} audit...`,
      )
      console.log(
        "====================================",
      )

      /* ─────────────────────────────────────────
         SYNC ALL GOOGLE ROSTERS FIRST
      ───────────────────────────────────────── */

      await syncMasterAuditRosters()

      /* ─────────────────────────────────────────
         FILE PATHS
      ───────────────────────────────────────── */

      console.log(
        `[master-audit] Roster file: ${config.rosterPath}`,
      )

      console.log(
        `[master-audit] Activity file: ${config.activityPath}`,
      )

      console.log(
        `[master-audit] Requirements file: ${config.requirementsPath}`,
      )

      /* ─────────────────────────────────────────
         CHECK FILES
      ───────────────────────────────────────── */

      await ensureMasterAuditFileExists(
        config.rosterPath,
        config.label,
        "roster",
      )

      await ensureMasterAuditFileExists(
        config.activityPath,
        config.label,
        "activity",
      )

      await ensureMasterAuditFileExists(
        config.requirementsPath,
        config.label,
        "requirements",
      )

      /* ─────────────────────────────────────────
         LOAD ROSTER
      ───────────────────────────────────────── */

      const rosterData =
        await readMasterAuditJson<unknown>(
          config.rosterPath,
        )

      const roster =
        getMasterAuditRoster(
          rosterData,
        )

      console.log(
        `[master-audit] ${config.label} roster members: ${roster.length}`,
      )

      /* ─────────────────────────────────────────
         FILTER INVALID ROSTER ROWS
      ───────────────────────────────────────── */

      const validRoster =
        roster.filter(
          (person) =>
            isValidMasterAuditPerson(
              person,
            ),
        )

      console.log(
        `[master-audit] Valid ${config.label} roster members: ${validRoster.length}`,
      )

      console.log(
        `[master-audit] Removed ${config.label} roster members: ${
          roster.length -
          validRoster.length
        }`,
      )

      /* ─────────────────────────────────────────
         LOAD ACTIVITY
      ───────────────────────────────────────── */

      const activity =
        await readMasterAuditJson<
          MasterAuditActivity
        >(
          config.activityPath,
        )

      const activityMembers =
        activity.members ?? {}

      console.log(
        `[master-audit] ${config.label} activity members: ${
          Object.keys(
            activityMembers,
          ).length
        }`,
      )

      /* ─────────────────────────────────────────
         LOAD REQUIREMENTS
      ───────────────────────────────────────── */

      const activityRequirements =
        await readMasterAuditJson<
          MasterAuditRequirements
        >(
          config.requirementsPath,
        )

      const requirements =
        activityRequirements.requirements ??
        {}

      console.log(
        `[master-audit] ${config.label} requirements: ${
          Object.keys(
            requirements,
          ).length
        }`,
      )

      /* ─────────────────────────────────────────
         BUILD AUDIT PEOPLE
      ───────────────────────────────────────── */

      const people =
        validRoster.map(
          (person) => {
            const discordId =
              cleanMasterAuditValue(
                person.discordId,
              )

            const rank =
              cleanMasterAuditValue(
                person.rank,
              )

            const normalizedRank =
              rank.toLowerCase()

            const activityMember =
              activityMembers[
                discordId
              ]

            const hours =
              Number(
                activityMember?.hours ?? 0,
              )

            /* ───────────────────────────────────
               FIND RANK REQUIREMENT
            ─────────────────────────────────── */

            const requirementEntry =
              Object.entries(
                requirements,
              ).find(
                (
                  [key, requirement],
                ) => {
                  const normalizedKey =
                    cleanMasterAuditValue(
                      key,
                    ).toLowerCase()

                  const requirementName =
                    cleanMasterAuditValue(
                      (
                        requirement as {
                          name?: unknown
                        }
                      )?.name,
                    ).toLowerCase()

                  return (
                    normalizedKey ===
                      normalizedRank ||
                    requirementName ===
                      normalizedRank
                  )
                },
              )

            const requiredHours =
              Number(
                requirementEntry?.[1]
                  ?.hours ?? 0,
              )

            const compliant =
              hours >= requiredHours

            return {
              callsign:
                cleanMasterAuditValue(
                  person.callsign,
                ),

              badgeNumber:
                cleanMasterAuditValue(
                  person.badgeNumber,
                ),

              name:
                cleanMasterAuditValue(
                  person.name,
                ),

              rank,

              discordId,

              discordUsername:
                cleanMasterAuditValue(
                  (
                    person as {
                      discordUsername?: unknown
                    }
                  ).discordUsername,
                ),

              timeInDept:
                cleanMasterAuditValue(
                  person.timeInDept,
                ),

              timeInRank:
                cleanMasterAuditValue(
                  person.timeInRank,
                ),

              requiredHours,

              hours,

              status:
                compliant
                  ? "COMPLIANT"
                  : "NON-COMPLIANT",
            }
          },
        )

      /* ─────────────────────────────────────────
         CALCULATE TOTALS
      ───────────────────────────────────────── */

      const compliantCount =
        people.filter(
          (person) =>
            person.status ===
            "COMPLIANT",
        ).length

      const nonCompliantCount =
        people.length -
        compliantCount

      console.log(
        `[master-audit] ${config.label} compliant: ${compliantCount}`,
      )

      console.log(
        `[master-audit] ${config.label} non-compliant: ${nonCompliantCount}`,
      )

      /* ─────────────────────────────────────────
         RETURN AUDIT
      ───────────────────────────────────────── */

      return res.json({
        department:
          activity.department ??
          activityRequirements.department ??
          config.label,

        total:
          people.length,

        compliant:
          compliantCount,

        nonCompliant:
          nonCompliantCount,

        people,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error)

      console.error(
        `[master-audit] ${config.label} failed:`,
        error,
      )

      return res.status(500).json({
        error:
          `Failed to load ${config.label} audit`,

        details:
          message,

        division,

        files: {
          roster:
            config.rosterPath,

          activity:
            config.activityPath,

          requirements:
            config.requirementsPath,
        },
      })
    }
  },
)

/* ─────────────────────────────────────────────
   MANUAL GOOGLE ROSTER SYNC
───────────────────────────────────────────── */

/*
 * POST:
 * Manually refresh all Master Audit rosters.
 */

app.post(
  "/api/import/google/rosters",
  async (_req, res) => {
    try {
      await syncMasterAuditRosters()

      return res.json({
        success: true,
        message:
          "All Master Audit rosters synchronized successfully.",
      })
    } catch (error) {
      console.error(
        "[google-sync] Manual Master Audit roster sync failed:",
        error,
      )

      return res.status(500).json({
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Google roster sync failed.",
      })
    }
  },
)

/*
 * GET:
 * Refresh all Master Audit rosters.
 *
 * This can also be called directly by the
 * Master Audit frontend if desired.
 */

app.get(
  "/api/import/google/rosters",
  async (_req, res) => {
    try {
      await syncMasterAuditRosters()

      return res.json({
        success: true,
        message:
          "All Master Audit rosters synchronized successfully.",
      })
    } catch (error) {
      console.error(
        "[google-sync] Master Audit page roster sync failed:",
        error,
      )

      return res.status(500).json({
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Google roster sync failed.",
      })
    }
  },
)


/* ─────────────────────────────────────────────
   Test Endpoint
───────────────────────────────────────────── */

app.get(
  "/api/test",
  (_req, res) => {
    res.json({
      success: true,

      message:
        "MPD backend is running.",
    })
  },
)

/* ─────────────────────────────────────────────
   Start Server
───────────────────────────────────────────── */

app.listen(
  PORT,
  () => {
    console.log("")

    console.log(
      "====================================",
    )

    console.log(
      "       MPD WEBSITE BACKEND",
    )

    console.log(
      "====================================",
    )

    console.log("")

    console.log(
      `API: http://localhost:${PORT}`,
    )

    console.log(
      "Frontend: https://mpd-dashboard-lovat.vercel.app",
    )

    console.log("")

    console.log(
      "Discord OAuth:",
    )

    console.log(
      "https://mpd-dashboard-lovat.vercel.app/api/auth/login",
    )

    console.log("")

    console.log("Test:")

    console.log(
      "https://mpd-dashboard-lovat.vercel.app/api/test",
    )

    console.log("")

    console.log(
      "Department Import:",
    )

    console.log(
      "POST /api/import/activity/department",
    )

    console.log("")
  },
)
