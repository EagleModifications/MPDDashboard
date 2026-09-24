import { google } from "googleapis"

export type RosterUser = {
  callsign: string
  badgeNumber: string
  name: string
  rank: string
  timeInDept: string
  timeInRank: string
  discordId: string
  status: string
}

export async function findRosterUser(
  discordId: string,
): Promise<RosterUser | null> {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:
        process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ],
  })

  const sheets = google.sheets({
    version: "v4",
    auth,
  })

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${process.env.GOOGLE_SHEET_ROSTER_IMPORT}!A:H`,
  })

  const rows = result.data.values ?? []

  for (const row of rows.slice(1)) {
    if (String(row[6] ?? "").trim() === discordId) {
      return {
        callsign: String(row[0] ?? ""),
        badgeNumber: String(row[1] ?? ""),
        name: String(row[2] ?? ""),
        rank: String(row[3] ?? ""),
        timeInDept: String(row[4] ?? ""),
        timeInRank: String(row[5] ?? ""),
        discordId: String(row[6] ?? ""),
        status: String(row[7] ?? ""),
      }
    }
  }

  return null
}