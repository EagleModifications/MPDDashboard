import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import {
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import {
  getSession,
  hasPermission,
  type User,
} from "@/lib/auth"

/* ================================================================
   SESSION STORAGE HELPERS
================================================================ */

function getStoredBoolean(
  key: string,
  defaultValue: boolean,
): boolean {
  try {
    const stored = sessionStorage.getItem(key)

    if (stored === null) {
      return defaultValue
    }

    return stored === "true"
  } catch {
    return defaultValue
  }
}

function storeBoolean(
  key: string,
  value: boolean,
) {
  try {
    sessionStorage.setItem(key, String(value))
  } catch {
    // Ignore storage errors.
  }
}

/* ================================================================
   STORAGE KEYS
================================================================ */

const STORAGE_KEYS = {
  activity: "mpd-sidebar-activity-open",
  activityImports: "mpd-sidebar-activity/imports-open",
  activityRequirements: "mpd-sidebar-activity/requirements-open",

  promotion: "mpd-sidebar-promotion-open",
  promotionImports: "mpd-sidebar-promotion-imports-open",
  promotionRequirements: "mpd-sidebar-promotion-requirements-open",

  settings: "mpd-sidebar-settings-open",
}

/* ================================================================
   COMPONENT
================================================================ */

export default function DashboardSidebar() {
  const [user, setUser] = useState<User | null>(null)

  /* ==============================================================
     COLLAPSIBLE STATE

     IMPORTANT:
     These states are NOT connected to location.pathname.

     Navigating between pages therefore does not open/close
     anything automatically.
  ============================================================== */

  const [activityOpen, setActivityOpenState] = useState(() =>
    getStoredBoolean(STORAGE_KEYS.activity, true),
  )

  const [activityImportsOpen, setActivityImportsOpenState] = useState(() =>
    getStoredBoolean(STORAGE_KEYS.activityImports, false),
  )

  const [activityRequirementsOpen, setActivityRequirementsOpenState] =
    useState(() =>
      getStoredBoolean(STORAGE_KEYS.activityRequirements, false),
    )

  const [promotionOpen, setPromotionOpenState] = useState(() =>
    getStoredBoolean(STORAGE_KEYS.promotion, true),
  )

  const [promotionImportsOpen, setPromotionImportsOpenState] = useState(() =>
    getStoredBoolean(STORAGE_KEYS.promotionImports, false),
  )

  const [promotionRequirementsOpen, setPromotionRequirementsOpenState] =
    useState(() =>
      getStoredBoolean(STORAGE_KEYS.promotionRequirements, false),
    )

  const [settingsOpen, setSettingsOpenState] = useState(() =>
    getStoredBoolean(STORAGE_KEYS.settings, true),
  )

  /* ==============================================================
     PERSISTED STATE SETTERS

     These update React immediately and save the state so that
     navigation/remounting doesn't reset the sidebar.
  ============================================================== */

  const setActivityOpen = (value: boolean) => {
    setActivityOpenState(value)
    storeBoolean(STORAGE_KEYS.activity, value)
  }

  const setActivityImportsOpen = (value: boolean) => {
    setActivityImportsOpenState(value)
    storeBoolean(STORAGE_KEYS.activityImports, value)
  }

  const setActivityRequirementsOpen = (value: boolean) => {
    setActivityRequirementsOpenState(value)
    storeBoolean(STORAGE_KEYS.activityRequirements, value)
  }

  const setPromotionOpen = (value: boolean) => {
    setPromotionOpenState(value)
    storeBoolean(STORAGE_KEYS.promotion, value)
  }

  const setPromotionImportsOpen = (value: boolean) => {
    setPromotionImportsOpenState(value)
    storeBoolean(STORAGE_KEYS.promotionImports, value)
  }

  const setPromotionRequirementsOpen = (value: boolean) => {
    setPromotionRequirementsOpenState(value)
    storeBoolean(STORAGE_KEYS.promotionRequirements, value)
  }

  const setSettingsOpen = (value: boolean) => {
    setSettingsOpenState(value)
    storeBoolean(STORAGE_KEYS.settings, value)
  }

  /* ==============================================================
     SESSION
  ============================================================== */

  useEffect(() => {
    getSession()
      .then((session) => {
        setUser(session)
      })
      .catch(() => {
        setUser(null)
      })
  }, [])

  /* ==============================================================
     ACTIVE ROUTE

     This only determines which button is highlighted.

     It DOES NOT change whether menus are open or closed.
  ============================================================== */

  const isActive = (path: string) => {
    return (
      window.location.pathname === path ||
      window.location.pathname.startsWith(`${path}/`)
    )
  }

  /* ==============================================================
     DISCORD AVATAR
  ============================================================== */

  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=128`
    : undefined

  const displayName =
    user?.displayName ||
    user?.username ||
    "User"

  const username =
    user?.username ||
    "Unknown User"

  const initials =
    displayName
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"

  return (
    <Sidebar collapsible="icon">

      {/* ============================================================
          HEADER
      ============================================================ */}

      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="Metro Police Department"
            >
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg">
                  <img
                    src="/logo.png"
                    alt="Metro Police Department"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    Metro Police Department
                  </span>

                  <span className="truncate text-xs text-muted-foreground">
                    MPD
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ============================================================
          CONTENT
      ============================================================ */}

      <SidebarContent>

        {/* ==========================================================
            ACTIVITY MANAGEMENT
        ========================================================== */}

        <Collapsible
          open={activityOpen}
          onOpenChange={setActivityOpen}
          className="group/activity"
        >
          <SidebarGroup>

            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="
                  flex
                  w-full
                  items-center
                  gap-2
                  rounded-md
                  px-2
                  py-2
                  text-left
                  text-xs
                  font-semibold
                  text-muted-foreground
                "
              >
                <span>
                  Activity Management
                </span>

                <ChevronRight
                  className="
                    ml-auto
                    h-4
                    w-4
                    shrink-0
                    transition-transform
                    duration-200
                    ease-in-out
                    group-data-[state=open]/activity:rotate-90
                  "
                />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent
              className="
                overflow-hidden
                data-[state=closed]:animate-accordion-up
                data-[state=open]:animate-accordion-down
              "
            >
              <SidebarGroupContent>
                <SidebarMenu>

                  {/* Dashboard */}

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/activity/dashboard")}
                      tooltip="Dashboard"
                    >
                      <Link to="/activity/dashboard">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Master Audit */}

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/activity/masteraudit")}
                      tooltip="Master Audit"
                    >
                      <Link to="/activity/masteraudit">
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Master Audit</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Audit Failures */}

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/activity/auditfaliures")}
                      tooltip="Audit Failures"
                    >
                      <Link to="/activity/auditfaliures">
                        <Shield className="h-4 w-4" />
                        <span>Audit Failures</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* ==================================================
                      ACTIVITY IMPORTS
                  ================================================== */}

                  <Collapsible
                    open={activityImportsOpen}
                    onOpenChange={setActivityImportsOpen}
                    className="group/activity/imports"
                  >
                    <SidebarMenuItem>

                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip="Imports">
                          <FileSpreadsheet className="h-4 w-4" />

                          <span>
                            Imports
                          </span>

                          <ChevronRight
                            className="
                              ml-auto
                              h-4
                              w-4
                              shrink-0
                              transition-transform
                              duration-200
                              ease-in-out
                              group-data-[state=open]/activity/imports:rotate-90
                            "
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent
                        className="
                          overflow-hidden
                          data-[state=closed]:animate-accordion-up
                          data-[state=open]:animate-accordion-down
                        "
                      >
                        <SidebarMenuSub>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/activity/imports/roster")}
                            >
                              <Link to="/activity/imports/roster">
                                <span>Roster</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/activity/imports/department")}
                            >
                              <Link to="/activity/imports/department">
                                <span>Department</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/activity/imports/swat")}
                            >
                              <Link to="/activity/imports/swat">
                                <span>SWAT</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/activity/imports/mtf-7")}
                            >
                              <Link to="/activity/imports/mtf-7">
                                <span>MTF-7</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/activity/imports/mcd")}
                            >
                              <Link to="/activity/imports/mcd">
                                <span>MCD</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/activity/imports/tru")}
                            >
                              <Link to="/activity/imports/tru">
                                <span>TRU</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/activity/imports/teu")}
                            >
                              <Link to="/activity/imports/teu">
                                <span>TEU</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/activity/imports/sar")}
                            >
                              <Link to="/activity/imports/sar">
                                <span>SAR</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  {/* ==================================================
                      ACTIVITY REQUIREMENTS
                  ================================================== */}

                  <Collapsible
                    open={activityRequirementsOpen}
                    onOpenChange={setActivityRequirementsOpen}
                    className="group/activity/requirements"
                  >
                    <SidebarMenuItem>

                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip="Requirements">
                          <ClipboardCheck className="h-4 w-4" />

                          <span>
                            Requirements
                          </span>

                          <ChevronRight
                            className="
                              ml-auto
                              h-4
                              w-4
                              shrink-0
                              transition-transform
                              duration-200
                              ease-in-out
                              group-data-[state=open]/activity/requirements:rotate-90
                            "
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent
                        className="
                          overflow-hidden
                          data-[state=closed]:animate-accordion-up
                          data-[state=open]:animate-accordion-down
                        "
                      >
                        <SidebarMenuSub>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/activity/requirements/department")}
                            >
                              <Link to="/activity/requirements/department">
                                <span>Department</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/activity/requirements/swat")}
                            >
                              <Link to="/activity/requirements/swat">
                                <span>SWAT</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/activity/requirements/mtf-7")}
                            >
                              <Link to="/activity/requirements/mtf-7">
                                <span>MTF-7</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/activity/requirements/mcd")}
                            >
                              <Link to="/activity/requirements/mcd">
                                <span>MCD</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/activity/requirements/tru")}
                            >
                              <Link to="/activity/requirements/tru">
                                <span>TRU</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/activity/requirements/teu")}
                            >
                              <Link to="/activity/requirements/teu">
                                <span>TEU</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/activity/requirements/sar")}
                            >
                              <Link to="/activity/requirements/sar">
                                <span>SAR</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* ==========================================================
            PROMOTION MANAGEMENT
        ========================================================== */}

        <Collapsible
          open={promotionOpen}
          onOpenChange={setPromotionOpen}
          className="group/promotion"
        >
          <SidebarGroup>

            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="
                  flex
                  w-full
                  items-center
                  gap-2
                  rounded-md
                  px-2
                  py-2
                  text-left
                  text-xs
                  font-semibold
                  text-muted-foreground
                "
              >
                <span>
                  Promotion Management
                </span>

                <ChevronRight
                  className="
                    ml-auto
                    h-4
                    w-4
                    shrink-0
                    transition-transform
                    duration-200
                    ease-in-out
                    group-data-[state=open]/promotion:rotate-90
                  "
                />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent
              className="
                overflow-hidden
                data-[state=closed]:animate-accordion-up
                data-[state=open]:animate-accordion-down
              "
            >
              <SidebarGroupContent>
                <SidebarMenu>

                  {/* Dashboard */}

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/promotion-dashboard")}
                      tooltip="Dashboard"
                    >
                      <Link to="/promotion-dashboard">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Master Audit */}

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/promotion-audits/master")}
                      tooltip="Master Audit"
                    >
                      <Link to="/promotion-audits/master">
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Master Audit</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Audit Failures */}

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/promotion-audits/failures")}
                      tooltip="Audit Failures"
                    >
                      <Link to="/promotion-audits/failures">
                        <Shield className="h-4 w-4" />
                        <span>Audit Failures</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* ==================================================
                      PROMOTION IMPORTS
                  ================================================== */}

                  <Collapsible
                    open={promotionImportsOpen}
                    onOpenChange={setPromotionImportsOpen}
                    className="group/promotion-imports"
                  >
                    <SidebarMenuItem>

                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip="Imports">
                          <FileSpreadsheet className="h-4 w-4" />

                          <span>
                            Imports
                          </span>

                          <ChevronRight
                            className="
                              ml-auto
                              h-4
                              w-4
                              shrink-0
                              transition-transform
                              duration-200
                              ease-in-out
                              group-data-[state=open]/promotion-imports:rotate-90
                            "
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent
                        className="
                          overflow-hidden
                          data-[state=closed]:animate-accordion-up
                          data-[state=open]:animate-accordion-down
                        "
                      >
                        <SidebarMenuSub>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/promotion-imports/roster")}
                            >
                              <Link to="/promotion-imports/roster">
                                <span>Roster</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/promotion-imports/department")}
                            >
                              <Link to="/promotion-imports/department">
                                <span>Department</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/promotion-imports/swat")}
                            >
                              <Link to="/promotion-imports/swat">
                                <span>SWAT</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/promotion-imports/mtf-7")}
                            >
                              <Link to="/promotion-imports/mtf-7">
                                <span>MTF-7</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/promotion-imports/mcd")}
                            >
                              <Link to="/promotion-imports/mcd">
                                <span>MCD</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/promotion-imports/tru")}
                            >
                              <Link to="/promotion-imports/tru">
                                <span>TRU</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/promotion-imports/teu")}
                            >
                              <Link to="/promotion-imports/teu">
                                <span>TEU</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/promotion-imports/sar")}
                            >
                              <Link to="/promotion-imports/sar">
                                <span>SAR</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  {/* ==================================================
                      PROMOTION REQUIREMENTS
                  ================================================== */}

                  <Collapsible
                    open={promotionRequirementsOpen}
                    onOpenChange={setPromotionRequirementsOpen}
                    className="group/promotion-requirements"
                  >
                    <SidebarMenuItem>

                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip="Requirements">
                          <ClipboardCheck className="h-4 w-4" />

                          <span>
                            Requirements
                          </span>

                          <ChevronRight
                            className="
                              ml-auto
                              h-4
                              w-4
                              shrink-0
                              transition-transform
                              duration-200
                              ease-in-out
                              group-data-[state=open]/promotion-requirements:rotate-90
                            "
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent
                        className="
                          overflow-hidden
                          data-[state=closed]:animate-accordion-up
                          data-[state=open]:animate-accordion-down
                        "
                      >
                        <SidebarMenuSub>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/promotion-requirements/department")}
                            >
                              <Link to="/promotion-requirements/department">
                                <span>Department</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/promotion-requirements/swat")}
                            >
                              <Link to="/promotion-requirements/swat">
                                <span>SWAT</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/promotion-requirements/mtf-7")}
                            >
                              <Link to="/promotion-requirements/mtf-7">
                                <span>MTF-7</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/promotion-requirements/mcd")}
                            >
                              <Link to="/promotion-requirements/mcd">
                                <span>MCD</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/promotion-requirements/tru")}
                            >
                              <Link to="/promotion-requirements/tru">
                                <span>TRU</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/promotion-requirements/teu")}
                            >
                              <Link to="/promotion-requirements/teu">
                                <span>TEU</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive("/promotion-requirements/sar")}
                            >
                              <Link to="/promotion-requirements/sar">
                                <span>SAR</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* ==========================================================
            ADMINISTRATION
        ========================================================== */}

        {hasPermission(user, "admin") && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/admin/permissions")}
                    tooltip="Permissions"
                  >
                    <Link to="/admin/permissions">
                      <Shield className="h-4 w-4" />
                      <span>Permissions</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ==========================================================
            SETTINGS
        ========================================================== */}

        <Collapsible
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          className="group/settings"
        >
          <SidebarGroup>

            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="
                  flex
                  w-full
                  items-center
                  gap-2
                  rounded-md
                  px-2
                  py-2
                  text-left
                  text-xs
                  font-semibold
                  text-muted-foreground
                "
              >
                <span>
                  Settings
                </span>

                <ChevronRight
                  className="
                    ml-auto
                    h-4
                    w-4
                    shrink-0
                    transition-transform
                    duration-200
                    ease-in-out
                    group-data-[state=open]/settings:rotate-90
                  "
                />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent
              className="
                overflow-hidden
                data-[state=closed]:animate-accordion-up
                data-[state=open]:animate-accordion-down
              "
            >
              <SidebarGroupContent>
                <SidebarMenu>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/settings")}
                      tooltip="Settings"
                    >
                      <Link to="/settings">
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

      </SidebarContent>

      {/* ============================================================
          FOOTER
      ============================================================ */}

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>

            <DropdownMenu>

              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip="Account"
                  className="
                    data-[state=open]:bg-sidebar-accent
                    data-[state=open]:text-sidebar-accent-foreground
                  "
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={avatarUrl}
                      alt={displayName}
                    />

                    <AvatarFallback className="rounded-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {displayName}
                    </span>

                    <span className="truncate text-xs text-muted-foreground">
                      {username}
                    </span>
                  </div>

                  <ChevronRight className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={8}
                className="
                  w-[--radix-dropdown-menu-trigger-width]
                  min-w-56
                  rounded-lg
                "
              >

                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-2">

                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={avatarUrl}
                        alt={displayName}
                      />

                      <AvatarFallback className="rounded-lg">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {displayName}
                      </span>

                      <span className="truncate text-xs text-muted-foreground">
                        {username}
                      </span>
                    </div>

                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <a href="/api/auth/logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </a>
                </DropdownMenuItem>

              </DropdownMenuContent>

            </DropdownMenu>

          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

    </Sidebar>
  )
}
