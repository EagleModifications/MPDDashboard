import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Bell,
  ClipboardCheck,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Search,
  Settings,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import ThemeToggle from "@/components/theme-toggle"

interface SearchItem {
  title: string
  description: string
  route: string
  keywords?: string
  icon: React.ComponentType<{ className?: string }>
}

const searchItems: SearchItem[] = [
  // Activity Management
  {
    title: "Dashboard",
    description: "Activity Management dashboard",
    route: "/activity-dashboard",
    keywords: "activity management home",
    icon: LayoutDashboard,
  },
  {
    title: "Master Audit",
    description: "Activity Management master audit",
    route: "/activity-audits/master",
    keywords: "activity audit master audits",
    icon: ClipboardCheck,
  },
  {
    title: "Audit Failures",
    description: "View failed activity audits",
    route: "/activity-audits/failures",
    keywords: "activity audit failures failed",
    icon: ClipboardCheck,
  },
  {
    title: "Historical Audits",
    description: "View historical activity audits",
    route: "/activity-audits/history",
    keywords: "activity audit history historical",
    icon: History,
  },

  {
    title: "Roster Import",
    description: "Import the Activity Management roster",
    route: "/activity/imports/roster",
    keywords: "activity imports roster spreadsheet",
    icon: FileSpreadsheet,
  },
  {
    title: "Department Import",
    description: "Import Department data",
    route: "/activity/imports/department",
    keywords: "activity imports department",
    icon: FileSpreadsheet,
  },
  {
    title: "SWAT Import",
    description: "Import SWAT data",
    route: "/activity/imports/swat",
    keywords: "activity imports swat",
    icon: FileSpreadsheet,
  },
  {
    title: "MTF-7 Import",
    description: "Import MTF-7 data",
    route: "/activity/imports/mtf-7",
    keywords: "activity imports mtf 7 mtf7",
    icon: FileSpreadsheet,
  },
  {
    title: "MCD Import",
    description: "Import MCD data",
    route: "/activity/imports/mcd",
    keywords: "activity imports mcd",
    icon: FileSpreadsheet,
  },
  {
    title: "TRU Import",
    description: "Import TRU data",
    route: "/activity/imports/tru",
    keywords: "activity imports tru",
    icon: FileSpreadsheet,
  },
  {
    title: "TEU Import",
    description: "Import TEU data",
    route: "/activity/imports/teu",
    keywords: "activity imports teu",
    icon: FileSpreadsheet,
  },
  {
    title: "SAR Import",
    description: "Import SAR data",
    route: "/activity/imports/sar",
    keywords: "activity imports sar",
    icon: FileSpreadsheet,
  },

  {
    title: "Department Requirements",
    description: "Manage Department activity requirements",
    route: "/activity/requirements/department",
    keywords: "activity requirements department",
    icon: ShieldCheck,
  },
  {
    title: "SWAT Requirements",
    description: "Manage SWAT activity requirements",
    route: "/activity/requirements/swat",
    keywords: "activity requirements swat",
    icon: ShieldCheck,
  },
  {
    title: "MTF-7 Requirements",
    description: "Manage MTF-7 activity requirements",
    route: "/activity/requirements/mtf-7",
    keywords: "activity requirements mtf 7 mtf7",
    icon: ShieldCheck,
  },
  {
    title: "MCD Requirements",
    description: "Manage MCD activity requirements",
    route: "/activity/requirements/mcd",
    keywords: "activity requirements mcd",
    icon: ShieldCheck,
  },
  {
    title: "TRU Requirements",
    description: "Manage TRU activity requirements",
    route: "/activity/requirements/tru",
    keywords: "activity requirements tru",
    icon: ShieldCheck,
  },
  {
    title: "TEU Requirements",
    description: "Manage TEU activity requirements",
    route: "/activity/requirements/teu",
    keywords: "activity requirements teu",
    icon: ShieldCheck,
  },
  {
    title: "SAR Requirements",
    description: "Manage SAR activity requirements",
    route: "/activity/requirements/sar",
    keywords: "activity requirements sar",
    icon: ShieldCheck,
  },

  // Promotion Management
  {
    title: "Dashboard",
    description: "Promotion Management dashboard",
    route: "/promotion-dashboard",
    keywords: "promotion management home",
    icon: LayoutDashboard,
  },
  {
    title: "Master Audit",
    description: "Promotion Management master audit",
    route: "/promotion-audits/master",
    keywords: "promotion audit master audits",
    icon: ClipboardCheck,
  },
  {
    title: "Audit Failures",
    description: "View failed promotion audits",
    route: "/promotion-audits/failures",
    keywords: "promotion audit failures failed",
    icon: ClipboardCheck,
  },
  {
    title: "Historical Audits",
    description: "View historical promotion audits",
    route: "/promotion-audits/history",
    keywords: "promotion audit history historical",
    icon: History,
  },

  {
    title: "Roster Import",
    description: "Import the Promotion Management roster",
    route: "/promotion-imports/roster",
    keywords: "promotion imports roster spreadsheet",
    icon: FileSpreadsheet,
  },
  {
    title: "Department Import",
    description: "Import Department promotion data",
    route: "/promotion-imports/department",
    keywords: "promotion imports department",
    icon: FileSpreadsheet,
  },
  {
    title: "SWAT Import",
    description: "Import SWAT promotion data",
    route: "/promotion-imports/swat",
    keywords: "promotion imports swat",
    icon: FileSpreadsheet,
  },
  {
    title: "MTF-7 Import",
    description: "Import MTF-7 promotion data",
    route: "/promotion-imports/mtf-7",
    keywords: "promotion imports mtf 7 mtf7",
    icon: FileSpreadsheet,
  },
  {
    title: "MCD Import",
    description: "Import MCD promotion data",
    route: "/promotion-imports/mcd",
    keywords: "promotion imports mcd",
    icon: FileSpreadsheet,
  },
  {
    title: "TRU Import",
    description: "Import TRU promotion data",
    route: "/promotion-imports/tru",
    keywords: "promotion imports tru",
    icon: FileSpreadsheet,
  },
  {
    title: "TEU Import",
    description: "Import TEU promotion data",
    route: "/promotion-imports/teu",
    keywords: "promotion imports teu",
    icon: FileSpreadsheet,
  },
  {
    title: "SAR Import",
    description: "Import SAR promotion data",
    route: "/promotion-imports/sar",
    keywords: "promotion imports sar",
    icon: FileSpreadsheet,
  },

  {
    title: "Department Requirements",
    description: "Manage Department promotion requirements",
    route: "/promotion-requirements/department",
    keywords: "promotion requirements department",
    icon: ShieldCheck,
  },
  {
    title: "SWAT Requirements",
    description: "Manage SWAT promotion requirements",
    route: "/promotion-requirements/swat",
    keywords: "promotion requirements swat",
    icon: ShieldCheck,
  },
  {
    title: "MTF-7 Requirements",
    description: "Manage MTF-7 promotion requirements",
    route: "/promotion-requirements/mtf-7",
    keywords: "promotion requirements mtf 7 mtf7",
    icon: ShieldCheck,
  },
  {
    title: "MCD Requirements",
    description: "Manage MCD promotion requirements",
    route: "/promotion-requirements/mcd",
    keywords: "promotion requirements mcd",
    icon: ShieldCheck,
  },
  {
    title: "TRU Requirements",
    description: "Manage TRU promotion requirements",
    route: "/promotion-requirements/tru",
    keywords: "promotion requirements tru",
    icon: ShieldCheck,
  },
  {
    title: "TEU Requirements",
    description: "Manage TEU promotion requirements",
    route: "/promotion-requirements/teu",
    keywords: "promotion requirements teu",
    icon: ShieldCheck,
  },
  {
    title: "SAR Requirements",
    description: "Manage SAR promotion requirements",
    route: "/promotion-requirements/sar",
    keywords: "promotion requirements sar",
    icon: ShieldCheck,
  },

  // Other
  {
    title: "Settings",
    description: "Dashboard settings",
    route: "/settings",
    keywords: "configuration preferences",
    icon: Settings,
  },
  {
    title: "Notifications",
    description: "View all dashboard notifications",
    route: "/notifications",
    keywords: "notifications alerts activity",
    icon: Bell,
  },
]

export default function DashboardNavbar() {
  const navigate = useNavigate()
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [notificationSounds, setNotificationSounds] = useState(true)

  useEffect(() => {
    const savedPreference = localStorage.getItem(
      "mpd-notification-sounds",
    )

    if (savedPreference !== null) {
      setNotificationSounds(savedPreference === "true")
    }
  }, [])

  useEffect(() => {
    if (!searchOpen) {
      setSearch("")
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target)
      ) {
        setSearchOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      )
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [searchOpen])

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault()
        setSearchOpen(true)
      }
    }

    document.addEventListener("keydown", handleGlobalKeyDown)

    return () => {
      document.removeEventListener(
        "keydown",
        handleGlobalKeyDown,
      )
    }
  }, [])

  const filteredSearchItems = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return searchItems
    }

    return searchItems.filter((item) => {
      const searchableText = [
        item.title,
        item.description,
        item.keywords ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return searchableText.includes(query)
    })
  }, [search])

  const activityResults = filteredSearchItems.filter((item) =>
    item.route.startsWith("/activity-"),
  )

  const promotionResults = filteredSearchItems.filter((item) =>
    item.route.startsWith("/promotion-"),
  )

  const otherResults = filteredSearchItems.filter(
    (item) =>
      !item.route.startsWith("/activity-") &&
      !item.route.startsWith("/promotion-"),
  )

  const openSearchResult = (route: string) => {
    setSearchOpen(false)
    setSearch("")
    navigate(route)
  }

  const toggleNotificationSounds = () => {
    const nextValue = !notificationSounds

    setNotificationSounds(nextValue)

    localStorage.setItem(
      "mpd-notification-sounds",
      String(nextValue),
    )
  }

  const renderSearchResults = (
    title: string,
    items: SearchItem[],
  ) => {
    if (items.length === 0) {
      return null
    }

    return (
      <div className="space-y-1">
        <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </div>

        {items.map((item) => {
          const Icon = item.icon

          return (
            <button
              key={item.route}
              type="button"
              onClick={() => openSearchResult(item.route)}
              className="
                flex
                w-full
                items-center
                gap-3
                rounded-md
                px-3
                py-2.5
                text-left
                transition-colors
                hover:bg-muted
              "
            >
              <div
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-md
                  border
                  border-border
                  bg-muted/40
                "
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.title}
                </p>

                <p className="truncate text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center border-b border-border bg-background">
        <div className="flex w-full items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />

          <div className="ml-auto flex items-center gap-2">
            {/* Desktop Search */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setSearchOpen(true)}
              className="
                hidden
                h-8
                w-[240px]
                items-center
                justify-start
                gap-2
                rounded-md
                border-border
                bg-background
                px-3
                text-sm
                font-normal
                text-muted-foreground
                shadow-none
                hover:bg-foreground/5
                hover:text-foreground
                sm:flex
                md:w-[280px]
              "
            >
              <Search className="h-4 w-4 shrink-0" />

              <span className="flex-1 text-left">
                Search
              </span>

              <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline-block">
                Ctrl K
              </kbd>
            </Button>

            {/* Mobile Search */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="
                h-8
                w-8
                rounded-md
                border-border
                shadow-none
                sm:hidden
              "
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="
                    relative
                    h-8
                    w-8
                    rounded-full
                    border-border
                    shadow-none
                  "
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />

                  <span
                    className="
                      absolute
                      right-1
                      top-1
                      h-1.5
                      w-1.5
                      rounded-full
                      bg-blue-500
                    "
                  />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-[360px] rounded-xl p-0"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Notifications
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Your latest dashboard activity
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigate("/notifications")}
                      className="
                        rounded-md
                        px-2
                        py-1
                        text-xs
                        font-medium
                        text-muted-foreground
                        transition-colors
                        hover:bg-muted
                        hover:text-foreground
                      "
                    >
                      View all
                    </button>

                    <button
                      type="button"
                      onClick={toggleNotificationSounds}
                      className="
                        flex
                        h-7
                        w-7
                        items-center
                        justify-center
                        rounded-md
                        text-muted-foreground
                        transition-colors
                        hover:bg-muted
                        hover:text-foreground
                      "
                      aria-label={
                        notificationSounds
                          ? "Disable notification sounds"
                          : "Enable notification sounds"
                      }
                      title={
                        notificationSounds
                          ? "Disable notification sounds"
                          : "Enable notification sounds"
                      }
                    >
                      {notificationSounds ? (
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <VolumeX className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <DropdownMenuSeparator className="m-0" />

                <button
                  type="button"
                  onClick={() => navigate("/notifications")}
                  className="
                    flex
                    w-full
                    items-start
                    gap-3
                    px-4
                    py-3
                    text-left
                    transition-colors
                    hover:bg-muted/50
                  "
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">
                        Audit Completed
                      </p>

                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        about 2 months ago
                      </span>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Your department audit has been completed successfully.
                    </p>
                  </div>
                </button>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme / Mode */}
            <div className="[&>button]:rounded-full">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Search Overlay */}
      {searchOpen && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-start
            justify-center
            bg-black/50
            px-4
            pt-[12vh]
            backdrop-blur-[2px]
          "
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSearchOpen(false)
            }
          }}
        >
          <div
            ref={searchContainerRef}
            className="
              flex
              w-full
              max-w-[620px]
              flex-col
              overflow-hidden
              rounded-lg
              border
              border-border
              bg-background
              shadow-2xl
            "
            onMouseDown={(event) => {
              event.stopPropagation()
            }}
          >
            {/* Search Input */}
            <div className="flex h-14 items-center gap-3 border-b border-border px-4">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />

              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search pages, imports, requirements..."
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  text-left
                  text-sm
                  text-foreground
                  outline-none
                  placeholder:text-left
                  placeholder:text-muted-foreground
                "
              />

              <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>

              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="
                  flex
                  h-7
                  w-7
                  shrink-0
                  items-center
                  justify-center
                  rounded-md
                  text-muted-foreground
                  transition-colors
                  hover:bg-muted
                  hover:text-foreground
                "
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results */}
            <div
              className="
                max-h-[500px]
                overflow-y-auto
                p-2
                [scrollbar-width:none]
                [&::-webkit-scrollbar]:hidden
              "
            >
              {filteredSearchItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <p className="text-sm font-medium">
                    No results found
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Try searching for a page, import, audit, or requirement.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {renderSearchResults(
                    "Activity Management",
                    activityResults,
                  )}

                  {renderSearchResults(
                    "Promotion Management",
                    promotionResults,
                  )}

                  {renderSearchResults(
                    "Other",
                    otherResults,
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}