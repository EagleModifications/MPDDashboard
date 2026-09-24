import { useEffect, useRef, useState } from "react"
import { Check, Monitor, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

type Theme = "system" | "light" | "dark"

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function applyTheme(theme: Theme) {
  const root = document.documentElement

  if (theme === "system") {
    root.classList.toggle(
      "dark",
      getSystemTheme() === "dark",
    )
  } else {
    root.classList.toggle(
      "dark",
      theme === "dark",
    )
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system")
  const [open, setOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null

    const currentTheme: Theme =
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "system"
        ? savedTheme
        : "system"

    setTheme(currentTheme)
    applyTheme(currentTheme)

    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)",
    )

    const handleSystemThemeChange = () => {
      if (currentTheme === "system") {
        applyTheme("system")
      }
    }

    mediaQuery.addEventListener(
      "change",
      handleSystemThemeChange,
    )

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleSystemThemeChange,
      )
    }
  }, [])

  /* ===================================================== */
  /* CLOSE WHEN CLICKING OUTSIDE */
  /* ===================================================== */

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    )

    document.addEventListener(
      "keydown",
      handleKeyDown,
    )

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      )

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      )
    }
  }, [open])

  function changeTheme(newTheme: Theme) {
    setTheme(newTheme)

    localStorage.setItem(
      "theme",
      newTheme,
    )

    applyTheme(newTheme)

    setOpen(false)
  }

  const ThemeIcon =
    theme === "dark"
      ? Moon
      : theme === "light"
        ? Sun
        : Monitor

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      {/* Theme Button */}

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="
          h-8
          w-8
          rounded-full
          border-border
          bg-background
          text-foreground
          transition-all
          hover:border-foreground
          hover:bg-foreground/15
          hover:text-foreground
        "
        onClick={() => setOpen((value) => !value)}
        aria-label="Change theme"
        aria-expanded={open}
      >
        <ThemeIcon className="h-4 w-4" />
      </Button>

      {/* Theme Dropdown */}

      {open && (
        <div
          className="
            absolute
            right-0
            top-10
            z-[100]
            w-36
            rounded-lg
            border
            border-border
            bg-background
            p-1
            text-foreground
            shadow-xl
            animate-in
            fade-in-0
            zoom-in-95
            duration-150
          "
        >
          <ThemeOption
            icon={<Monitor className="h-4 w-4" />}
            label="System"
            selected={theme === "system"}
            onClick={() => changeTheme("system")}
          />

          <ThemeOption
            icon={<Sun className="h-4 w-4" />}
            label="Light"
            selected={theme === "light"}
            onClick={() => changeTheme("light")}
          />

          <ThemeOption
            icon={<Moon className="h-4 w-4" />}
            label="Dark"
            selected={theme === "dark"}
            onClick={() => changeTheme("dark")}
          />
        </div>
      )}
    </div>
  )
}

type ThemeOptionProps = {
  icon: React.ReactNode
  label: string
  selected: boolean
  onClick: () => void
}

function ThemeOption({
  icon,
  label,
  selected,
  onClick,
}: ThemeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex
        w-full
        items-center
        gap-3
        rounded-md
        px-3
        py-2
        text-sm
        transition-colors
        ${
          selected
            ? "bg-foreground text-background"
            : "text-foreground hover:bg-foreground/15"
        }
      `}
    >
      {icon}

      <span className="flex-1 text-left">
        {label}
      </span>

      {selected && (
        <Check className="h-4 w-4" />
      )}
    </button>
  )
}