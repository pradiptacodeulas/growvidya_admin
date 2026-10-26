import { useState, useEffect, useCallback } from "react"
import { Link, useNavigate } from "react-router"
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
} from "lucide-react"

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full min-w-0">
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
            Real-time overview of schools, subscriptions, packages, and platform masters.
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

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="border border-border/80 shadow-xs min-w-0">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Revenue
              </p>
              {loading ? (
                <Skeleton className="h-8 w-28 mt-1" />
              ) : (
                <>
                  <div className="text-2xl font-bold tracking-tight text-foreground truncate">
                    {formatCurrency(stats?.subscriptions.totalRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.subscriptions.pendingPayments || 0} pending payment(s)
                  </p>
                </>
              )}
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <IndianRupee className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Registered Schools */}
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
                    {stats?.schools.total || 0}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {stats?.schools.active || 0} Active
                    </span>
                    <span>•</span>
                    <span>{stats?.schools.inactive || 0} Inactive</span>
                  </div>
                </>
              )}
            </div>
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Building2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* School Subscriptions */}
        <Card className="border border-border/80 shadow-xs min-w-0">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Subscriptions
              </p>
              {loading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {stats?.subscriptions.total || 0}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {stats?.subscriptions.active || 0} Active
                    </span>
                    <span>•</span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {stats?.subscriptions.trial || 0} Trial
                    </span>
                    <span>•</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {stats?.subscriptions.pending || 0} Pending
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="size-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <CreditCard className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Subscription Plans */}
        <Card className="border border-border/80 shadow-xs min-w-0">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Subscription Plans
              </p>
              {loading ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {stats?.packages.total || 0}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{stats?.packages.active || 0} Active</span>
                    {canViewPackages && (
                      <>
                        <span>•</span>
                        <Link
                          to="/plans-pricing"
                          className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
                        >
                          Manage <ArrowUpRight className="size-3" />
                        </Link>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Package className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Catalog & Payment Masters */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Platform Catalog & Payment Masters
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
              {loading ? (
                <Skeleton className="mt-1 h-6 w-16" />
              ) : (
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-xl font-bold">{stats?.storagePlans?.total ?? 0}</span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {stats?.storagePlans?.active ?? 0} active
                  </span>
                </div>
              )}
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
              {loading ? (
                <Skeleton className="mt-1 h-6 w-16" />
              ) : (
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-xl font-bold">{stats?.attendanceMachines?.total ?? 0}</span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {stats?.attendanceMachines?.active ?? 0} active
                  </span>
                </div>
              )}
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
              {loading ? (
                <Skeleton className="mt-1 h-6 w-16" />
              ) : (
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-xl font-bold">{stats?.rfidCards?.total ?? 0}</span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {stats?.rfidCards?.active ?? 0} active
                  </span>
                </div>
              )}
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
              {loading ? (
                <Skeleton className="mt-1 h-6 w-16" />
              ) : (
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-xl font-bold">{stats?.coupons?.total ?? 0}</span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {stats?.coupons?.active ?? 0} active
                  </span>
                </div>
              )}
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
              {loading ? (
                <Skeleton className="mt-1 h-6 w-16" />
              ) : (
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="text-xl font-bold">{stats?.bankAccounts?.total ?? 0}</span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {stats?.bankAccounts?.active ?? 0} active
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Lists: Pending Subscriptions & Recent Schools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Subscription Approvals */}
        <Card className="border border-border/80 shadow-xs py-0 gap-0 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate">Pending Approvals & Payments</h3>
                <p className="text-xs text-muted-foreground truncate">
                  School subscription requests awaiting verification
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
                View All <ArrowUpRight className="ml-1 size-3.5" />
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
                  There are no pending subscription approvals right now.
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
                        {sub.school_code && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground shrink-0">
                            {sub.school_code}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {sub.plan_name || "Custom Plan"}
                        </span>
                        <span>•</span>
                        <span>{formatCurrency(sub.amount_paid || sub.plan_price)}</span>
                        <span>•</span>
                        <span>{formatDate(sub.created_at)}</span>
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

        {/* Recently Registered Schools */}
        <Card className="border border-border/80 shadow-xs py-0 gap-0 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Building2 className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate">Recently Registered Schools</h3>
                <p className="text-xs text-muted-foreground truncate">
                  Latest institutions onboarded to Growvidya
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
                All Schools <ArrowUpRight className="ml-1 size-3.5" />
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
                  New school registrations will appear here automatically.
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
                        {school.school_code && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground shrink-0">
                            {school.school_code}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="truncate max-w-[180px] sm:max-w-[240px]">
                          {school.email || school.phone_number || "No contact info"}
                        </span>
                        {school.plan_name && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-foreground/80">{school.plan_name}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{formatDate(school.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getSubscriptionBadge(school.subscription_status)}
                      <Badge
                        variant={Number(school.status) === 1 ? "default" : "secondary"}
                        className={
                          Number(school.status) === 1
                            ? "bg-emerald-600 hover:bg-emerald-600 text-white shrink-0"
                            : "shrink-0"
                        }
                      >
                        {Number(school.status) === 1 ? "Active" : "Inactive"}
                      </Badge>
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
