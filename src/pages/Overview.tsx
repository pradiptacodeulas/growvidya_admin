import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
import { fetchDashboardStatsApi, type DashboardStatsResponse } from "@/services/subscriptionService"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Building2,
  CreditCard,
  IndianRupee,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Cpu,
  IdCard,
  TicketPercent,
  Landmark,
  RefreshCw,
  ArrowUpRight,
  Eye,
  ShieldCheck,
  LayoutDashboard,
  LifeBuoy,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  ShoppingBag,
} from "lucide-react"

interface DonutSlice {
  label: string
  value: number
  color: string
  displayValue?: string
}

function DonutChart({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[]
  centerLabel: string
  centerValue: string
}) {
  const total = slices.reduce((sum, s) => sum + (Number(s.value) || 0), 0)
  const radius = 58
  const circumference = 2 * Math.PI * radius
  let cumulativePercent = 0

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative size-36 shrink-0 flex items-center justify-center">
        <svg className="size-full -rotate-90" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="16"
            className="text-muted/40"
          />
          {total > 0 &&
            slices.map((slice, idx) => {
              const val = Number(slice.value) || 0
              if (val <= 0) return null
              const pct = val / total
              const strokeDasharray = `${pct * circumference} ${circumference}`
              const strokeDashoffset = -cumulativePercent * circumference
              cumulativePercent += pct
              return (
                <circle
                  key={idx}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth="16"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              )
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {centerLabel}
          </span>
          <span className="text-sm font-bold text-foreground truncate max-w-[96px]">
            {centerValue}
          </span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2 min-w-0">
        {slices.map((slice, idx) => {
          const val = Number(slice.value) || 0
          const pct = total > 0 ? Math.round((val / total) * 100) : 0
          return (
            <div key={idx} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-muted-foreground truncate">{slice.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 font-medium text-foreground">
                <span>{slice.displayValue ?? val}</span>
                <span className="text-[11px] text-muted-foreground">({pct}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Overview() {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)
  const adminUser = useAppSelector((state) => state.auth.user)
  const { can } = usePermission()

  const canViewSubscriptions = can(["subscriptions", "schools"], "can_view")
  const canViewPackages = can("packages", "can_view")
  const canViewStorage = can("storage_plans", "can_view")
  const canViewMachines = can("attendance_machines", "can_view")
  const canViewRfid = can("rfid_cards", "can_view")
  const canViewCoupons = can("coupons", "can_view")
  const canViewBanks = can("bank_accounts", "can_view")
  const canViewTickets = can("support_tickets", "can_view")

  const [stats, setStats] = useState<DashboardStatsResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const loadDashboardStats = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const data = await fetchDashboardStatsApi(token)
      setStats(data)
    } catch (err: any) {
      console.error("Failed to fetch dashboard stats:", err)
      toast.error(err?.message || "Could not load dashboard statistics.")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadDashboardStats()
  }, [loadDashboardStats])

  const formatCurrency = (val: number | string | undefined) => {
    const num = Number(val || 0)
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—"
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getSubscriptionBadge = (status?: string) => {
    switch ((status || "").toLowerCase()) {
      case "active":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium px-2 py-0.5 shrink-0">
            Active
          </Badge>
        )
      case "trial":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 font-medium px-2 py-0.5 shrink-0">
            Trial
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium px-2 py-0.5 shrink-0">
            Pending
          </Badge>
        )
      case "expired":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-medium px-2 py-0.5 shrink-0">
            Expired
          </Badge>
        )
      case "suspended":
        return (
          <Badge variant="outline" className="text-muted-foreground shrink-0">
            Suspended
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground shrink-0">
            No Plan
          </Badge>
        )
    }
  }

  const getTicketPriorityBadge = (priority?: string) => {
    switch ((priority || "").toLowerCase()) {
      case "urgent":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px] px-1.5 py-0">
            Urgent
          </Badge>
        )
      case "high":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">
            High
          </Badge>
        )
      case "medium":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0">
            Medium
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0">
            Low
          </Badge>
        )
    }
  }

  // Prepare real database slices for Donut Charts
  const revenueSlices: DonutSlice[] = [
    {
      label: "Subscriptions",
      value: stats?.revenueSummary?.subscriptionRevenue || 0,
      color: "#10b981",
      displayValue: formatCurrency(stats?.revenueSummary?.subscriptionRevenue || 0),
    },
    {
      label: "Attendance Machines",
      value: stats?.revenueSummary?.machineRevenue || 0,
      color: "#6366f1",
      displayValue: formatCurrency(stats?.revenueSummary?.machineRevenue || 0),
    },
    {
      label: "RFID Cards",
      value: stats?.revenueSummary?.rfidRevenue || 0,
      color: "#14b8a6",
      displayValue: formatCurrency(stats?.revenueSummary?.rfidRevenue || 0),
    },
    {
      label: "Storage Plans",
      value: stats?.revenueSummary?.storageRevenue || 0,
      color: "#0ea5e9",
      displayValue: formatCurrency(stats?.revenueSummary?.storageRevenue || 0),
    },
  ]

  const subscriptionStatusSlices: DonutSlice[] = [
    { label: "Active", value: stats?.subscriptions?.active || 0, color: "#10b981" },
    { label: "Trial", value: stats?.subscriptions?.trial || 0, color: "#3b82f6" },
    { label: "Pending", value: stats?.subscriptions?.pending || 0, color: "#f59e0b" },
    { label: "Expired", value: stats?.subscriptions?.expired || 0, color: "#f43f5e" },
    { label: "Suspended", value: stats?.subscriptions?.suspended || 0, color: "#64748b" },
  ]

  const supportTicketSlices: DonutSlice[] = [
    { label: "Open", value: stats?.supportTickets?.open || 0, color: "#f59e0b" },
    { label: "In Progress", value: stats?.supportTickets?.inProgress || 0, color: "#3b82f6" },
    { label: "Resolved", value: stats?.supportTickets?.resolved || 0, color: "#10b981" },
    { label: "Closed", value: stats?.supportTickets?.closed || 0, color: "#64748b" },
  ]

  const monthlyTrends = stats?.monthlyTrends || []
  const maxMonthlyRevenue = Math.max(
    ...monthlyTrends.map((m) => Number(m.totalRevenue) || 0),
    1
  )

  const planDistribution = stats?.planDistribution || []
  const totalPlanSubscribers = planDistribution.reduce(
    (sum, p) => sum + (Number(p.total_subscribers) || 0),
    0
  )

  const totalAddonOrders =
    (stats?.addonBuyers?.storage?.totalOrders || 0) +
    (stats?.addonBuyers?.attendanceMachines?.totalOrders || 0) +
    (stats?.addonBuyers?.rfidCards?.totalOrders || 0)

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <LayoutDashboard className="size-6 text-primary shrink-0" />
            <span className="truncate">
              Welcome back{adminUser?.first_name ? `, ${adminUser.first_name}` : ""}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time analytics across schools, subscriptions, add-on orders, revenue, and support tickets.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardStats}
            disabled={loading}
            className="h-9 px-3 gap-1.5 cursor-pointer text-xs font-semibold"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          {canViewSubscriptions && (
            <Button
              size="sm"
              onClick={() => navigate("/subscriptions")}
              className="h-9 px-3.5 gap-1.5 cursor-pointer shadow-xs text-xs font-semibold"
            >
              <ShieldCheck className="size-4" />
              <span>Manage Subscriptions</span>
            </Button>
          )}
        </div>
      </div>

      {/* Primary Executive KPI Cards (6 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Total Platform Revenue */}
        <Card className="border border-border/80 shadow-xs min-w-0">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Platform Revenue
              </p>
              {loading ? (
                <Skeleton className="h-8 w-32 mt-1" />
              ) : (
                <>
                  <div className="text-2xl font-bold tracking-tight text-foreground truncate">
                    {formatCurrency(stats?.revenueSummary?.totalPlatformRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This month:{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(stats?.revenueSummary?.thisMonthPlatformRevenue)}
                    </span>
                  </p>
                </>
              )}
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <IndianRupee className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* 2. Subscription Revenue */}
        <Card className="border border-border/80 shadow-xs min-w-0">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Subscription Revenue
              </p>
              {loading ? (
                <Skeleton className="h-8 w-28 mt-1" />
              ) : (
                <>
                  <div className="text-2xl font-bold tracking-tight text-foreground truncate">
                    {formatCurrency(stats?.subscriptions?.totalRevenue)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{stats?.subscriptions?.pendingPayments || 0} pending payment(s)</span>
                    <span>•</span>
                    <span>Discount: {formatCurrency(stats?.subscriptions?.totalDiscount)}</span>
                  </div>
                </>
              )}
            </div>
            <div className="size-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <CreditCard className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* 3. Add-on Orders Revenue */}
        <Card className="border border-border/80 shadow-xs min-w-0">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Add-on & Hardware Sales
              </p>
              {loading ? (
                <Skeleton className="h-8 w-28 mt-1" />
              ) : (
                <>
                  <div className="text-2xl font-bold tracking-tight text-foreground truncate">
                    {formatCurrency(stats?.revenueSummary?.addonRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across <span className="font-semibold text-foreground">{totalAddonOrders}</span> machine, RFID & storage orders
                  </p>
                </>
              )}
            </div>
            <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* 4. Registered Schools */}
        <Card className="border border-border/80 shadow-xs min-w-0">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Registered Schools
              </p>
              {loading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {stats?.schools?.total || 0}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {stats?.schools?.active || 0} Active
                    </span>
                    <span>•</span>
                    <span>{stats?.schools?.inactive || 0} Inactive</span>
                    <span>•</span>
                    <span>+{stats?.schools?.thisMonth || 0} this month</span>
                  </div>
                </>
              )}
            </div>
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Building2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* 5. Active & Trial Subscriptions */}
        <Card className="border border-border/80 shadow-xs min-w-0">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                School Subscriptions
              </p>
              {loading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {stats?.subscriptions?.total || 0}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {stats?.subscriptions?.active || 0} Active
                    </span>
                    <span>•</span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {stats?.subscriptions?.trial || 0} Trial
                    </span>
                    <span>•</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {stats?.subscriptions?.pending || 0} Pending
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <TrendingUp className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* 6. Help & Support Tickets */}
        <Card
          onClick={() => canViewTickets && navigate("/support-tickets")}
          className={`border border-border/80 shadow-xs min-w-0 transition-colors ${
            canViewTickets ? "hover:border-primary/50 cursor-pointer" : ""
          }`}
        >
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Help & Support Tickets
              </p>
              {loading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-foreground">
                      {stats?.supportTickets?.total || 0}
                    </span>
                    {(stats?.supportTickets?.urgentOpen || 0) > 0 && (
                      <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px] px-1.5 py-0">
                        {stats?.supportTickets?.urgentOpen} High/Urgent
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {stats?.supportTickets?.open || 0} Open
                    </span>
                    <span>•</span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {stats?.supportTickets?.inProgress || 0} In Progress
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {stats?.supportTickets?.resolved || 0} Resolved
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <LifeBuoy className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Monthly Revenue Trend Bar Chart + Revenue Source Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 6-Month Revenue & School Growth Bar Chart */}
        <Card className="lg:col-span-2 border border-border/80 shadow-xs py-0 gap-0 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BarChart3 className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Monthly Revenue & School Onboarding (Last 6 Months)</h3>
                <p className="text-xs text-muted-foreground">
                  Subscriptions vs. Add-on orders revenue and newly registered schools per month
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2.5 rounded-sm bg-emerald-500" /> Subscriptions
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2.5 rounded-sm bg-indigo-500" /> Add-ons
              </span>
            </div>
          </div>

          <CardContent className="p-5">
            {loading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-56 pt-6">
                {monthlyTrends.map((m) => {
                  const subHeightPct =
                    maxMonthlyRevenue > 0
                      ? Math.round(((Number(m.subscriptionRevenue) || 0) / maxMonthlyRevenue) * 100)
                      : 0
                  const addonHeightPct =
                    maxMonthlyRevenue > 0
                      ? Math.round(((Number(m.addonRevenue) || 0) / maxMonthlyRevenue) * 100)
                      : 0
                  const totalHeightPct = Math.min(100, subHeightPct + addonHeightPct)

                  return (
                    <div
                      key={m.monthKey}
                      className="flex flex-col items-center h-full justify-end group min-w-0"
                    >
                      <div className="text-[10px] font-semibold text-foreground mb-1 truncate max-w-full">
                        {formatCurrency(m.totalRevenue)}
                      </div>
                      <div className="w-full max-w-[44px] h-36 bg-muted/35 rounded-t-md flex flex-col justify-end overflow-hidden border border-border/40">
                        {totalHeightPct === 0 ? (
                          <div className="w-full h-1 bg-muted-foreground/20" />
                        ) : (
                          <>
                            {addonHeightPct > 0 && (
                              <div
                                style={{ height: `${addonHeightPct}%` }}
                                className="w-full bg-indigo-500 transition-all duration-500"
                                title={`Add-ons: ${formatCurrency(m.addonRevenue)}`}
                              />
                            )}
                            {subHeightPct > 0 && (
                              <div
                                style={{ height: `${subHeightPct}%` }}
                                className="w-full bg-emerald-500 transition-all duration-500"
                                title={`Subscriptions: ${formatCurrency(m.subscriptionRevenue)}`}
                              />
                            )}
                          </>
                        )}
                      </div>
                      <div className="mt-2 text-xs font-medium text-foreground truncate">
                        {m.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {m.newSchools} school{m.newSchools === 1 ? "" : "s"}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Source Breakdown Donut Chart */}
        <Card className="border border-border/80 shadow-xs py-0 gap-0 min-w-0">
          <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-4">
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <PieChartIcon className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Revenue by Source</h3>
              <p className="text-xs text-muted-foreground">
                Share of platform revenue by product line
              </p>
            </div>
          </div>

          <CardContent className="p-5 flex items-center">
            {loading ? (
              <Skeleton className="h-44 w-full" />
            ) : (
              <div className="w-full">
                <DonutChart
                  slices={revenueSlices}
                  centerLabel="Total"
                  centerValue={formatCurrency(stats?.revenueSummary?.totalPlatformRevenue)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Subscription Status Donut + Support Tickets Donut + Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Status Distribution Donut */}
        <Card className="border border-border/80 shadow-xs py-0 gap-0 min-w-0">
          <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-4">
            <div className="size-8 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <CreditCard className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Subscription Status Split</h3>
              <p className="text-xs text-muted-foreground">
                Lifecycle distribution of school subscriptions
              </p>
            </div>
          </div>
          <CardContent className="p-5">
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <DonutChart
                slices={subscriptionStatusSlices}
                centerLabel="Subscriptions"
                centerValue={String(stats?.subscriptions?.total || 0)}
              />
            )}
          </CardContent>
        </Card>

        {/* Support Tickets Distribution Donut */}
        <Card className="border border-border/80 shadow-xs py-0 gap-0 min-w-0">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <LifeBuoy className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate">Support Tickets Breakdown</h3>
                <p className="text-xs text-muted-foreground truncate">
                  Status & priority split of school tickets
                </p>
              </div>
            </div>
            {canViewTickets && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/support-tickets")}
                className="h-7 px-2 text-xs cursor-pointer shrink-0"
              >
                View <ArrowUpRight className="ml-0.5 size-3" />
              </Button>
            )}
          </div>
          <CardContent className="p-5 space-y-4">
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <DonutChart
                  slices={supportTicketSlices}
                  centerLabel="Tickets"
                  centerValue={String(stats?.supportTickets?.total || 0)}
                />
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/60 text-center">
                  <div className="rounded-md bg-rose-500/10 px-2 py-1">
                    <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      {stats?.supportTickets?.priorities?.urgent || 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Urgent</div>
                  </div>
                  <div className="rounded-md bg-amber-500/10 px-2 py-1">
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {stats?.supportTickets?.priorities?.high || 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground">High</div>
                  </div>
                  <div className="rounded-md bg-blue-500/10 px-2 py-1">
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {stats?.supportTickets?.priorities?.medium || 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Medium</div>
                  </div>
                  <div className="rounded-md bg-muted px-2 py-1">
                    <div className="text-xs font-bold text-foreground">
                      {stats?.supportTickets?.priorities?.low || 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Low</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Plan-wise Subscriber & Revenue Distribution */}
        <Card className="border border-border/80 shadow-xs py-0 gap-0 min-w-0">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Package className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate">Package Popularity</h3>
                <p className="text-xs text-muted-foreground truncate">
                  Subscribers & revenue by subscription plan
                </p>
              </div>
            </div>
            {canViewPackages && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/plans-pricing")}
                className="h-7 px-2 text-xs cursor-pointer shrink-0"
              >
                Plans <ArrowUpRight className="ml-0.5 size-3" />
              </Button>
            )}
          </div>
          <CardContent className="p-5">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : planDistribution.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No subscription packages configured yet.
              </p>
            ) : (
              <div className="space-y-3.5 max-h-52 overflow-y-auto pr-1">
                {planDistribution.map((plan) => {
                  const pct =
                    totalPlanSubscribers > 0
                      ? Math.round((plan.total_subscribers / totalPlanSubscribers) * 100)
                      : 0
                  return (
                    <div key={plan.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-foreground truncate">
                          {plan.plan_name}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {plan.total_subscribers} school(s) ({pct}%) •{" "}
                          <strong className="text-foreground">
                            {formatCurrency(plan.total_revenue)}
                          </strong>
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add-on Buyers & Order Fulfillment Summary */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Add-on Buyers & Order Fulfillment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Storage Plan Buyers */}
          <Card
            onClick={() => canViewStorage && navigate("/storage-plans/buyers")}
            className={`border border-border/80 shadow-xs transition-colors ${
              canViewStorage ? "hover:border-primary/50 cursor-pointer" : ""
            }`}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <HardDrive className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Storage Plan Buyers</p>
                    <p className="text-xs text-muted-foreground">
                      {stats?.addonBuyers?.storage?.totalOrders || 0} order(s)
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {formatCurrency(stats?.addonBuyers?.storage?.totalRevenue)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {stats?.addonBuyers?.storage?.activeCount || 0} Active
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {stats?.addonBuyers?.storage?.pendingCount || 0} Pending
                </span>
                <span>{stats?.addonBuyers?.storage?.expiredCount || 0} Expired</span>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Machine Buyers */}
          <Card
            onClick={() => canViewMachines && navigate("/attendance-machines/buyers")}
            className={`border border-border/80 shadow-xs transition-colors ${
              canViewMachines ? "hover:border-primary/50 cursor-pointer" : ""
            }`}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Cpu className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Attendance Machine Buyers</p>
                    <p className="text-xs text-muted-foreground">
                      {stats?.addonBuyers?.attendanceMachines?.totalOrders || 0} order(s) •{" "}
                      {stats?.addonBuyers?.attendanceMachines?.totalQuantity || 0} unit(s)
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {formatCurrency(stats?.addonBuyers?.attendanceMachines?.totalRevenue)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2.5">
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {stats?.addonBuyers?.attendanceMachines?.pendingCount || 0} Pending
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {stats?.addonBuyers?.attendanceMachines?.dispatchedCount || 0} Dispatched
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {stats?.addonBuyers?.attendanceMachines?.deliveredCount || 0} Delivered
                </span>
              </div>
            </CardContent>
          </Card>

          {/* RFID Card Buyers */}
          <Card
            onClick={() => canViewRfid && navigate("/rfid-cards/buyers")}
            className={`border border-border/80 shadow-xs transition-colors ${
              canViewRfid ? "hover:border-primary/50 cursor-pointer" : ""
            }`}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <IdCard className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">RFID Card Buyers</p>
                    <p className="text-xs text-muted-foreground">
                      {stats?.addonBuyers?.rfidCards?.totalOrders || 0} order(s) •{" "}
                      {stats?.addonBuyers?.rfidCards?.totalQuantity || 0} card(s)
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {formatCurrency(stats?.addonBuyers?.rfidCards?.totalRevenue)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2.5">
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {stats?.addonBuyers?.rfidCards?.pendingCount || 0} Pending
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {stats?.addonBuyers?.rfidCards?.dispatchedCount || 0} Dispatched
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {stats?.addonBuyers?.rfidCards?.deliveredCount || 0} Delivered
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Platform Catalog & Payment Masters */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Platform Catalog & Payment Masters
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Subscription Plans */}
          <Card
            onClick={() => canViewPackages && navigate("/plans-pricing")}
            className={`border border-border/80 shadow-xs transition-colors min-w-0 ${
              canViewPackages ? "hover:border-primary/50 cursor-pointer" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Package className="size-4" />
                </div>
                {canViewPackages && <ArrowUpRight className="size-4 text-muted-foreground" />}
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground">Subscription Plans</p>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold">{stats?.packages?.total ?? 0}</span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {stats?.packages?.active ?? 0} active
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Storage Plans */}
          <Card
            onClick={() => canViewStorage && navigate("/storage-plans")}
            className={`border border-border/80 shadow-xs transition-colors min-w-0 ${
              canViewStorage ? "hover:border-primary/50 cursor-pointer" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <HardDrive className="size-4" />
                </div>
                {canViewStorage && <ArrowUpRight className="size-4 text-muted-foreground" />}
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground">Storage Plans</p>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold">{stats?.storagePlans?.total ?? 0}</span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {stats?.storagePlans?.active ?? 0} active
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Machines */}
          <Card
            onClick={() => canViewMachines && navigate("/attendance-machines")}
            className={`border border-border/80 shadow-xs transition-colors min-w-0 ${
              canViewMachines ? "hover:border-primary/50 cursor-pointer" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Cpu className="size-4" />
                </div>
                {canViewMachines && <ArrowUpRight className="size-4 text-muted-foreground" />}
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground">Attendance Machines</p>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold">{stats?.attendanceMachines?.total ?? 0}</span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {stats?.attendanceMachines?.active ?? 0} active
                </span>
              </div>
            </CardContent>
          </Card>

          {/* RFID Cards */}
          <Card
            onClick={() => canViewRfid && navigate("/rfid-cards")}
            className={`border border-border/80 shadow-xs transition-colors min-w-0 ${
              canViewRfid ? "hover:border-primary/50 cursor-pointer" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="size-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <IdCard className="size-4" />
                </div>
                {canViewRfid && <ArrowUpRight className="size-4 text-muted-foreground" />}
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground">RFID Cards</p>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold">{stats?.rfidCards?.total ?? 0}</span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {stats?.rfidCards?.active ?? 0} active
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Discount Coupons */}
          <Card
            onClick={() => canViewCoupons && navigate("/coupons")}
            className={`border border-border/80 shadow-xs transition-colors min-w-0 ${
              canViewCoupons ? "hover:border-primary/50 cursor-pointer" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="size-8 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                  <TicketPercent className="size-4" />
                </div>
                {canViewCoupons && <ArrowUpRight className="size-4 text-muted-foreground" />}
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground">Discount Coupons</p>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold">{stats?.coupons?.total ?? 0}</span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {stats?.coupons?.totalUsages ?? 0} used
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Bank Accounts */}
          <Card
            onClick={() => canViewBanks && navigate("/bank-accounts")}
            className={`border border-border/80 shadow-xs transition-colors min-w-0 ${
              canViewBanks ? "hover:border-primary/50 cursor-pointer" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="size-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <Landmark className="size-4" />
                </div>
                {canViewBanks && <ArrowUpRight className="size-4 text-muted-foreground" />}
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground">Bank Accounts</p>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold">{stats?.bankAccounts?.total ?? 0}</span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {stats?.bankAccounts?.active ?? 0} active
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Live Lists: Pending Subscriptions, Recent Support Tickets & Recent Schools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Pending Subscription Approvals */}
        <Card className="border border-border/80 shadow-xs py-0 gap-0 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate">Pending Approvals</h3>
                <p className="text-xs text-muted-foreground truncate">
                  Awaiting payment/plan verification
                </p>
              </div>
            </div>
            {canViewSubscriptions && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/subscriptions")}
                className="h-8 text-xs shrink-0 cursor-pointer"
              >
                All <ArrowUpRight className="ml-1 size-3.5" />
              </Button>
            )}
          </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !stats?.pendingSubscriptions || stats.pendingSubscriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                <CheckCircle2 className="size-8 text-emerald-500/70" />
                <p className="mt-2 text-sm font-medium">All caught up!</p>
                <p className="text-xs text-muted-foreground">
                  No pending subscription approvals right now.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {stats.pendingSubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {sub.school_name}
                        </p>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {sub.plan_name || "Plan"}
                        </span>
                        <span>•</span>
                        <span>{formatCurrency(sub.amount_paid || sub.plan_price)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getSubscriptionBadge(sub.status)}
                      {canViewSubscriptions && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigate(`/subscriptions/${sub.id}`)}
                          className="size-8 cursor-pointer"
                          title="View Subscription Details"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Recent Support Tickets */}
        <Card className="border border-border/80 shadow-xs py-0 gap-0 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <LifeBuoy className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate">Recent Support Tickets</h3>
                <p className="text-xs text-muted-foreground truncate">
                  Latest help requests from schools
                </p>
              </div>
            </div>
            {canViewTickets && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/support-tickets")}
                className="h-8 text-xs shrink-0 cursor-pointer"
              >
                All <ArrowUpRight className="ml-1 size-3.5" />
              </Button>
            )}
          </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !stats?.recentTickets || stats.recentTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                <CheckCircle2 className="size-8 text-emerald-500/70" />
                <p className="mt-2 text-sm font-medium">No support tickets</p>
                <p className="text-xs text-muted-foreground">
                  Tickets raised by schools will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {stats.recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => canViewTickets && navigate(`/support-tickets/${ticket.id}`)}
                    className={`flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors ${
                      canViewTickets ? "cursor-pointer" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {ticket.subject}
                        </p>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-mono text-[10px]">{ticket.ticket_number}</span>
                        <span>•</span>
                        <span className="truncate max-w-[130px]">
                          {ticket.school_name || "School"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {getTicketPriorityBadge(ticket.priority)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Recently Registered Schools */}
        <Card className="border border-border/80 shadow-xs py-0 gap-0 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Building2 className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate">Recent Schools</h3>
                <p className="text-xs text-muted-foreground truncate">
                  Latest onboarded institutions
                </p>
              </div>
            </div>
            {canViewSubscriptions && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/subscriptions")}
                className="h-8 text-xs shrink-0 cursor-pointer"
              >
                All <ArrowUpRight className="ml-1 size-3.5" />
              </Button>
            )}
          </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !stats?.recentSchools || stats.recentSchools.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                <AlertCircle className="size-8 text-muted-foreground/60" />
                <p className="mt-2 text-sm font-medium">No schools registered yet</p>
                <p className="text-xs text-muted-foreground">
                  New school registrations will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {stats.recentSchools.map((school) => (
                  <div
                    key={school.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {school.school_name}
                        </p>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {school.plan_name && (
                          <>
                            <span className="font-medium text-foreground/80">
                              {school.plan_name}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span>{formatDate(school.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {getSubscriptionBadge(school.subscription_status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
