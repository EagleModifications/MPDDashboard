import fs from "node:fs/promises"
import path from "node:path"

import { google } from "googleapis"

/* ─────────────────────────────────────────────
   Google Sheets Configuration
───────────────────────────────────────────── */

const spreadsheetId =
  process.env.GOOGLE_SHEET_ID

const serviceAccountEmail =
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL

const privateKey =
  process.env.GOOGLE_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  )

/* ─────────────────────────────────────────────
   Division Configuration
───────────────────────────────────────────── */

type DivisionConfig = {
  id: string
  label: string
  rosterEnv: string
  outputFile: string
}

const divisionConfigs: DivisionConfig[] = [
  {
    id: "department",
    label: "Department",
    rosterEnv:
      "GOOGLE_SHEET_ROSTER_IMPORT",
    outputFile: "roster.json",
  },

  {
    id: "swat",
    label: "SWAT",
    rosterEnv:
      "GOOGLE_SHEET_SWAT_ROSTER_IMPORT",
    outputFile: "swat-roster.json",
  },

  {
    id: "mtf7",
    label: "MTF-7",
    rosterEnv:
      "GOOGLE_SHEET_MTF7_ROSTER_IMPORT",
    outputFile: "mtf7-roster.json",
  },

  {
    id: "mcd",
    label: "MCD",
    rosterEnv:
      "GOOGLE_SHEET_MCD_ROSTER_IMPORT",
    outputFile: "mcd-roster.json",
  },

  {
    id: "tru",
    label: "TRU",
    rosterEnv:
      "GOOGLE_SHEET_TRU_ROSTER_IMPORT",
    outputFile: "tru-roster.json",
  },
]

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export type RosterMember = {
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

/* ─────────────────────────────────────────────
   Paths
───────────────────────────────────────────── */

const importsDirectory =
  path.join(
    process.cwd(),
    "public",
    "config",
    "imports",
    "activity",
  )

/* ─────────────────────────────────────────────
   Validation
───────────────────────────────────────────── */

function validateGoogleConfig(): void {
  if (!spreadsheetId) {
    throw new Error(
      "GOOGLE_SHEET_ID is not configured.",
    )
  }

  if (!serviceAccountEmail) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL is not configured.",
    )
  }

  if (!privateKey) {
    throw new Error(
      "GOOGLE_PRIVATE_KEY is not configured.",
    )
  }

  for (const division of divisionConfigs) {
    const sheetName =
      process.env[
        division.rosterEnv
      ]

    if (!sheetName) {
      throw new Error(
        `${division.rosterEnv} is not configured.`,
      )
    }

    console.log(
      `[google-sync] ${division.label} → "${sheetName}" → ${division.outputFile}`,
    )
  }
}

/* ─────────────────────────────────────────────
   Google Sheets Client
───────────────────────────────────────────── */

function getGoogleSheetsClient() {
  validateGoogleConfig()

  const auth =
    new google.auth.GoogleAuth({
      credentials: {
        client_email:
          serviceAccountEmail,
        private_key:
          privateKey,
      },

      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
      ],
    })

  return google.sheets({
    version: "v4",
    auth,
  })
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function normalizeHeader(
  value: unknown,
): string {
  return String(
    value ?? "",
  )
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      "",
    )
}

function getColumn(
  headers: string[],
  possibleNames: string[],
): number {
  const normalizedNames =
    possibleNames.map(
      normalizeHeader,
    )

  return headers.findIndex(
    (header) =>
      normalizedNames.includes(
        normalizeHeader(header),
      ),
  )
}

function getValue(
  row: unknown[],
  index: number,
): string {
  if (index < 0) {
    return ""
  }

  return String(
    row[index] ?? "",
  ).trim()
}

/* ─────────────────────────────────────────────
   Read Google Sheet
───────────────────────────────────────────── */

async function getSheetValues(
  sheetName: string,
): Promise<unknown[][]> {
  const sheets =
    getGoogleSheetsClient()

  console.log(
    `[google-sync] Reading Google Sheet "${sheetName}"...`,
  )

  try {
    const response =
      await sheets.spreadsheets.values.get({
        spreadsheetId:
          spreadsheetId!,
        range:
          `'${sheetName}'!A:Z`,
      })

    const rows =
      response.data.values ?? []

    console.log(
      `[google-sync] Sheet "${sheetName}" returned ${rows.length} rows.`,
    )

    if (rows.length > 0) {
      console.log(
        `[google-sync] Headers for "${sheetName}":`,
        rows[0],
      )
    }

    if (rows.length > 1) {
      console.log(
        `[google-sync] First data row for "${sheetName}":`,
        rows[1],
      )
    }

    return rows
  } catch (error) {
    throw new Error(
      `Failed to read Google Sheet "${sheetName}": ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    )
  }
}

/* ─────────────────────────────────────────────
   Validate Headers
───────────────────────────────────────────── */

function validateHeaders(
  rows: unknown[][],
  sheetName: string,
): void {
  if (rows.length === 0) {
    throw new Error(
      `Google Sheet "${sheetName}" is empty.`,
    )
  }

  const headers =
    rows[0].map(String)

  console.log(
    `[google-sync] Validating headers for "${sheetName}"...`,
  )

  const requiredColumns = [
    {
      name: "Callsign",

      alternatives: [
        "Callsign",
        "Call Sign",
        "Callsign Number",
      ],
    },

    {
      name: "Badge Number",

      alternatives: [
        "Badge Number",
        "Badge",
        "BadgeNumber",
        "Badge #",
        "Badge#",
      ],
    },

    {
      name: "Name",

      alternatives: [
        "Name",
        "Full Name",
        "Officer Name",
      ],
    },

    {
      name: "Rank",

      alternatives: [
        "Rank",
        "Current Rank",
      ],
    },

    {
      name: "Discord ID",

      alternatives: [
        "Discord ID",
        "DiscordID",
        "Discord",
        "Discord Id",
      ],
    },
  ]

  const missingColumns =
    requiredColumns
      .filter(
        (column) =>
          getColumn(
            headers,
            column.alternatives,
          ) === -1,
      )
      .map(
        (column) =>
          column.name,
      )

  if (
    missingColumns.length > 0
  ) {
    throw new Error(
      `Google Sheet "${sheetName}" is missing required columns: ${missingColumns.join(
        ", ",
      )}`,
    )
  }

  console.log(
    `[google-sync] ✓ Required headers found for "${sheetName}".`,
  )
}

/* ─────────────────────────────────────────────
   Convert Sheet Rows
───────────────────────────────────────────── */

function convertRowsToRoster(
  rows: unknown[][],
  sheetName: string,
): RosterMember[] {
  if (rows.length <= 1) {
    console.log(
      `[google-sync] "${sheetName}" has no data rows.`,
    )

    return []
  }

  const headers =
    rows[0].map(String)

  const callsignColumn =
    getColumn(
      headers,
      [
        "Callsign",
        "Call Sign",
        "Callsign Number",
      ],
    )

  const badgeColumn =
    getColumn(
      headers,
      [
        "Badge Number",
        "Badge",
        "BadgeNumber",
        "Badge #",
        "Badge#",
      ],
    )

  const nameColumn =
    getColumn(
      headers,
      [
        "Name",
        "Full Name",
        "Officer Name",
      ],
    )

  const rankColumn =
    getColumn(
      headers,
      [
        "Rank",
        "Current Rank",
      ],
    )

  const timeInDeptColumn =
    getColumn(
      headers,
      [
        "Time In Dept",
        "Time In Department",
        "TimeInDept",
        "Department Time",
        "Dept Time",
      ],
    )

  const timeInRankColumn =
    getColumn(
      headers,
      [
        "Time In Rank",
        "TimeInRank",
        "Rank Time",
      ],
    )

  const discordIdColumn =
    getColumn(
      headers,
      [
        "Discord ID",
        "DiscordID",
        "Discord",
        "Discord Id",
      ],
    )

  const statusColumn =
    getColumn(
      headers,
      [
        "Status",
        "Department Status",
      ],
    )

  console.log(
    `[google-sync] Column mapping for "${sheetName}":`,
    {
      callsign: callsignColumn,
      badgeNumber: badgeColumn,
      name: nameColumn,
      rank: rankColumn,
      timeInDept: timeInDeptColumn,
      timeInRank: timeInRankColumn,
      discordId: discordIdColumn,
      status: statusColumn,
    },
  )

  const members =
    rows
      .slice(1)
      .filter(
        (row) =>
          row.some(
            (value) =>
              String(
                value ?? "",
              ).trim() !== "",
          ),
      )
      .map(
        (row) => ({
          callsign:
            getValue(
              row,
              callsignColumn,
            ),

          badgeNumber:
            getValue(
              row,
              badgeColumn,
            ),

          name:
            getValue(
              row,
              nameColumn,
            ),

          rank:
            getValue(
              row,
              rankColumn,
            ),

          timeInDept:
            getValue(
              row,
              timeInDeptColumn,
            ),

          timeInRank:
            getValue(
              row,
              timeInRankColumn,
            ),

          discordId:
            getValue(
              row,
              discordIdColumn,
            ),

          status:
            getValue(
              row,
              statusColumn,
            ),
        }),
      )

  console.log(
    `[google-sync] Converted ${members.length} roster members from "${sheetName}".`,
  )

  if (members.length > 0) {
    console.log(
      `[google-sync] First converted member:`,
      members[0],
    )
  }

  return members
}

/* ─────────────────────────────────────────────
   Import One Roster
───────────────────────────────────────────── */

async function importRoster(
  division: DivisionConfig,
  sheetName: string,
): Promise<RosterMember[]> {
  console.log("")
  console.log(
    "─────────────────────────────────────────────",
  )

  console.log(
    `[google-sync] Importing ${division.label}`,
  )

  console.log(
    `[google-sync] Sheet: ${sheetName}`,
  )

  console.log(
    `[google-sync] Output: ${division.outputFile}`,
  )

  const rows =
    await getSheetValues(
      sheetName,
    )

  console.log(
    `[google-sync] ${division.label}: ${rows.length} rows received.`,
  )

  validateHeaders(
    rows,
    sheetName,
  )

  const members =
    convertRowsToRoster(
      rows,
      sheetName,
    )

  console.log(
    `[google-sync] ${division.label}: ${members.length} members converted.`,
  )

  return members
}

/* ─────────────────────────────────────────────
   Write Roster JSON
───────────────────────────────────────────── */

async function writeRosterFile(
  filePath: string,
  members: RosterMember[],
): Promise<void> {
  await fs.mkdir(
    importsDirectory,
    {
      recursive: true,
    },
  )

  const data: RosterImport = {
    members,
  }

  const json =
    JSON.stringify(
      data,
      null,
      2,
    )

  await fs.writeFile(
    filePath,
    json,
    "utf8",
  )

  console.log(
    `[google-sync] JSON written: ${filePath}`,
  )

  console.log(
    `[google-sync] JSON member count: ${members.length}`,
  )
}

/* ─────────────────────────────────────────────
   Sync All Rosters
───────────────────────────────────────────── */

export async function syncGoogleRosters() {
  const startedAt =
    Date.now()

  console.log("")
  console.log(
    "====================================",
  )
  console.log(
    "       GOOGLE ROSTER SYNC",
  )
  console.log(
    "====================================",
  )

  try {
    validateGoogleConfig()

    const results: Record<
      string,
      {
        sheet: string
        file: string
        count: number
      }
    > = {}

    for (
      const division of
        divisionConfigs
    ) {
      const sheetName =
        process.env[
          division.rosterEnv
        ]

      if (!sheetName) {
        throw new Error(
          `${division.rosterEnv} is not configured.`,
        )
      }

      const members =
        await importRoster(
          division,
          sheetName,
        )

      const filePath =
        path.join(
          importsDirectory,
          division.outputFile,
        )

      await writeRosterFile(
        filePath,
        members,
      )

      results[
        division.id
      ] = {
        sheet:
          sheetName,
        file:
          division.outputFile,
        count:
          members.length,
      }

      console.log(
        `[google-sync] ✓ ${division.label}: ${members.length} members → ${division.outputFile}`,
      )
    }

    const duration =
      Date.now() -
      startedAt

    console.log("")
    console.log(
      `[google-sync] Completed in ${duration}ms`,
    )

    console.log(
      "====================================",
    )
    console.log("")

    return {
      success: true,

      divisions:
        results,

      updatedAt:
        new Date().toISOString(),

      duration,
    }
  } catch (error) {
    console.error(
      "[google-sync] Failed:",
      error,
    )

    throw error
  }
}

/* ─────────────────────────────────────────────
   Test Google Connection
───────────────────────────────────────────── */

export async function testGoogleRosterConnection() {
  validateGoogleConfig()

  const results: Record<
    string,
    {
      sheet: string
      rows: number
      headers: unknown[]
    }
  > = {}

  for (
    const division of
      divisionConfigs
  ) {
    const sheetName =
      process.env[
        division.rosterEnv
      ]

    if (!sheetName) {
      throw new Error(
        `${division.rosterEnv} is not configured.`,
      )
    }

    const rows =
      await getSheetValues(
        sheetName,
      )

    results[
      division.id
    ] = {
      sheet:
        sheetName,

      rows:
        rows.length,

      headers:
        rows[0] ?? [],
    }
  }

  return {
    success: true,

    divisions:
      results,
  }
}
