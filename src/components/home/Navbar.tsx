import { useEffect, useState } from "react"
import { NavLink, Link } from "react-router-dom"
import { LogIn, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import ThemeToggle from "@/components/theme-toggle"

import {
  getSession,
  hasPermission,
  type User,
} from "@/lib/auth"

type NavItem = {
  name: string
  href: string
  public?: boolean
  permission?: string
}

const navItems: NavItem[] = [
  {
    name: "Home",
    href: "/",
    public: true,
  },
  {
    name: "Dashboard",
    href: "/dashboard",
    permission: "view",
  },
  {
    name: "Audits",
    href: "/audits",
    permission: "audit",
  },
  {
    name: "Imports",
    href: "/imports",
    permission: "import",
  },
  {
    name: "Requirements",
    href: "/requirements",
    permission: "requirements",
  },
  {
    name: "Admin",
    href: "/admin",
    permission: "admin",
  },
]

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    getSession().then(setUser)
  }, [])

  const visibleItems = navItems.filter((item) => {
    if (item.public) {
      return true
    }

    if (!user) {
      return false
    }

    if (item.permission) {
      return hasPermission(user, item.permission)
    }

    return true
  })

  return (
    <header className="absolute left-0 top-0 z-50 w-full px-10 py-5">
      <div className="flex w-full items-center">

        {/* LEFT — Logo / Department Name */}
        <div className="flex min-w-0 flex-1 items-center justify-start pl-12">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3"
          >
            <img
              src="/logo.png"
              alt="Metro Police Department"
              className="h-9 w-9 shrink-0 object-contain"
            />

            <span className="truncate text-lg font-bold text-foreground">
              Metro Police Department
            </span>
          </Link>
        </div>

        {/* CENTER — Navigation */}
        <nav className="flex shrink-0 items-center justify-center gap-8 whitespace-nowrap px-12 text-sm">
          {visibleItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                `
                  font-medium
                  transition-colors
                  ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }
                `
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* RIGHT — Theme / Authentication */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-4 pr-20">

          {/* Theme Selector */}
          <ThemeToggle />

          {/* Authentication */}
          {user ? (
            <Button
              variant="outline"
              className="
                h-7
                w-30
                gap-4
                border-border
                bg-transparent
                px-4
                text-xs
                text-foreground
                transition-all
                hover:border-foreground
                hover:bg-foreground/10
                hover:text-foreground
              "
              onClick={() => {
                window.location.href = "/api/auth/logout"
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <Button
              asChild
              className="
                h-7
                w-26
                gap-4
                border-border
                bg-foreground
                px-4
                text-xs
                text-background
                transition-all
                hover:bg-foreground/85
                hover:text-background
              "
            >
              <Link to="/sign-in">
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </Button>
          )}

        </div>
      </div>
    </header>
  )
}