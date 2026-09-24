import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  Clock3,
  Shield,
  Users,
  XCircle,
} from "lucide-react"

import DashboardLayout from "@/components/dashboard/DashboardLayout"

type Person = {
  callsign: string
  name: string
  rank: string
  hours: number
  timeInRank: string
  timeInDepartment: string
}

type DashboardData = {
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

  departmentTop: Person[]

  divisionTop: {
    swat: Person[]
    mtf7: Person[]
    mcd: Person[]
    tru: Person[]
    teu: Person[]
    sar: Person[]
  }

  promotionWatchlist: Person[]
}

type AuditStatus =
  | "COMPLIANT"
  | "NON-COMPLIANT"
  | "EXEMPT"
  | string

type AuditPerson = {
  callsign?: string
  badgeNumber?: string
  name?: string
  rank?: string
  discordId?: string
  discordUsername?: string
  status?: AuditStatus
}

type AuditResponse = {
  department?: string
  total?: number
  compliant?: number
  nonCompliant?: number
  exempt?: number
  people?: AuditPerson[]
}

type AuditEndpoint =
  | "department"
  | "swat"
  | "mtf7"
  | "mcd"
  | "tru"

const auditEndpoints: Record<AuditEndpoint, string> = {
  department: "/api/audit/master/department",
  swat: "/api/audit/master/swat",
  mtf7: "/api/audit/master/mtf7",
  mcd: "/api/audit/master/mcd",
  tru: "/api/audit/master/tru",
}

const emptyData: DashboardData = {
  personnel: {
    total: 0,
    compliant: 0,
    nonCompliant: 0,
    exempt: 0,
    compliance: 0,
  },

  command: {
    highCommand: 0,
    trialHighCommand: 0,
    lowCommand: 0,
    supervisors: 0,
    patrol: 0,
    cadets: 0,
  },

  divisions: {
    swat: 0,
    mtf7: 0,
    mcd: 0,
    tru: 0,
    teu: 0,
    sar: 0,
  },

  alerts: {
    departmentFailures: 0,
    divisionFailures: 0,
  },

  departmentTop: [],

  divisionTop: {
    swat: [],
    mtf7: [],
    mcd: [],
    tru: [],
    teu: [],
    sar: [],
  },

  promotionWatchlist: [],
}

/* ─────────────────────────────────────────────
   Invalid / Unknown Values
───────────────────────────────────────────── */

function isInvalidValue(value: unknown) {
  if (value === null || value === undefined) {
    return true
  }

  const normalized = String(value)
    .trim()
    .toLowerCase()

  return (
    normalized === "" ||
    normalized === "-" ||
    normalized === "—" ||
    normalized === "unknown" ||
    normalized === "n/a" ||
    normalized === "null" ||
    normalized === "undefined"
  )
}

function isValidPerson(person: Person) {
  return (
    !isInvalidValue(person.callsign) &&
    !isInvalidValue(person.name) &&
    !isInvalidValue(person.rank)
  )
}

function filterValidPeople(people: Person[]) {
  return people.filter(isValidPerson)
}

function isValidAuditPerson(person: AuditPerson) {
  return (
    !isInvalidValue(person.name) &&
    !isInvalidValue(person.rank)
  )
}

/* ─────────────────────────────────────────────
   Audit Helpers
───────────────────────────────────────────── */

function getAuditCounts(result: AuditResponse) {
  const people = Array.isArray(result.people)
    ? result.people.filter(isValidAuditPerson)
    : []

  let compliant = 0
  let nonCompliant = 0
  let exempt = 0

  for (const person of people) {
    const status = String(person.status ?? "")
      .trim()
      .toUpperCase()

    if (status === "COMPLIANT") {
      compliant++
    } else if (status === "NON-COMPLIANT") {
      nonCompliant++
    } else if (status === "EXEMPT") {
      exempt++
    }
  }

  /*
   * EXEMPT personnel are excluded from the compliance
   * percentage because they do not have a compliance
   * requirement.
   */
  const auditedPersonnel =
    compliant + nonCompliant

  const compliance =
    auditedPersonnel > 0
      ? (compliant / auditedPersonnel) * 100
      : 0

  return {
    total: people.length,
    compliant,
    nonCompliant,
    exempt,
    compliance,
    people,
  }
}

/* ─────────────────────────────────────────────
   Formatting
───────────────────────────────────────────── */

function formatHours(hours: number) {
  const numericHours = Number(hours)

  if (!Number.isFinite(numericHours)) {
    return "0h"
  }

  return Number.isInteger(numericHours)
    ? `${numericHours}h`
    : `${numericHours.toFixed(1)}h`
}

/* ─────────────────────────────────────────────
   Health
───────────────────────────────────────────── */

function getHealth(
  compliance: number,
  departmentFailures: number,
  divisionFailures: number,
) {
  if (
    compliance < 80 ||
    departmentFailures >= 5 ||
    divisionFailures >= 10
  ) {
    return {
      label: "ALERT",
      className:
        "border-red-500/20 bg-red-500/10 text-red-500",
      icon: XCircle,
    }
  }

  if (
    compliance < 90 ||
    departmentFailures > 0 ||
    divisionFailures > 0
  ) {
    return {
      label: "WARNING",
      className:
        "border-yellow-500/20 bg-yellow-500/10 text-yellow-500",
      icon: AlertTriangle,
    }
  }

  return {
    label: "GOOD",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
    icon: CheckCircle2,
  }
}

/* ─────────────────────────────────────────────
   Components
───────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: typeof Users
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight">
            {value}
          </p>
        </div>

        <div
          className="
            flex h-10 w-10 shrink-0
            items-center justify-center
            rounded-lg
            border border-blue-500/20
            bg-blue-500/10
          "
        >
          <Icon className="h-5 w-5 text-blue-500" />
        </div>
      </div>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Users
  title: string
  description?: string
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-4">
      <div
        className="
          flex h-9 w-9 shrink-0
          items-center justify-center
          rounded-lg
          bg-blue-500/10
        "
      >
        <Icon className="h-4 w-4 text-blue-500" />
      </div>

      <div>
        <h2 className="text-sm font-semibold">
          {title}
        </h2>

        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

function TopTable({
  people,
  department = false,
}: {
  people: Person[]
  department?: boolean
}) {
  const validPeople = filterValidPeople(people)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-5 py-3 text-xs font-medium text-muted-foreground">
              #
            </th>

            {department && (
              <th className="px-3 py-3 text-xs font-medium text-muted-foreground">
                Callsign
              </th>
            )}

            <th className="px-3 py-3 text-xs font-medium text-muted-foreground">
              Name
            </th>

            <th className="px-3 py-3 text-xs font-medium text-muted-foreground">
              Rank
            </th>

            <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">
              Hours
            </th>
          </tr>
        </thead>

        <tbody>
          {validPeople.length === 0 ? (
            <tr>
              <td
                colSpan={department ? 5 : 4}
                className="
                  px-5 py-8
                  text-center
                  text-xs
                  text-muted-foreground
                "
              >
                No activity data available.
              </td>
            </tr>
          ) : (
            validPeople.map((person, index) => (
              <tr
                key={`${person.callsign}-${person.name}-${index}`}
                className="
                  border-b border-border
                  last:border-0
                  transition-colors
                  hover:bg-muted/20
                "
              >
                <td className="px-5 py-3 font-medium text-muted-foreground">
                  {index + 1}
                </td>

                {department && (
                  <td className="px-3 py-3 font-mono text-xs">
                    {person.callsign}
                  </td>
                )}

                <td className="px-3 py-3 font-medium">
                  {person.name}
                </td>

                <td className="px-3 py-3 text-muted-foreground">
                  {person.rank}
                </td>

                <td className="px-5 py-3 text-right font-semibold">
                  {formatHours(person.hours)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function DivisionTable({
  title,
  people,
}: {
  title: string
  people: Person[]
}) {
  return (
    <section
      className="
        overflow-hidden
        rounded-xl border border-border
        bg-card shadow-sm
      "
    >
      <div
        className="
          flex items-center justify-between
          border-b border-border
          px-5 py-4
        "
      >
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-500" />

          <h2 className="text-sm font-semibold">
            {title}
          </h2>
        </div>

        <span className="text-xs text-muted-foreground">
          Top 5
        </span>
      </div>

      <TopTable people={people} />
    </section>
  )
}

/* ─────────────────────────────────────────────
   Validation
───────────────────────────────────────────── */

function isValidDashboardData(
  value: unknown,
): value is DashboardData {
  if (!value || typeof value !== "object") {
    return false
  }

  const data = value as Partial<DashboardData>

  return Boolean(
    data.personnel &&
      data.command &&
      data.divisions &&
      data.alerts &&
      Array.isArray(data.departmentTop) &&
      data.divisionTop &&
      Array.isArray(data.promotionWatchlist),
  )
}

/* ─────────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────────── */

export default function ActivityDashboard() {
  const [data, setData] =
    useState<DashboardData>(emptyData)

  const [isLoading, setIsLoading] =
    useState(true)

  const [error, setError] =
    useState("")

  useEffect(() => {
    let cancelled = false

    async function fetchJson<T>(
      url: string,
      errorMessage: string,
    ): Promise<T> {
      const response = await fetch(url, {
        cache: "no-store",
      })

      const responseText =
        await response.text()

      if (!response.ok) {
        throw new Error(
          responseText ||
            `${errorMessage} (${response.status}).`,
        )
      }

      try {
        return JSON.parse(responseText) as T
      } catch {
        throw new Error(
          `${errorMessage} returned invalid JSON.`,
        )
      }
    }

    async function loadDashboard() {
      try {
        setIsLoading(true)
        setError("")

        /*
         * Load the normal activity dashboard and
         * all current Master Audit endpoints.
         *
         * The activity dashboard supplies:
         * - command statistics
         * - division membership
         * - top activity
         * - promotion watchlist
         *
         * The Master Audit endpoints supply:
         * - compliance
         * - compliant personnel
         * - non-compliant personnel
         * - exempt personnel
         * - department failures
         * - division failures
         */
        const [
          dashboardResult,
          departmentAudit,
          swatAudit,
          mtf7Audit,
          mcdAudit,
          truAudit,
        ] = await Promise.all([
          fetchJson<unknown>(
            "/api/activity/dashboard",
            "Failed to load activity dashboard",
          ),

          fetchJson<AuditResponse>(
            auditEndpoints.department,
            "Failed to load department audit",
          ),

          fetchJson<AuditResponse>(
            auditEndpoints.swat,
            "Failed to load SWAT audit",
          ),

          fetchJson<AuditResponse>(
            auditEndpoints.mtf7,
            "Failed to load MTF-7 audit",
          ),

          fetchJson<AuditResponse>(
            auditEndpoints.mcd,
            "Failed to load MCD audit",
          ),

          fetchJson<AuditResponse>(
            auditEndpoints.tru,
            "Failed to load TRU audit",
          ),
        ])

        if (
          !isValidDashboardData(
            dashboardResult,
          )
        ) {
          throw new Error(
            "The activity dashboard returned an invalid response.",
          )
        }

        /*
         * Calculate the audit statistics directly
         * from the same people/status data used by
         * Master Audit and Audit Failures.
         */
        const department =
          getAuditCounts(
            departmentAudit,
          )

        const swat =
          getAuditCounts(swatAudit)

        const mtf7 =
          getAuditCounts(mtf7Audit)

        const mcd =
          getAuditCounts(mcdAudit)

        const tru =
          getAuditCounts(truAudit)

        /*
         * Department compliance.
         *
         * EXEMPT personnel are intentionally excluded
         * from the percentage.
         */
        const auditCompliance =
          department.compliance

        /*
         * Department failures come directly from
         * the Department Master Audit.
         */
        const departmentFailures =
          department.nonCompliant

        /*
         * Division failures are the total number of
         * NON-COMPLIANT personnel across the current
         * audited divisions.
         *
         * Current audited divisions:
         * - SWAT
         * - MTF-7
         * - MCD
         * - TRU
         */
        const divisionFailures =
          swat.nonCompliant +
          mtf7.nonCompliant +
          mcd.nonCompliant +
          tru.nonCompliant

        /*
         * Replace all audit-derived values from the
         * normal dashboard endpoint with the authoritative
         * Master Audit values.
         */
        const correctedData: DashboardData = {
          ...dashboardResult,

          personnel: {
            ...dashboardResult.personnel,

            total: department.total,
            compliant: department.compliant,
            nonCompliant: department.nonCompliant,
            exempt: department.exempt,
            compliance: auditCompliance,
          },

          alerts: {
            ...dashboardResult.alerts,

            departmentFailures,
            divisionFailures,
          },
        }

        if (!cancelled) {
          setData(correctedData)
        }
      } catch (err) {
        console.error(
          "Activity dashboard error:",
          err,
        )

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load activity dashboard.",
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  /* ─────────────────────────────────────────────
     Derived Data
  ───────────────────────────────────────────── */

  const health = useMemo(
    () =>
      getHealth(
        data.personnel.compliance,
        data.alerts.departmentFailures,
        data.alerts.divisionFailures,
      ),
    [
      data.personnel.compliance,
      data.alerts.departmentFailures,
      data.alerts.divisionFailures,
    ],
  )

  const departmentTop = useMemo(
    () =>
      filterValidPeople(
        data.departmentTop,
      ),
    [data.departmentTop],
  )

  const divisionTop = useMemo(
    () => ({
      swat: filterValidPeople(
        data.divisionTop.swat,
      ),

      mtf7: filterValidPeople(
        data.divisionTop.mtf7,
      ),

      mcd: filterValidPeople(
        data.divisionTop.mcd,
      ),

      tru: filterValidPeople(
        data.divisionTop.tru,
      ),

      teu: filterValidPeople(
        data.divisionTop.teu,
      ),

      sar: filterValidPeople(
        data.divisionTop.sar,
      ),
    }),
    [data.divisionTop],
  )

  const promotionWatchlist =
    useMemo(
      () =>
        filterValidPeople(
          data.promotionWatchlist,
        ),
      [data.promotionWatchlist],
    )

  /* ─────────────────────────────────────────────
     Loading
  ───────────────────────────────────────────── */

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Activity Dashboard
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Loading activity data...
            </p>
          </div>

          <div
            className="
              rounded-xl border border-border
              bg-card p-10 text-center
              shadow-sm
            "
          >
            <p className="text-sm text-muted-foreground">
              Loading dashboard...
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  /* ─────────────────────────────────────────────
     Error
  ───────────────────────────────────────────── */

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Activity Dashboard
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Monitor personnel activity and compliance.
            </p>
          </div>

          <div
            className="
              rounded-xl border
              border-destructive/20
              bg-destructive/5
              p-5
            "
          >
            <p className="text-sm font-semibold text-destructive">
              Failed to load activity dashboard
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {error}
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  /* ─────────────────────────────────────────────
     Dashboard
  ───────────────────────────────────────────── */

  return (
    <DashboardLayout>
      <div
        className="
          min-w-0 max-w-full
          space-y-6
          overflow-x-hidden
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {/* Header */}

        <div>
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-xl border
                border-blue-500/20
                bg-blue-500/10
              "
            >
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>

            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight">
                Activity Dashboard
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Monitor personnel activity, compliance,
                command status, and division performance.
              </p>
            </div>
          </div>
        </div>

        {/* Audit Health */}

        <section
          className="
            overflow-hidden
            rounded-xl border border-border
            bg-card shadow-sm
          "
        >
          <SectionHeader
            icon={health.icon}
            title="Audit Health"
            description="Current department activity health."
          />

          <div className="grid gap-px bg-border sm:grid-cols-3">
            <div className="bg-card p-5">
              <p className="text-xs text-muted-foreground">
                Compliance
              </p>

              <div className="mt-2 flex items-center gap-3">
                <p className="text-2xl font-bold">
                  {Number(
                    data.personnel.compliance,
                  ).toFixed(2)}
                  %
                </p>

                <span
                  className={`
                    rounded-full border
                    px-2.5 py-1
                    text-[10px] font-semibold
                    ${health.className}
                  `}
                >
                  {health.label}
                </span>
              </div>
            </div>

            <div className="bg-card p-5">
              <p className="text-xs text-muted-foreground">
                Department Failures
              </p>

              <p className="mt-2 text-2xl font-bold">
                {data.alerts.departmentFailures}
              </p>
            </div>

            <div className="bg-card p-5">
              <p className="text-xs text-muted-foreground">
                Division Failures
              </p>

              <p className="mt-2 text-2xl font-bold">
                {data.alerts.divisionFailures}
              </p>
            </div>
          </div>
        </section>

        {/* Personnel */}

        <section>
          <div className="mb-3">
            <h2 className="text-lg font-semibold">
              Personnel
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Total Personnel"
              value={data.personnel.total}
              icon={Users}
            />

            <StatCard
              label="Compliant"
              value={data.personnel.compliant}
              icon={CheckCircle2}
            />

            <StatCard
              label="Non-Compliant"
              value={data.personnel.nonCompliant}
              icon={XCircle}
            />

            <StatCard
              label="Exempt"
              value={data.personnel.exempt}
              icon={Shield}
            />

            <StatCard
              label="Compliance"
              value={`${Number(
                data.personnel.compliance,
              ).toFixed(2)}%`}
              icon={BarChart3}
            />
          </div>
        </section>

        {/* Command */}

        <section
          className="
            overflow-hidden
            rounded-xl border border-border
            bg-card shadow-sm
          "
        >
          <SectionHeader
            icon={Award}
            title="Command"
          />

          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {[
              [
                "High Command",
                data.command.highCommand,
              ],
              [
                "Trial High Command",
                data.command.trialHighCommand,
              ],
              [
                "Low Command",
                data.command.lowCommand,
              ],
              [
                "Supervisors",
                data.command.supervisors,
              ],
              [
                "Patrol",
                data.command.patrol,
              ],
              [
                "Cadets",
                data.command.cadets,
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="bg-card p-5"
              >
                <p className="text-xs text-muted-foreground">
                  {label}
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Divisions */}

        <section
          className="
            overflow-hidden
            rounded-xl border border-border
            bg-card shadow-sm
          "
        >
          <SectionHeader
            icon={Shield}
            title="Divisions"
          />

          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {[
              [
                "SWAT Members",
                data.divisions.swat,
              ],
              [
                "MTF-7 Members",
                data.divisions.mtf7,
              ],
              [
                "MCD Members",
                data.divisions.mcd,
              ],
              [
                "TRU Members",
                data.divisions.tru,
              ],
              [
                "TEU Members",
                data.divisions.teu,
              ],
              [
                "SAR Members",
                data.divisions.sar,
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="bg-card p-5"
              >
                <p className="text-xs text-muted-foreground">
                  {label}
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Command Alerts */}

        <section
          className="
            overflow-hidden
            rounded-xl border border-border
            bg-card shadow-sm
          "
        >
          <SectionHeader
            icon={AlertTriangle}
            title="Command Alerts"
            description="Personnel requiring command attention."
          />

          <div className="grid gap-px bg-border sm:grid-cols-2">
            <div className="bg-card p-5">
              <p className="text-xs text-muted-foreground">
                Department Failures
              </p>

              <p className="mt-2 text-2xl font-bold">
                {data.alerts.departmentFailures}
              </p>
            </div>

            <div className="bg-card p-5">
              <p className="text-xs text-muted-foreground">
                Division Failures
              </p>

              <p className="mt-2 text-2xl font-bold">
                {data.alerts.divisionFailures}
              </p>
            </div>
          </div>
        </section>

        {/* Department Top 10 */}

        <section
          className="
            overflow-hidden
            rounded-xl border border-border
            bg-card shadow-sm
          "
        >
          <SectionHeader
            icon={Clock3}
            title="Top 10 Department Hours"
            description="Personnel with the highest recorded department activity."
          />

          <TopTable
            people={departmentTop}
            department
          />
        </section>

        {/* Division Top 5 */}

        <div className="grid gap-6 xl:grid-cols-2">
          <DivisionTable
            title="SWAT Top 5"
            people={divisionTop.swat}
          />

          <DivisionTable
            title="MTF-7 Top 5"
            people={divisionTop.mtf7}
          />

          <DivisionTable
            title="MCD Top 5"
            people={divisionTop.mcd}
          />

          <DivisionTable
            title="TRU Top 5"
            people={divisionTop.tru}
          />

          <DivisionTable
            title="TEU Top 5"
            people={divisionTop.teu}
          />

          <DivisionTable
            title="SAR Top 5"
            people={divisionTop.sar}
          />
        </div>

        {/* Promotion Watchlist */}

        <section
          className="
            overflow-hidden
            rounded-xl border border-border
            bg-card shadow-sm
          "
        >
          <SectionHeader
            icon={Award}
            title="Promotion Watchlist"
            description="Personnel meeting the configured promotion activity criteria."
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">
                    Name
                  </th>

                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground">
                    Rank
                  </th>

                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground">
                    Time in Rank
                  </th>

                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground">
                    Time in Dept
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">
                    Dept Hours
                  </th>
                </tr>
              </thead>

              <tbody>
                {promotionWatchlist.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="
                        px-5 py-8
                        text-center
                        text-xs
                        text-muted-foreground
                      "
                    >
                      No personnel currently on the promotion watchlist.
                    </td>
                  </tr>
                ) : (
                  promotionWatchlist.map(
                    (person, index) => (
                      <tr
                        key={`${person.callsign}-${person.name}-${index}`}
                        className="
                          border-b border-border
                          last:border-0
                          transition-colors
                          hover:bg-muted/20
                        "
                      >
                        <td className="px-5 py-3 font-medium">
                          {person.name}
                        </td>

                        <td className="px-3 py-3 text-muted-foreground">
                          {person.rank}
                        </td>

                        <td className="px-3 py-3 text-muted-foreground">
                          {person.timeInRank}
                        </td>

                        <td className="px-3 py-3 text-muted-foreground">
                          {person.timeInDepartment}
                        </td>

                        <td className="px-5 py-3 text-right font-semibold">
                          {formatHours(person.hours)}
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}