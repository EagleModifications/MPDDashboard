import DashboardLayout from "@/components/dashboard/DashboardLayout"

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Metro Police Department overview and activity.
          </p>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Department Members"
            value="0"
            description="Active members"
          />

          <StatCard
            title="Audits"
            value="0"
            description="Audits completed"
          />

          <StatCard
            title="Audit Failures"
            value="0"
            description="Failed audits"
          />

          <StatCard
            title="Pending"
            value="0"
            description="Items requiring attention"
          />
        </div>

        {/* Recent activity */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">
            Recent Activity
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Recent department activity will appear here.
          </p>
        </section>
      </div>
    </DashboardLayout>
  )
}

type StatCardProps = {
  title: string
  value: string
  description: string
}

function StatCard({
  title,
  value,
  description,
}: StatCardProps) {
  return (
    <div
      className="
        rounded-xl
        border
        border-border
        bg-card
        p-5
        shadow-sm
      "
    >
      <p className="text-sm text-muted-foreground">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  )
}