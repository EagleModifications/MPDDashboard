import { useEffect, useState } from "react"
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  RotateCcw,
  Save,
  Shield,
} from "lucide-react"

import DashboardLayout from "@/components/dashboard/DashboardLayout"
import { Button } from "@/components/ui/button"

type Rank = {
  id: string
  name: string
}

type Requirement = {
  hours: number
}

export default function MCDRequirements() {
  const [rankConfig, setRankConfig] = useState<Rank[]>([])
  const [requirements, setRequirements] = useState<
    Record<string, Requirement>
  >({})
  const [savedRequirements, setSavedRequirements] =
    useState<Record<string, Requirement>>({})

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true)
        setError("")
        setSaved(false)

        const rankResponse = await fetch(
          "/config/ranks/mcd.json",
          {
            cache: "no-store",
          },
        )

        let ranks: Rank[] = []

        if (rankResponse.ok) {
          const rankText =
            await rankResponse.text()

          if (rankText.trim()) {
            try {
              const rankData =
                JSON.parse(rankText)

              if (Array.isArray(rankData)) {
                ranks = rankData
              } else if (
                Array.isArray(rankData.ranks)
              ) {
                ranks = rankData.ranks
              }
            } catch {
              ranks = []
            }
          }
        }

        const requirementResponse =
          await fetch(
            "/config/requirements/activity/mcd.json",
            {
              cache: "no-store",
            },
          )

        let loadedRequirements: Record<
          string,
          Requirement
        > = {}

        if (requirementResponse.ok) {
          const requirementText =
            await requirementResponse.text()

          if (requirementText.trim()) {
            try {
              const requirementData =
                JSON.parse(
                  requirementText,
                )

              if (
                requirementData.requirements &&
                typeof requirementData.requirements ===
                  "object"
              ) {
                loadedRequirements =
                  requirementData.requirements
              }
            } catch {
              loadedRequirements = {}
            }
          }
        }

        setRankConfig(ranks)
        setRequirements(
          loadedRequirements,
        )
        setSavedRequirements(
          loadedRequirements,
        )
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load requirements.",
        )
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const hasChanges =
    JSON.stringify(requirements) !==
    JSON.stringify(savedRequirements)

  function changeHours(
    rankId: string,
    amount: number,
  ) {
    setRequirements(
      (current) => ({
        ...current,
        [rankId]: {
          hours: Math.max(
            0,
            (current[rankId]?.hours ?? 0) +
              amount,
          ),
        },
      }),
    )

    setSaved(false)
    setError("")
  }

  function setHours(
    rankId: string,
    value: string,
  ) {
    const hours =
      Number.parseInt(
        value,
        10,
      )

    setRequirements(
      (current) => ({
        ...current,
        [rankId]: {
          hours: Number.isFinite(hours)
            ? Math.max(0, hours)
            : 0,
        },
      }),
    )

    setSaved(false)
    setError("")
  }

  async function handleSave() {
    if (rankConfig.length === 0) {
      return
    }

    setIsSaving(true)
    setSaved(false)
    setError("")

    try {
      const response =
        await fetch(
          "/api/requirements/activity/mcd",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              requirements,
            }),
          },
        )

      const responseText =
        await response.text()

      let data: {
        success?: boolean
        message?: string
      } = {}

      if (responseText.trim()) {
        try {
          data =
            JSON.parse(
              responseText,
            )
        } catch {
          throw new Error(
            "The server returned an invalid response.",
          )
        }
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to save requirements.",
        )
      }

      setSavedRequirements({
        ...requirements,
      })

      setSaved(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save requirements.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  function handleReset() {
    setRequirements({
      ...savedRequirements,
    })

    setSaved(false)
    setError("")
  }

  return (
    <DashboardLayout>
      <div
        className="
          min-w-0
          max-w-full
          space-y-6
          overflow-x-hidden
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {/* Page Header */}

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
              <Shield className="h-5 w-5 text-blue-500" />
            </div>

            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight">
                MCD Requirements
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Configure the required activity hours
                for each MCD rank.
              </p>
            </div>
          </div>
        </div>

        {/* Loading */}

        {isLoading ? (
          <div
            className="
              rounded-xl border border-border
              bg-card p-10 text-center
              shadow-sm
            "
          >
            <p className="text-sm text-muted-foreground">
              Loading requirements...
            </p>
          </div>
        ) : rankConfig.length === 0 ? (
          /* No Ranks */

          <div
            className="
              rounded-xl border border-border
              bg-card shadow-sm
            "
          >
            <div
              className="
                flex min-h-[260px]
                flex-col items-center
                justify-center
                px-6 text-center
              "
            >
              <div
                className="
                  mb-4 flex h-12 w-12
                  items-center justify-center
                  rounded-full
                  border border-blue-500/20
                  bg-blue-500/10
                "
              >
                <Shield className="h-6 w-6 text-blue-500" />
              </div>

              <h2 className="text-base font-semibold">
                No Ranks Configured
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                No ranks have been configured
                for MCD yet. Add ranks to the
                MCD rank configuration before
                setting activity requirements.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Requirements */}

            <section
              className="
                overflow-hidden
                rounded-xl border border-border
                bg-card shadow-sm
              "
            >
              {/* Section Header */}

              <div
                className="
                  flex min-h-[66px]
                  items-center justify-between
                  border-b border-border
                  px-6 py-3
                "
              >
                <div className="flex items-center gap-3">
                  <div
                    className="
                      flex h-10 w-10 shrink-0
                      items-center justify-center
                      rounded-lg
                      border border-blue-500/20
                      bg-blue-500/10
                    "
                  >
                    <Clock3 className="h-5 w-5 text-blue-500" />
                  </div>

                  <div>
                    <h2 className="text-base font-semibold">
                      Required Activity Hours
                    </h2>

                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Set the minimum hours required
                      for each rank.
                    </p>
                  </div>
                </div>

                <span className="text-sm text-muted-foreground">
                  {rankConfig.length}{" "}
                  {rankConfig.length === 1
                    ? "rank"
                    : "ranks"}
                </span>
              </div>

              {/* Rank Rows */}

              <div>
                {rankConfig.map(
                  (rank, index) => {
                    const hours =
                      requirements[
                        rank.id
                      ]?.hours ?? 0

                    return (
                      <div
                        key={rank.id}
                        className={`
                          flex
                          min-h-[78px]
                          items-center
                          justify-between
                          gap-6
                          px-6
                          py-4
                          transition-colors
                          hover:bg-muted/20
                          ${
                            index !==
                            rankConfig.length - 1
                              ? "border-b border-border"
                              : ""
                          }
                        `}
                      >
                        {/* Rank */}

                        <div
                          className="
                            flex min-w-0
                            items-center gap-4
                          "
                        >
                          <div
                            className="
                              flex h-10 w-10
                              shrink-0
                              items-center
                              justify-center
                              rounded-lg
                              border
                              border-blue-500/20
                              bg-blue-500/10
                            "
                          >
                            <Shield className="h-5 w-5 text-blue-500" />
                          </div>

                          <div className="min-w-0">
                            <p
                              className="
                                text-base
                                font-semibold
                                leading-5
                              "
                            >
                              {rank.name}
                            </p>

                            <p
                              className="
                                mt-1 text-sm
                                text-muted-foreground
                              "
                            >
                              Required hours
                            </p>
                          </div>
                        </div>

                        {/* Number Control */}

                        <div
                          className="
                            flex h-12
                            shrink-0
                            overflow-hidden
                            rounded-lg
                            border border-border
                            bg-background
                          "
                        >
                          <input
                            type="number"
                            min="0"
                            value={hours}
                            onChange={(
                              event,
                            ) =>
                              setHours(
                                rank.id,
                                event.target.value,
                              )
                            }
                            className="
                              h-full
                              w-16
                              border-0
                              bg-transparent
                              px-2
                              text-center
                              text-base
                              font-semibold
                              text-foreground
                              outline-none
                              focus:bg-muted/30
                              [appearance:textfield]
                              [&::-webkit-inner-spin-button]:appearance-none
                              [&::-webkit-outer-spin-button]:appearance-none
                            "
                          />

                          <div
                            className="
                              flex w-9
                              flex-col
                              border-l
                              border-border
                            "
                          >
                            <button
                              type="button"
                              onClick={() =>
                                changeHours(
                                  rank.id,
                                  1,
                                )
                              }
                              className="
                                flex h-1/2
                                items-center
                                justify-center
                                border-b
                                border-border
                                text-muted-foreground
                                transition-colors
                                hover:bg-blue-500/10
                                hover:text-blue-500
                              "
                              aria-label={`Increase ${rank.name} hours`}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                changeHours(
                                  rank.id,
                                  -1,
                                )
                              }
                              className="
                                flex h-1/2
                                items-center
                                justify-center
                                text-muted-foreground
                                transition-colors
                                hover:bg-blue-500/10
                                hover:text-blue-500
                              "
                              aria-label={`Decrease ${rank.name} hours`}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  },
                )}
              </div>
            </section>

            {/* Actions */}

            <div
              className="
                flex min-h-11
                items-center
                justify-between
                gap-4
              "
            >
              <div>
                {saved && (
                  <div
                    className="
                      flex items-center gap-2
                      text-sm text-emerald-500
                    "
                  >
                    <Check className="h-4 w-4" />
                    Requirements saved successfully.
                  </div>
                )}

                {error && (
                  <p className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={
                    !hasChanges ||
                    isSaving
                  }
                  className="h-10 rounded-md px-4"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>

                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    !hasChanges ||
                    isSaving
                  }
                  className="h-10 rounded-md px-4"
                >
                  <Save className="mr-2 h-4 w-4" />

                  {isSaving
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
