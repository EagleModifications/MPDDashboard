import { useMemo, useState } from "react"
import {
  Bell,
  CheckCircle2,
  Search,
  ShieldCheck,
  X,
} from "lucide-react"

import DashboardLayout from "@/components/dashboard/DashboardLayout"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Notification {
  id: number
  title: string
  description: string
  date: string
  relativeTime: string
  type: "success" | "warning" | "info"
  unread: boolean
}

const notifications: Notification[] = [
  {
    id: 1,
    title: "Audit Completed",
    description:
      "Your department audit has been completed successfully.",
    date: "9 Aug 2026, 5:35 am BST",
    relativeTime: "about 2 months ago",
    type: "success",
    unread: true,
  },
]

export default function NotificationsPage() {
  const [search, setSearch] = useState("")
  const [type, setType] = useState("all")

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase()

    return notifications.filter((notification) => {
      const matchesSearch =
        query.length === 0 ||
        notification.title.toLowerCase().includes(query) ||
        notification.description.toLowerCase().includes(query)

      const matchesType =
        type === "all" || notification.type === type

      return matchesSearch && matchesType
    })
  }, [search, type])

  const unreadCount = notifications.filter(
    (notification) => notification.unread,
  ).length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                border
                border-border
                bg-card
              "
            >
              <Bell className="h-5 w-5 text-blue-500" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">
                  Notifications
                </h1>

                {unreadCount > 0 && (
                  <span
                    className="
                      rounded-full
                      bg-blue-500/10
                      px-2
                      py-0.5
                      text-[11px]
                      font-medium
                      text-blue-500
                    "
                  >
                    {unreadCount} unread
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                Stay up to date with activity across the MPD dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          className="
            flex
            flex-col
            gap-3
            rounded-xl
            border
            border-border
            bg-card
            p-4
            md:flex-row
            md:items-center
          "
        >
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="
                absolute
                left-3
                top-1/2
                h-4
                w-4
                -translate-y-1/2
                text-muted-foreground
              "
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notifications..."
              className="
                h-9
                w-full
                rounded-md
                border
                border-border
                bg-background
                pl-9
                pr-9
                text-sm
                outline-none
                transition-colors
                placeholder:text-muted-foreground
                focus:border-blue-500/50
                focus:ring-2
                focus:ring-blue-500/10
              "
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="
                  absolute
                  right-2
                  top-1/2
                  flex
                  h-6
                  w-6
                  -translate-y-1/2
                  items-center
                  justify-center
                  rounded-md
                  text-muted-foreground
                  transition-colors
                  hover:bg-muted
                  hover:text-foreground
                "
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <Select
            value={type}
            onValueChange={setType}
          >
            <SelectTrigger className="h-9 w-full rounded-md md:w-[170px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                All Types
              </SelectItem>

              <SelectItem value="success">
                Success
              </SelectItem>

              <SelectItem value="warning">
                Warning
              </SelectItem>

              <SelectItem value="info">
                Information
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Recent Notifications */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Recent Notifications
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Recent dashboard activity and alerts.
              </p>
            </div>

            <span className="text-xs text-muted-foreground">
              {filteredNotifications.length}{" "}
              {filteredNotifications.length === 1
                ? "notification"
                : "notifications"}
            </span>
          </div>

          {filteredNotifications.length > 0 ? (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          ) : (
            <div
              className="
                flex
                min-h-[260px]
                flex-col
                items-center
                justify-center
                rounded-xl
                border
                border-dashed
                border-border
                bg-card
                px-6
                text-center
              "
            >
              <div
                className="
                  mb-3
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  bg-muted
                "
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>

              <h3 className="text-sm font-semibold">
                No notifications found
              </h3>

              <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                There are no notifications matching your current
                search or filter.
              </p>

              {(search || type !== "all") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-md"
                  onClick={() => {
                    setSearch("")
                    setType("all")
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}

type NotificationCardProps = {
  notification: Notification
}

function NotificationCard({
  notification,
}: NotificationCardProps) {
  const iconStyles =
    notification.type === "success"
      ? "bg-emerald-500/10 text-emerald-500"
      : notification.type === "warning"
        ? "bg-amber-500/10 text-amber-500"
        : "bg-blue-500/10 text-blue-500"

  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-xl
        border
        border-border
        bg-card
        shadow-sm
        transition-colors
        hover:bg-muted/20
      "
    >
      {/* Unread indicator */}
      {notification.unread && (
        <div
          className="
            absolute
            bottom-0
            left-0
            top-0
            w-1
            bg-blue-500
          "
        />
      )}

      <div className="flex gap-4 p-5">
        {/* Notification Icon */}
        <div
          className={`
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-full
            ${iconStyles}
          `}
        >
          {notification.type === "success" ? (
            <ShieldCheck className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </div>

        {/* Notification Content */}
        <div className="min-w-0 flex-1">
          <div
            className="
              flex
              flex-col
              gap-2
              sm:flex-row
              sm:items-start
              sm:justify-between
            "
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">
                {notification.title}
              </h3>

              {notification.unread && (
                <span
                  className="
                    rounded-full
                    bg-blue-500/10
                    px-2
                    py-0.5
                    text-[10px]
                    font-medium
                    text-blue-500
                  "
                >
                  New
                </span>
              )}
            </div>

            <span className="shrink-0 text-xs text-muted-foreground">
              {notification.relativeTime}
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {notification.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {notification.date}
            </span>

            <span className="text-border">
              •
            </span>

            <span
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-full
                bg-emerald-500/10
                px-2
                py-1
                text-[11px]
                font-medium
                text-emerald-500
              "
            >
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}