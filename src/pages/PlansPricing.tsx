import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  fetchPackagesApi,
  deletePackageApi,
  togglePackageStatusApi,
} from "@/services/subscriptionService"
import type {
  SubscriptionPackage,
  BillingCycle,
} from "@/types/subscription"
import { toast } from "sonner"
import { DeleteConfirmDialog } from "@/components/subscriptions/DeleteConfirmDialog"
import {
  Plus,
  Search,
  X,
  RefreshCw,
  LayoutGrid,
  List,
  Package,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Layers,
  Pencil,
  Trash2,
  AlertCircle,
  CreditCard,
  Clock,
} from "lucide-react"

export default function PlansPricing() {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)

  // Data & Loading state
  const [packages, setPackages] = useState<SubscriptionPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("")
  const [cycleFilter, setCycleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  // Dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [packageToDelete, setPackageToDelete] = useState<SubscriptionPackage | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Status toggle in-progress tracking
  const [togglingPackageId, setTogglingPackageId] = useState<number | null>(null)

  const loadPackages = async () => {
    if (!token) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const data = await fetchPackagesApi(token)
      setPackages(data || [])
    } catch (err: unknown) {
      const error = err as Error
      setErrorMessage(error.message || "Failed to load subscription packages.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPackages()
  }, [token])

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const matchesName = pkg.plan_name.toLowerCase().includes(query)
        const matchesCode = pkg.plan_code.toLowerCase().includes(query)
        const matchesDesc = pkg.description?.toLowerCase().includes(query)
        if (!matchesName && !matchesCode && !matchesDesc) {
          return false
        }
      }

      // Billing Cycle
      if (cycleFilter !== "all" && pkg.billing_cycle !== cycleFilter) {
        return false
      }

      // Status
      if (statusFilter === "active" && pkg.status !== 1) return false
      if (statusFilter === "inactive" && pkg.status !== 0) return false

      return true
    })
  }, [packages, searchTerm, cycleFilter, statusFilter])

  // Metrics
  const metrics = useMemo(() => {
    const total = packages.length
    const active = packages.filter((p) => p.status === 1).length
    const totalItems = packages.reduce((acc, p) => acc + (p.items?.length || 0), 0)
    const activeItems = packages.reduce(
      (acc, p) =>
        acc + (p.items?.filter((it) => it.status === 1).length || 0),
      0
    )
    return { total, active, totalItems, activeItems }
  }, [packages])

  // Status toggle handler
  const handleToggleStatus = async (pkg: SubscriptionPackage) => {
    if (!token) return
    const newStatus = pkg.status === 1 ? 0 : 1
    setTogglingPackageId(pkg.id)

    try {
      await togglePackageStatusApi(token, pkg.id, newStatus)
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, status: newStatus } : p))
      )
      toast.success(`Plan "${pkg.plan_name}" ${newStatus === 1 ? "activated" : "deactivated"}.`)
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || "Failed to update package status.")
    } finally {
      setTogglingPackageId(null)
    }
  }

  // Delete package handler
  const handleConfirmDelete = async () => {
    if (!token || !packageToDelete) return
    setIsDeleting(true)

    try {
      await deletePackageApi(token, packageToDelete.id)
      setPackages((prev) => prev.filter((p) => p.id !== packageToDelete.id))
      toast.success(`Package "${packageToDelete.plan_name}" deleted successfully.`)
      setIsDeleteDialogOpen(false)
      setPackageToDelete(null)
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || "Failed to delete package.")
    } finally {
      setIsDeleting(false)
    }
  }

  // Format currency
  const formatPrice = (price: number | string, cycle: BillingCycle) => {
    const numPrice = Number(price) || 0
    if (cycle === "trial" || numPrice === 0) {
      return "Free Trial"
    }

    const formatted = `₹${numPrice.toLocaleString("en-IN")}`
    switch (cycle) {
      case "annual":
        return `${formatted} / year`
      case "monthly":
        return `${formatted} / month`
      case "quarterly":
        return `${formatted} / quarter`
      case "half_yearly":
        return `${formatted} / 6 months`
      default:
        return formatted
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Plans & Packages
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Manage subscription packages, student & teacher quotas, and child add-on modules.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadPackages}
            disabled={isLoading}
            className="gap-2 h-9 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => navigate("/plans-pricing/create")}
            className="gap-2 h-9 text-xs font-semibold cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Create New Package
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm animate-in fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {/* Metrics / KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Packages */}
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Total Packages</span>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? <Skeleton className="h-7 w-12" /> : metrics.total}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Active Plans */}
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Active Plans</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {isLoading ? <Skeleton className="h-7 w-12" /> : metrics.active}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Bundled Features */}
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Attached Features</span>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                {isLoading ? <Skeleton className="h-7 w-12" /> : metrics.totalItems}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Active Features */}
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Active Features</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {isLoading ? <Skeleton className="h-7 w-12" /> : metrics.activeItems}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by plan name, code, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Billing Cycle Filter */}
          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/30 text-xs">
            <button
              type="button"
              onClick={() => setCycleFilter("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                cycleFilter === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Cycles
            </button>
            <button
              type="button"
              onClick={() => setCycleFilter("annual")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                cycleFilter === "annual"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annually
            </button>
            <button
              type="button"
              onClick={() => setCycleFilter("monthly")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                cycleFilter === "monthly"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycleFilter("trial")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                cycleFilter === "trial"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Trial
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/30 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === "active"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === "inactive"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Inactive
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/30 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Package Content: Grid Cards or Table */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-border/70 text-center bg-card space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No subscription packages found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {searchTerm || cycleFilter !== "all" || statusFilter !== "all"
              ? "No packages matched your filter criteria. Try resetting filters."
              : "Get started by creating your first subscription package for schools."}
          </p>
          <Button
            size="sm"
            onClick={() => navigate("/plans-pricing/create")}
            className="h-8 text-xs font-semibold gap-1.5 cursor-pointer mt-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Package
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => {
            const isToggling = togglingPackageId === pkg.id
            const planItems = pkg.items || []

            return (
              <Card
                key={pkg.id}
                className={`relative flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden ${
                  pkg.status === 1
                    ? "border-border/80 bg-card hover:border-primary/40 hover:shadow-md"
                    : "border-border/40 bg-muted/20 opacity-80"
                }`}
              >
                {/* Card Header Banner */}
                <div className="p-5 pb-3 border-b border-border/50 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold tracking-tight text-foreground">
                          {pkg.plan_name}
                        </h3>
                        <Badge variant="outline" className="text-[10px] font-mono py-0 h-4">
                          {pkg.plan_code}
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {pkg.billing_cycle === "trial" ? "Free Trial" : `${pkg.billing_cycle} plan`}
                      </Badge>
                    </div>

                    {/* Status Toggle */}
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={pkg.status === 1 ? "default" : "secondary"}
                        className="text-[10px] font-semibold"
                      >
                        {pkg.status === 1 ? "Active" : "Inactive"}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(pkg)}
                        disabled={isToggling}
                        title={pkg.status === 1 ? "Deactivate plan" : "Activate plan"}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          pkg.status === 1 ? "bg-emerald-500" : "bg-muted-foreground/30"
                        } ${isToggling ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-md ring-0 transition duration-200 ease-in-out ${
                            pkg.status === 1 ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Price Tag */}
                  <div className="pt-1">
                    <div className="text-2xl font-black tracking-tight text-foreground">
                      {formatPrice(pkg.price, pkg.billing_cycle)}
                    </div>
                    {pkg.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {pkg.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Body: Capacities & Features */}
                <div className="p-5 flex-1 space-y-4">
                  {/* Capacity Limits & Free Trial */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/40">
                      <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <span className="text-[10px] text-muted-foreground block leading-tight">Students</span>
                        <strong className="text-foreground font-semibold">
                          {pkg.max_students > 0 ? `Max ${pkg.max_students.toLocaleString("en-IN")}` : "Unlimited"}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/40">
                      <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-muted-foreground block leading-tight">Free Trial</span>
                        <strong className="text-foreground font-semibold">
                          {pkg.free_trial_days && pkg.free_trial_days > 0 ? `${pkg.free_trial_days} Days` : "No Trial"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Included Features List */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Included Features ({planItems.length})
                    </span>
                    {planItems.length === 0 ? (
                      <div className="text-xs text-muted-foreground italic">
                        No features added yet.
                      </div>
                    ) : (
                      <ul className="space-y-1.5 text-xs text-foreground">
                        {planItems.slice(0, 4).map((it, idx) => (
                          <li key={it.id || idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">
                              {it.item_name}
                              {it.description ? (
                                <span className="text-muted-foreground ml-1">
                                  — {it.description}
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                        {planItems.length > 4 && (
                          <li className="text-[11px] text-muted-foreground pl-5.5">
                            + {planItems.length - 4} more features included
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 px-5 border-t border-border/50 bg-muted/10 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/plans-pricing/${pkg.id}/items`)}
                    className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Manage Items ({pkg.items?.length || 0})
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/plans-pricing/${pkg.id}/edit`)}
                      className="h-8 w-8 hover:bg-muted/80 cursor-pointer"
                      title="Edit Package"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setPackageToDelete(pkg)
                        setIsDeleteDialogOpen(true)
                      }}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                      title="Delete Package"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/60">
                <tr>
                  <th className="p-3.5 pl-4">Plan Name & Code</th>
                  <th className="p-3.5">Billing Cycle</th>
                  <th className="p-3.5">Base Price</th>
                  <th className="p-3.5">Max Students</th>
                  <th className="p-3.5">Free Trial</th>
                  <th className="p-3.5">Items Attached</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredPackages.map((pkg) => {
                  const isToggling = togglingPackageId === pkg.id
                  return (
                    <tr key={pkg.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="font-bold text-foreground">{pkg.plan_name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{pkg.plan_code}</div>
                      </td>

                      <td className="p-3.5 capitalize">
                        <Badge variant="outline" className="text-[10px]">
                          {pkg.billing_cycle}
                        </Badge>
                      </td>

                      <td className="p-3.5 font-bold text-foreground">
                        {formatPrice(pkg.price, pkg.billing_cycle)}
                      </td>

                      <td className="p-3.5">
                        {pkg.max_students > 0 ? pkg.max_students.toLocaleString("en-IN") : "Unlimited"}
                      </td>

                      <td className="p-3.5">
                        {pkg.free_trial_days && pkg.free_trial_days > 0 ? (
                          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                            {pkg.free_trial_days} Days
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {pkg.items?.length || 0} items
                        </Badge>
                      </td>

                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(pkg)}
                          disabled={isToggling}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            pkg.status === 1 ? "bg-emerald-500" : "bg-muted-foreground/30"
                          } ${isToggling ? "opacity-50 pointer-events-none" : ""}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-md ring-0 transition duration-200 ease-in-out ${
                              pkg.status === 1 ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>

                      <td className="p-3.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/plans-pricing/${pkg.id}/items`)}
                            className="h-7 text-xs font-semibold gap-1 cursor-pointer"
                          >
                            <Layers className="h-3 w-3" />
                            Items
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/plans-pricing/${pkg.id}/edit`)}
                            className="h-7 w-7 cursor-pointer"
                            title="Edit Package"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPackageToDelete(pkg)
                              setIsDeleteDialogOpen(true)
                            }}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Delete Package"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Subscription Package"
        description={`Are you sure you want to delete "${packageToDelete?.plan_name}"? This action will cascade delete all attached features and add-ons.`}
        isDeleting={isDeleting}
      />
    </div>
  )
}
