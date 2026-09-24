export const PERMISSIONS = {
  VIEW: "view",
  AUDIT: "audit",
  IMPORT: "import",
  REQUIREMENTS: "requirements",
  ADMIN: "admin",
} as const

export type Permission =
  typeof PERMISSIONS[keyof typeof PERMISSIONS]

/**
 * Emergency/bootstrap administrators. Keep at least one ID here so
 * the site can always be recovered if the editable permission file
 * is accidentally misconfigured.
 */
export const SUPER_ADMIN_IDS = [
  "1314550564389912609",
]

export const RANK_PERMISSIONS: Record<string, Permission[]> = {
  "Officer 1": ["view"],
  "Officer 2": ["view"],
  "Officer 3": ["view", "audit"],

  "Lance Corporal": ["view", "audit"],
  "Corporal": ["view", "audit"],
  "Sergeant": ["view", "audit", "requirements"],

  "Staff Sergeant": ["view", "audit", "requirements"],
  "Master Sergeant": ["view", "audit", "requirements"],

  "2nd Lieutenant": ["view", "audit", "requirements", "import"],
  "1st Lieutenant": ["view", "audit", "requirements", "import"],
  "Captain": ["view", "audit", "requirements", "import"],

  "Major": ["view", "audit", "requirements", "import"],
  "Lieutenant Colonel": ["view", "audit", "requirements", "import"],

  "Colonel": ["view", "audit", "requirements", "import", "admin"],
  "Chief Of Staff": ["view", "audit", "requirements", "import", "admin"],
  "Assistant Chief of Police": ["view", "audit", "requirements", "import", "admin"],
  "Deputy Chief of Police": ["view", "audit", "requirements", "import", "admin"],
  "Chief of Police": ["view", "audit", "requirements", "import", "admin"],
}

export const CALLSIGN_PERMISSIONS: Record<string, Permission[]> = {
  // "SA-01": ["admin"],
}

export const PAGE_PERMISSIONS = {
  dashboard: ["view"],
  masterAudit: ["audit"],
  auditFailures: ["audit"],
  historicalAudits: ["audit"],

  rosterImport: ["import"],
  deptImport: ["import"],
  swatImport: ["import"],
  mtf7Import: ["import"],
  mcdImport: ["import"],
  truImport: ["import"],
  teuImport: ["import"],
  sarImport: ["import"],

  deptRequirements: ["requirements"],
  swatRequirements: ["requirements"],
  mtf7Requirements: ["requirements"],
  mcdRequirements: ["requirements"],
  truRequirements: ["requirements"],
  teuRequirements: ["requirements"],
  sarRequirements: ["requirements"],

  admin: ["admin"],
} as const
