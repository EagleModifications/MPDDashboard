import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Shield } from "lucide-react"

import DashboardLayout from "@/components/dashboard/DashboardLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSession, hasPermission, type User } from "@/lib/auth"

export default function Admin() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    getSession().then(setUser)
  }, [])

  if (!user) {
    return null
  }

  if (!hasPermission(user, "admin")) {
    return (
      <DashboardLayout>
        <div className="rounded-xl border border-border bg-card p-8">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">
            You do not have permission to access administration.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage website access and administrative settings.
          </p>
        </div>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Discord Permissions
            </CardTitle>
            <CardDescription>
              Assign dashboard permission groups to Discord IDs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/admin/permissions">
                Manage Permissions
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
