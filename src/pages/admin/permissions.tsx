import { useEffect, useMemo, useState } from "react"
import {
  Check,
  Loader2,
  Plus,
  Save,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react"

import DashboardLayout from "@/components/dashboard/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getSession, hasPermission, type User } from "@/lib/auth"

type PermissionGroup = {
  name: string
  description: string
  permissions: string[]
}

type Member = {
  roles: string[]
}

type PermissionResponse = {
  permissions: Record<string, PermissionGroup>
  members: Record<string, Member>
  superAdminIds: string[]
}

export default function PermissionsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [data, setData] = useState<PermissionResponse | null>(null)
  const [discordId, setDiscordId] = useState("")
  const [roles, setRoles] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    setError("")

    try {
      const [session, response] = await Promise.all([
        getSession(),
        fetch("/api/permissions", { credentials: "include" }),
      ])

      setUser(session)

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? "Failed to load permissions.")
      }

      setData(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load permissions.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const memberIds = useMemo(() => {
    if (!data) return []

    const query = search.trim().toLowerCase()
    return Object.keys(data.members).filter((id) => !query || id.includes(query))
  }, [data, search])

  function startNew() {
    setDiscordId("")
    setRoles([])
    setMessage("")
    setError("")
  }

  function editMember(id: string) {
    setDiscordId(id)
    setRoles(data?.members[id]?.roles ?? [])
    setMessage("")
    setError("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function toggleRole(role: string) {
    setRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    )
  }

  async function save() {
    setMessage("")
    setError("")

    if (!/^\d{17,20}$/.test(discordId.trim())) {
      setError("Enter a valid Discord ID.")
      return
    }

    setSaving(true)

    try {
      const response = await fetch(
        `/api/permissions/members/${discordId.trim()}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roles }),
        },
      )

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to save permissions.")
      }

      setMessage("Permissions saved successfully.")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save permissions.")
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm(`Remove all panel permissions from ${id}?`)) return

    setDeleting(id)
    setError("")
    setMessage("")

    try {
      const response = await fetch(`/api/permissions/members/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to remove permissions.")
      }

      if (discordId === id) startNew()
      setMessage("Member permissions removed.")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove permissions.")
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !hasPermission(user, "admin")) {
    return (
      <DashboardLayout>
        <div className="rounded-xl border border-border bg-card p-8">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to manage panel permissions.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/40">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Permissions</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage dashboard access for individual Discord IDs.
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <Check className="h-4 w-4 text-primary" />
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{discordId ? "Edit Member" : "Add Member"}</CardTitle>
              <CardDescription>
                Assign one or more permission groups to a Discord account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Discord ID</label>
                <Input
                  value={discordId}
                  onChange={(event) => setDiscordId(event.target.value.replace(/\D/g, ""))}
                  placeholder="123456789012345678"
                  inputMode="numeric"
                />
                <p className="text-xs text-muted-foreground">
                  Use the member's 17–20 digit Discord user ID.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Permission Groups</label>
                  <span className="text-xs text-muted-foreground">{roles.length} selected</span>
                </div>

                <div className="space-y-2">
                  {Object.entries(data?.permissions ?? {}).map(([key, group]) => {
                    const selected = roles.includes(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleRole(key)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                            {selected && <Check className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{group.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{group.description}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={save} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="animate-spin" /> : <Save />}
                  Save Changes
                </Button>
                {discordId && (
                  <Button variant="outline" onClick={startNew} disabled={saving} size="icon">
                    <X />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Assigned Members</CardTitle>
                  <CardDescription>
                    Discord IDs with panel-level permission groups.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={startNew}>
                  <Plus />
                  New
                </Button>
              </div>
              <div className="pt-3">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search Discord IDs..."
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data?.superAdminIds.map((id) => (
                  <div key={`super-${id}`} className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">Bootstrap Administrator</p>
                        <p className="truncate text-xs text-muted-foreground">{id}</p>
                      </div>
                      <span className="rounded-md border border-primary/20 px-2 py-1 text-xs font-medium text-primary">
                        Full Access
                      </span>
                    </div>
                  </div>
                ))}

                {memberIds.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <Users className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium">No assigned members</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add a Discord ID and permission group to get started.
                    </p>
                  </div>
                ) : (
                  memberIds.map((id) => {
                    const member = data?.members[id]
                    return (
                      <div key={id} className="rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">Discord Member</p>
                            <p className="truncate font-mono text-xs text-muted-foreground">{id}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(member?.roles ?? []).map((role) => (
                                <span key={role} className="rounded-md border border-border bg-muted/50 px-2 py-1 text-xs">
                                  {data?.permissions[role]?.name ?? role}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button variant="outline" size="sm" onClick={() => editMember(id)}>
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => remove(id)}
                              disabled={deleting === id}
                            >
                              {deleting === id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
