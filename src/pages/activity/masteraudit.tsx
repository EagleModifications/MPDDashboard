import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Loader2,
  Search,
  XCircle,
} from "lucide-react"

import DashboardLayout from "@/components/dashboard/DashboardLayout"
import { getSession, type User } from "@/lib/auth"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Input } from "@/components/ui/input"

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */

type AuditStatus =
  | "COMPLIANT"
  | "NON-COMPLIANT"
  | string

type AuditPerson = {
  callsign: string
  badgeNumber: string
  name: string
  rank: string
  discordId: string

  discordUsername?: string

  timeInDept?: string
  timeInRank?: string

  requiredHours?: number
  hours?: number
  status?: AuditStatus
}

type AuditResponse = {
  department?: string
  total?: number
  compliant?: number
  nonCompliant?: number
  people?: AuditPerson[]
}

type RankConfig = {
  id: string
  name: string
}

type RequirementsConfig = {
  department?: string
  requirements?: Record<
    string,
    {
      name?: string
      hours?: number
    }
  >
}

type AuditDivision =
  | "department"
  | "swat"
  | "mtf7"
  | "mcd"
  | "tru"

type AuditTab = AuditDivision

type DivisionConfig = {
  label: string
  endpoint: string
  rankConfigUrl: string
  requirementsConfigUrl: string
}

/* ─────────────────────────────────────────────
   DIVISION CONFIGURATION
───────────────────────────────────────────── */

const divisionConfigs: Record<
  AuditDivision,
  DivisionConfig
> = {
  department: {
    label: "Department",
    endpoint:
      "/api/audit/master/department",
    rankConfigUrl:
      "/config/ranks/department.json",
    requirementsConfigUrl:
      "/config/requirements/activity/department.json",
  },

  swat: {
    label: "SWAT",
    endpoint:
      "/api/audit/master/swat",
    rankConfigUrl:
      "/config/ranks/swat.json",
    requirementsConfigUrl:
      "/config/requirements/activity/swat.json",
  },

  mtf7: {
    label: "MTF-7",
    endpoint:
      "/api/audit/master/mtf7",
    rankConfigUrl:
      "/config/ranks/mtf7.json",
    requirementsConfigUrl:
      "/config/requirements/activity/mtf7.json",
  },

  mcd: {
    label: "MCD",
    endpoint:
      "/api/audit/master/mcd",
    rankConfigUrl:
      "/config/ranks/mcd.json",
    requirementsConfigUrl:
      "/config/requirements/activity/mcd.json",
  },

  tru: {
    label: "TRU",
    endpoint:
      "/api/audit/master/tru",
    rankConfigUrl:
      "/config/ranks/tru.json",
    requirementsConfigUrl:
      "/config/requirements/activity/tru.json",
  },
}

/* ─────────────────────────────────────────────
   TABS
───────────────────────────────────────────── */

const tabs: {
  id: AuditTab
  label: string
}[] = [
  {
    id: "department",
    label: "Department",
  },
  {
    id: "swat",
    label: "SWAT",
  },
  {
    id: "mtf7",
    label: "MTF-7",
  },
  {
    id: "mcd",
    label: "MCD",
  },
  {
    id: "tru",
    label: "TRU",
  },
]

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

function cleanValue(
  value: unknown,
): string {
  return String(
    value ?? "",
  ).trim()
}

function isInvalidValue(
  value: unknown,
): boolean {
  const normalized =
    cleanValue(value).toLowerCase()

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

function hasValidIdentity(
  person: AuditPerson,
): boolean {
  return (
    !isInvalidValue(
      person.callsign,
    ) &&
    !isInvalidValue(
      person.badgeNumber,
    ) &&
    !isInvalidValue(
      person.name,
    ) &&
    !isInvalidValue(
      person.rank,
    ) &&
    !isInvalidValue(
      person.discordId,
    )
  )
}

function isValidAuditPerson(
  person: AuditPerson,
): boolean {
  return hasValidIdentity(
    person,
  )
}

function filterValidPeople(
  people: AuditPerson[] | undefined,
): AuditPerson[] {
  if (!Array.isArray(people)) {
    return []
  }

  return people.filter(
    isValidAuditPerson,
  )
}

function formatHours(
  value?: number,
): string {
  const hours =
    Number(value ?? 0)

  if (
    !Number.isFinite(hours)
  ) {
    return "0.00"
  }

  return hours.toFixed(2)
}

function getDiscordUsername(
  person: AuditPerson,
  user: User | null,
): string {
  if (
    person.discordUsername &&
    !isInvalidValue(
      person.discordUsername,
    )
  ) {
    return person.discordUsername
  }

  if (
    user?.discordId ===
    person.discordId
  ) {
    return user.username
  }

  return "Unknown"
}

function getRankId(
  rankName: string,
  ranks: RankConfig[],
): string | undefined {
  const normalizedRank =
    rankName
      .trim()
      .toLowerCase()

  const rank =
    ranks.find(
      (entry) =>
        entry.name
          .trim()
          .toLowerCase() ===
        normalizedRank,
    )

  return rank?.id
}

function getRequiredHours(
  rankName: string,
  ranks: RankConfig[],
  requirements: RequirementsConfig,
): number {
  const rankId =
    getRankId(
      rankName,
      ranks,
    )

  if (rankId) {
    const configuredHours =
      requirements
        .requirements?.[rankId]
        ?.hours

    if (
      configuredHours !==
      undefined
    ) {
      return Number(
        configuredHours,
      )
    }
  }

  const normalizedRank =
    rankName
      .trim()
      .toLowerCase()

  const fallbackEntry =
    Object.entries(
      requirements.requirements ??
        {},
    ).find(
      ([key, requirement]) => {
        const normalizedKey =
          key
            .trim()
            .toLowerCase()

        const requirementName =
          String(
            requirement?.name ??
              "",
          )
            .trim()
            .toLowerCase()

        return (
          normalizedKey ===
            normalizedRank ||
          requirementName ===
            normalizedRank
        )
      },
    )

  return Number(
    fallbackEntry?.[1]?.hours ??
      0,
  )
}

function getComplianceState(
  hours: number,
  requiredHours: number,
): "compliant" | "close" | "non-compliant" {
  if (
    hours >=
    requiredHours
  ) {
    return "compliant"
  }

  if (
    requiredHours > 0 &&
    hours >=
      requiredHours - 1
  ) {
    return "close"
  }

  return "non-compliant"
}

/* ─────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────── */

function StatusBadge({
  hours,
  requiredHours,
}: {
  hours: number
  requiredHours: number
}) {
  const state =
    getComplianceState(
      hours,
      requiredHours,
    )

  if (
    state === "compliant"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-500">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>COMPLIANT</span>
      </span>
    )
  }

  if (
    state === "close"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-500">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>CLOSE</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-red-500/25 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-500">
      <XCircle className="h-3.5 w-3.5 shrink-0" />
      <span>NON-COMPLIANT</span>
    </span>
  )
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */

export default function MasterAudit() {
  const [user, setUser] =
    useState<User | null>(null)

  const [activeTab, setActiveTab] =
    useState<AuditTab>("department")

  const activeDivision: AuditDivision =
    activeTab

  const activeConfig =
    divisionConfigs[
      activeDivision
    ]

  const [people, setPeople] =
    useState<AuditPerson[]>([])

  const [ranks, setRanks] =
    useState<RankConfig[]>([])

  const [requirements, setRequirements] =
    useState<RequirementsConfig>({})

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const [search, setSearch] =
    useState("")

  const [copiedId, setCopiedId] =
    useState<string | null>(null)

  const [reloadKey, setReloadKey] =
    useState(0)

  /* ─────────────────────────────────────────
     LOAD AUDIT
  ───────────────────────────────────────── */

  const loadDivision =
    useCallback(
      async () => {
        try {
          setLoading(true)
          setError(null)

          const [
            auditResponse,
            sessionUser,
            rankResponse,
            requirementsResponse,
          ] = await Promise.all([
            fetch(
              activeConfig.endpoint,
              {
                credentials:
                  "include",
                cache: "no-store",
              },
            ),

            getSession(),

            fetch(
              activeConfig.rankConfigUrl,
              {
                credentials:
                  "include",
                cache: "no-store",
              },
            ),

            fetch(
              activeConfig.requirementsConfigUrl,
              {
                credentials:
                  "include",
                cache: "no-store",
              },
            ),
          ])

          if (
            !auditResponse.ok
          ) {
            const auditError =
              await auditResponse
                .json()
                .catch(
                  () => null,
                )

            throw new Error(
              auditError?.details ??
                auditError?.error ??
                `Failed to load ${activeConfig.label} audit (${auditResponse.status})`,
            )
          }

          if (
            !rankResponse.ok
          ) {
            throw new Error(
              `Failed to load ${activeConfig.label} rank configuration (${rankResponse.status})`,
            )
          }

          if (
            !requirementsResponse.ok
          ) {
            throw new Error(
              `Failed to load ${activeConfig.label} requirements (${requirementsResponse.status})`,
            )
          }

          const auditData =
            (await auditResponse.json()) as AuditResponse

          const rankData =
            (await rankResponse.json()) as
              | RankConfig[]
              | {
                  ranks?: RankConfig[]
                }

          const requirementsData =
            (await requirementsResponse.json()) as
              RequirementsConfig

          const loadedRanks =
            Array.isArray(rankData)
              ? rankData
              : Array.isArray(
                    rankData.ranks,
                  )
                ? rankData.ranks
                : []

          const loadedPeople =
            filterValidPeople(
              auditData.people,
            )

          console.log(
            `[master-audit] ${activeConfig.label}: backend returned ${
              auditData.people?.length ??
              0
            } people, frontend accepted ${
              loadedPeople.length
            }`,
          )

          setPeople(
            loadedPeople,
          )

          setRanks(
            loadedRanks,
          )

          setRequirements(
            requirementsData,
          )

          setUser(
            sessionUser,
          )
        } catch (err) {
          console.error(
            `[master-audit] Failed to load ${activeConfig.label}:`,
            err,
          )

          setPeople([])

          setError(
            err instanceof Error
              ? err.message
              : `Failed to load ${activeConfig.label} audit.`,
          )
        } finally {
          setLoading(false)
        }
      },
      [
        activeConfig.endpoint,
        activeConfig.label,
        activeConfig.rankConfigUrl,
        activeConfig.requirementsConfigUrl,
      ],
    )

  useEffect(() => {
    void loadDivision()
  }, [
    loadDivision,
    reloadKey,
  ])

  /* ─────────────────────────────────────────
     SEARCH
  ───────────────────────────────────────── */

  const filteredPeople =
    useMemo(() => {
      const validPeople =
        filterValidPeople(
          people,
        )

      const query =
        search
          .trim()
          .toLowerCase()

      if (!query) {
        return validPeople
      }

      return validPeople.filter(
        (person) => {
          const username =
            getDiscordUsername(
              person,
              user,
            )

          return [
            person.callsign,
            person.badgeNumber,
            person.name,
            person.rank,
            person.discordId,
            username,
          ].some(
            (value) =>
              cleanValue(
                value,
              )
                .toLowerCase()
                .includes(query),
          )
        },
      )
    }, [
      people,
      search,
      user,
    ])

  /* ─────────────────────────────────────────
     COPY DISCORD ID
  ───────────────────────────────────────── */

  async function copyDiscordId(
    discordId: string,
  ) {
    try {
      await navigator.clipboard.writeText(
        discordId,
      )

      setCopiedId(discordId)

      window.setTimeout(() => {
        setCopiedId(
          (current) =>
            current ===
            discordId
              ? null
              : current,
        )
      }, 1500)
    } catch (error) {
      console.error(
        "Failed to copy Discord ID:",
        error,
      )
    }
  }

  /* ─────────────────────────────────────────
     DISCORD CELL
  ───────────────────────────────────────── */

  function renderDiscordCell(
    person: AuditPerson,
  ) {
    const username =
      getDiscordUsername(
        person,
        user,
      )

    const isCopied =
      copiedId ===
      person.discordId

    return (
      <TableCell className="max-w-[150px] overflow-hidden px-2 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            asChild
          >
            <button
              type="button"
              className="flex max-w-full flex-col text-left outline-none"
            >
              <span className="max-w-full truncate font-semibold text-blue-500 transition-colors hover:text-blue-400">
                {username}
              </span>

              <span className="max-w-full truncate font-mono text-xs font-medium text-blue-500/70 transition-colors hover:text-blue-400">
                ({person.discordId})
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-44"
          >
            <DropdownMenuItem
              onClick={() =>
                copyDiscordId(
                  person.discordId,
                )
              }
              className="cursor-pointer"
            >
              {isCopied ? (
                <Check className="mr-2 h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}

              {isCopied
                ? "Copied"
                : "Copy ID"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    )
  }

  /* ─────────────────────────────────────────
     COMMON CELLS
  ───────────────────────────────────────── */

  function renderCommonCells(
    person: AuditPerson,
  ) {
    return (
      <>
        <TableCell className="max-w-[90px] truncate px-2 py-2 text-xs font-semibold">
          {person.callsign || "—"}
        </TableCell>

        <TableCell className="max-w-[60px] truncate px-2 py-2 text-xs">
          {person.badgeNumber || "—"}
        </TableCell>

        <TableCell className="max-w-[130px] truncate px-2 py-2 text-xs font-medium">
          {person.name || "—"}
        </TableCell>

        <TableCell className="max-w-[140px] truncate px-2 py-2 text-xs">
          {person.rank || "—"}
        </TableCell>

        {renderDiscordCell(
          person,
        )}
      </>
    )
  }

  /* ─────────────────────────────────────────
     REQUIRED HOURS
  ───────────────────────────────────────── */

  function getPersonRequiredHours(
    person: AuditPerson,
  ): number {
    return getRequiredHours(
      person.rank,
      ranks,
      requirements,
    )
  }

  /* ─────────────────────────────────────────
     AUDIT ROWS
  ───────────────────────────────────────── */

  function renderAuditRows() {
    return filteredPeople.map(
      (person) => {
        const requiredHours =
          getPersonRequiredHours(
            person,
          )

        const hours =
          Number(
            person.hours ?? 0,
          )

        const state =
          getComplianceState(
            hours,
            requiredHours,
          )

        const rowClass =
          state === "compliant"
            ? "hover:bg-emerald-500/[0.03]"
            : state === "close"
              ? "hover:bg-amber-500/[0.03]"
              : "hover:bg-red-500/[0.03]"

        const hoursClass =
          state === "compliant"
            ? "font-semibold text-emerald-500"
            : state === "close"
              ? "font-semibold text-amber-500"
              : "font-semibold text-red-500"

        return (
          <TableRow
            key={`${activeDivision}-${person.discordId}-${person.badgeNumber}`}
            className={`transition-colors ${rowClass}`}
          >
            {renderCommonCells(
              person,
            )}

            <TableCell className="max-w-[90px] truncate px-2 py-2 text-xs">
              {person.timeInDept ||
                "—"}
            </TableCell>

            <TableCell className="max-w-[90px] truncate px-2 py-2 text-xs">
              {person.timeInRank ||
                "—"}
            </TableCell>

            <TableCell className="px-2 py-2 text-xs">
              <span className="font-semibold text-blue-500">
                {formatHours(
                  requiredHours,
                )}
              </span>
            </TableCell>

            <TableCell className="px-2 py-2 text-xs">
              <span
                className={
                  hoursClass
                }
              >
                {formatHours(
                  hours,
                )}
              </span>
            </TableCell>

            <TableCell className="px-2 py-2">
              <StatusBadge
                hours={hours}
                requiredHours={
                  requiredHours
                }
              />
            </TableCell>
          </TableRow>
        )
      },
    )
  }

  /* ─────────────────────────────────────────
     AUDIT TABLE
  ───────────────────────────────────────── */

  function renderAuditTable() {
    const label =
      activeConfig.label.toUpperCase()

    return (
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[8%] px-2 py-2 text-[10px] font-semibold">
              CALLSIGN
            </TableHead>

            <TableHead className="w-[5%] px-2 py-2 text-[10px] font-semibold">
              BADGE
            </TableHead>

            <TableHead className="w-[11%] px-2 py-2 text-[10px] font-semibold">
              NAME
            </TableHead>

            <TableHead className="w-[12%] px-2 py-2 text-[10px] font-semibold">
              RANK
            </TableHead>

            <TableHead className="w-[16%] px-2 py-2 text-[10px] font-semibold">
              DISCORD
            </TableHead>

            <TableHead className="w-[9%] px-2 py-2 text-[10px] font-semibold">
              TIME IN DEPT
            </TableHead>

            <TableHead className="w-[9%] px-2 py-2 text-[10px] font-semibold">
              TIME IN RANK
            </TableHead>

            <TableHead className="w-[9%] px-2 py-2 text-[10px] font-semibold">
              {label} REQUIRED
            </TableHead>

            <TableHead className="w-[8%] px-2 py-2 text-[10px] font-semibold">
              {label} HOURS
            </TableHead>

            <TableHead className="w-[13%] px-2 py-2 text-[10px] font-semibold">
              {label} STATUS
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {renderAuditRows()}
        </TableBody>
      </Table>
    )
  }

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 w-full flex-col gap-6 overflow-hidden p-6">

        {/* HEADER */}

        <div className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10">
                <ClipboardCheck className="h-5 w-5 text-blue-500" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Master Audit
                </h1>

                <p className="text-sm text-muted-foreground">
                  {activeConfig.label}{" "}
                  activity compliance
                </p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium">
              {user?.username ??
                "Unknown"}
            </p>

            <p className="font-mono text-xs text-muted-foreground">
              {user?.discordId ??
                "Not authenticated"}
            </p>
          </div>
        </div>

        {/* TABS */}

        <div className="flex w-fit shrink-0 items-center gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
          {tabs.map(
            (tab) => {
              const active =
                activeTab ===
                tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (
                      activeTab ===
                      tab.id
                    ) {
                      return
                    }

                    setSearch("")
                    setError(null)
                    setActiveTab(
                      tab.id,
                    )
                  }}
                  className={
                    active
                      ? "rounded-md bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-500 shadow-sm transition-colors"
                      : "rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  }
                >
                  {tab.label}
                </button>
              )
            },
          )}
        </div>

        {/* LEGEND */}

        <div className="flex shrink-0 flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            Compliance:
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Compliant
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Within 1 hour
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            Non-compliant
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Required
          </span>
        </div>

        {/* SEARCH */}

        <div className="flex shrink-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder={`Search ${activeConfig.label} roster...`}
              className="pl-9"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {
                filteredPeople.length
              }
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {
                filterValidPeople(
                  people,
                ).length
              }
            </span>{" "}
            {activeConfig.label}{" "}
            personnel
          </div>
        </div>

        {/* AUDIT CONTENT */}

        <div className="min-h-0 w-full flex-1 overflow-auto rounded-xl border border-border/60 bg-card">
          {loading ? (
            <div className="flex h-full min-h-[300px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />

                <p className="text-sm">
                  Syncing{" "}
                  {activeConfig.label}{" "}
                  roster and loading
                  audit...
                </p>

                <p className="text-xs text-muted-foreground/70">
                  Refreshing Google
                  Sheets data
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full min-h-[300px] items-center justify-center p-6">
              <div className="flex max-w-md flex-col items-center text-center">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>

                <h2 className="font-semibold">
                  Failed to load{" "}
                  {activeConfig.label}{" "}
                  audit
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setPeople([])

                    setReloadKey(
                      (value) =>
                        value + 1,
                    )
                  }}
                  className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : filteredPeople.length ===
            0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center">
              <div className="text-center">
                <Search className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />

                <p className="font-medium">
                  No personnel found
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  No valid{" "}
                  {activeConfig.label}{" "}
                  personnel match your
                  search.
                </p>
              </div>
            </div>
          ) : (
            renderAuditTable()
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
