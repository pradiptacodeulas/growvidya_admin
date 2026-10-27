import { useState, useEffect, useCallback, useRef } from "react"
import { useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  fetchPackagesApi,
  deletePackageApi,
  togglePackageStatusApi,
} from "@/services/subscriptionService"
import type {
  SubscriptionPackage,
  BillingCycle,
  PackageCounts,
} from "@/types/subscription"
import {
  DEFAULT_PAGE_SIZE,
  EMPTY_COUNTS,
  EMPTY_PAGINATION,
  type PaginationMeta,
} from "@/types/pagination"
import { toast } from "sonner"
import { DeleteConfirmDialog } from "@/components/subscriptions/DeleteConfirmDialog"
import { DataPagination } from "@/components/DataPagination"
import {
  Plus,
  Search,
  X,
  RefreshCw,
  LayoutGrid,
  List,
  Package,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Sparkles,
  Layers,
  Pencil,
  Trash2,
  AlertCircle,
  CreditCard,
  Clock,
} from "lucide-react"

const SEARCH_DEBOUNCE_MS = 400

const EMPTY_PACKAGE_COUNTS: PackageCounts = {
  ...EMPTY_COUNTS,
  total_items: 0,
  active_items: 0,
}

/** Maps the UI status filter to the numeric value expected by the API. */
const toStatusParam = (filter: string): number | undefined => {
  if (filter === "active") return 1
  if (filter === "inactive") return 0
  return undefined
}

export default function PlansPricing() {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)
  const { can } = usePermission()
  const canAddPkg = can("packages", "can_add")
  const canEditPkg = can("packages", "can_edit")
  const canDeletePkg = can("packages", "can_delete")
  const canManagePkg = can("packages", "can_manage")

  // Data & Loading state
  const [packages, setPackages] = useState<SubscriptionPackage[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION)
  const [counts, setCounts] = useState<PackageCounts>(EMPTY_PACKAGE_COUNTS)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [cycleFilter, setCycleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // Dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [packageToDelete, setPackageToDelete] = useState<SubscriptionPackage | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Status toggle in-progress tracking
  const [togglingPackageId, setTogglingPackageId] = useState<number | null>(null)

  // Guards against out-of-order responses when filters/pages change quickly
  const requestIdRef = useRef(0)

  // Debounce search input; a new search always starts from page 1
  useEffect(() => {
    const trimmed = searchTerm.trim()
    if (trimmed === debouncedSearch) return
    const timer = setTimeout(() => {
      setDebouncedSearch(trimmed)
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchTerm, debouncedSearch])

  const loadPackages = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!token) return
      const requestId = ++requestIdRef.current
      if (!options?.silent) setIsLoading(true)
      setErrorMessage(null)
      try {
        const data = await fetchPackagesApi(token, {
          search: debouncedSearch,
          status: toStatusParam(statusFilter),
          billing_cycle: cycleFilter,
          page,
          limit: pageSize,
        })
        if (requestId !== requestIdRef.current) return

        const meta = data?.pagination ?? EMPTY_PAGINATION
        // Requested page no longer exists (e.g. rows removed elsewhere) — jump to the last valid page
        if (meta.total > 0 && page > meta.totalPages) {
          setPage(meta.totalPages)
          return
        }

        setPackages(data?.packages ?? [])
        setPagination(meta)
        setCounts({ ...EMPTY_PACKAGE_COUNTS, ...(data?.counts ?? {}) })
      } catch (err: unknown) {
        if (requestId !== requestIdRef.current) return
        const error = err as Error
        setErrorMessage(error.message || "Failed to load subscription packages.")
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false)
      }
    },
    [token, debouncedSearch, statusFilter, cycleFilter, page, pageSize]
  )

  useEffect(() => {
    loadPackages()
  }, [loadPackages])

  // Filter / page-size changes always reset to the first page
  const handleCycleFilterChange = (value: string) => {
    if (value === cycleFilter) return
    setCycleFilter(value)
    setPage(1)
  }

  const handleStatusFilterChange = (value: string) => {
    if (value === statusFilter) return
    setStatusFilter(value)
    setPage(1)
  }

  const handlePageSizeChange = (limit: number) => {
    if (limit === pageSize) return
    setPageSize(limit)
    setPage(1)
  }

  const handleResetFilters = () => {
    setSearchTerm("")
    setDebouncedSearch("")
    setCycleFilter("all")
    setStatusFilter("all")
    setPage(1)
  }

  const hasActiveFilters =
    debouncedSearch !== "" || searchTerm.trim() !== "" || cycleFilter !== "all" || statusFilter !== "all"

  // Status toggle handler
  const handleToggleStatus = async (pkg: SubscriptionPackage) => {
    if (!token || togglingPackageId !== null) return
    const newStatus = pkg.status === 1 ? 0 : 1
    setTogglingPackageId(pkg.id)

    try {
      await togglePackageStatusApi(token, pkg.id, newStatus)
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, status: newStatus } : p))
      )
      toast.success(`Plan "${pkg.plan_name}" ${newStatus === 1 ? "activated" : "deactivated"}.`)
      // Refresh global counts (and the current page, in case a status filter is applied)
      loadPackages({ silent: true })
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
      toast.success(`Package "${packageToDelete.plan_name}" deleted successfully.`)
      setIsDeleteDialogOpen(false)
      setPackageToDelete(null)
      if (packages.length === 1 && page > 1) {
        // Removed the last row on this page — step back one page (effect reloads)
        setPage(page - 1)
      } else {
        loadPackages()
      }
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
    <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
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
            onClick={() => loadPackages()}
            disabled={isLoading}
            className="gap-2 h-9 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>

          {canAddPkg && (
            <Button
              size="sm"
              onClick={() => navigate("/plans-pricing/create")}
              className="gap-2 h-9 text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Create New Package
            </Button>
          )}
        </div>
      </div>

      {/* Metrics / KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Packages */}
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Total Packages</span>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? <Skeleton className="h-7 w-12" /> : counts.total}
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
                {isLoading ? <Skeleton className="h-7 w-12" /> : counts.active}
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
                {isLoading ? <Skeleton className="h-7 w-12" /> : counts.total_items}
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
                {isLoading ? <Skeleton className="h-7 w-12" /> : counts.active_items}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">Unable to fetch packages:</span> {errorMessage}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadPackages()}
            className="h-8 text-xs font-semibold border-destructive/40 text-destructive hover:bg-destructive/20 cursor-pointer"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by plan name, code, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/30 text-xs">
            <button
              type="button"
              onClick={() => handleStatusFilterChange("all")}
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
              onClick={() => handleStatusFilterChange("active")}
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
              onClick={() => handleStatusFilterChange("inactive")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === "inactive"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Inactive
            </button>
          </div>

          {/* Billing Cycle Filter */}
          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/30 text-xs">
            <button
              type="button"
              onClick={() => handleCycleFilterChange("all")}
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
              onClick={() => handleCycleFilterChange("annual")}
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
              onClick={() => handleCycleFilterChange("monthly")}
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
              onClick={() => handleCycleFilterChange("trial")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                cycleFilter === "trial"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Trial
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/30 text-xs">
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
          </div>
        </div>
      </div>

      {/* Packages DataTable or Grid View */}
      {viewMode === "table" ? (
        <Card className="border-border/70 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[240px]">Plan Name & Code</TableHead>
                <TableHead>Billing Cycle</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Max Students</TableHead>
                <TableHead>Free Trial</TableHead>
                <TableHead>Features</TableHead>
                <TableHead className="text-right">Status / Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-6 w-24 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                        <Package className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        No subscription packages found
                      </span>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {hasActiveFilters
                          ? "Try adjusting your search query or filters."
                          : "There are currently no subscription packages configured in the system."}
                      </p>
                      {hasActiveFilters ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetFilters}
                          className="mt-2 text-xs font-semibold cursor-pointer"
                        >
                          Reset all filters
                        </Button>
                      ) : canAddPkg ? (
                        <Button
                          size="sm"
                          onClick={() => navigate("/plans-pricing/create")}
                          className="mt-2 text-xs font-semibold gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Create First Package</span>
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg) => {
                  const isToggling = togglingPackageId === pkg.id
                  return (
                    <TableRow key={pkg.id} className="group">
                      {/* Plan Name & Code */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">
                              {pkg.plan_name}
                            </span>
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 tracking-wider">
                              {pkg.plan_code}
                            </span>
                          </div>
                          {pkg.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                              {pkg.description}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Billing Cycle */}
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {pkg.billing_cycle.replace("_", " ")}
                        </Badge>
                      </TableCell>

                      {/* Base Price */}
                      <TableCell>
                        <span className="font-bold text-xs text-foreground">
                          {formatPrice(pkg.price, pkg.billing_cycle)}
                        </span>
                      </TableCell>

                      {/* Max Students */}
                      <TableCell className="text-xs text-foreground">
                        {pkg.max_students > 0
                          ? pkg.max_students.toLocaleString("en-IN")
                          : "Unlimited"}
                      </TableCell>

                      {/* Free Trial */}
                      <TableCell>
                        {pkg.free_trial_days && pkg.free_trial_days > 0 ? (
                          <Badge
                            variant="outline"
                            className="text-[11px] border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                          >
                            {pkg.free_trial_days} Days
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Attached Features */}
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/plans-pricing/${pkg.id}/items`)}
                          className="h-7 text-xs font-semibold gap-1.5 cursor-pointer"
                          title="Manage package features"
                        >
                          <Layers className="h-3 w-3 text-primary" />
                          <span>{pkg.items?.length || 0} items</span>
                        </Button>
                      </TableCell>

                      {/* Status Badge & Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => canManagePkg && handleToggleStatus(pkg)}
                            disabled={!canManagePkg || isToggling}
                            title={
                              canManagePkg
                                ? `Click to mark as ${pkg.status === 1 ? "Inactive" : "Active"}`
                                : undefined
                            }
                            className={`transition-transform ${
                              canManagePkg ? "cursor-pointer active:scale-95" : "cursor-default"
                            } ${isToggling ? "opacity-50 pointer-events-none" : ""}`}
                          >
                            {pkg.status === 1 ? (
                              <Badge
                                variant="default"
                                className="capitalize gap-1 text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Active
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="capitalize gap-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                              >
                                <XCircle className="h-3 w-3" />
                                Inactive
                              </Badge>
                            )}
                          </button>

                          {canEditPkg && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                              onClick={() => navigate(`/plans-pricing/${pkg.id}/edit`)}
                              title="Edit package"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}

                          {canDeletePkg && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              onClick={() => {
                                setPackageToDelete(pkg)
                                setIsDeleteDialogOpen(true)
                              }}
                              title="Delete package"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <DataPagination
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            isLoading={isLoading}
            itemLabel="packages"
          />
        </Card>
      ) : (
        /* GRID CARDS VIEW */
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-80 w-full rounded-2xl" />
              <Skeleton className="h-80 w-full rounded-2xl" />
              <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
          ) : packages.length === 0 ? (
            <Card className="border-border/70 shadow-sm p-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                  <Package className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  No subscription packages found
                </span>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {hasActiveFilters
                    ? "Try adjusting your search query or filters."
                    : "There are currently no subscription packages configured in the system."}
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => {
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

                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={pkg.status === 1 ? "default" : "secondary"}
                            className="text-[10px] font-semibold"
                          >
                            {pkg.status === 1 ? "Active" : "Inactive"}
                          </Badge>
                          {canManagePkg && (
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
                          )}
                        </div>
                      </div>

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

                    <div className="p-5 flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/40">
                          <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <span className="text-[10px] text-muted-foreground block leading-tight">
                              Students
                            </span>
                            <strong className="text-foreground font-semibold">
                              {pkg.max_students > 0
                                ? `Max ${pkg.max_students.toLocaleString("en-IN")}`
                                : "Unlimited"}
                            </strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/40">
                          <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-muted-foreground block leading-tight">
                              Free Trial
                            </span>
                            <strong className="text-foreground font-semibold">
                              {pkg.free_trial_days && pkg.free_trial_days > 0
                                ? `${pkg.free_trial_days} Days`
                                : "No Trial"}
                            </strong>
                          </div>
                        </div>
                      </div>

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
                        {canEditPkg && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/plans-pricing/${pkg.id}/edit`)}
                            className="h-8 w-8 hover:bg-muted/80 cursor-pointer"
                            title="Edit Package"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {canDeletePkg && (
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
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          <Card className="border-border/70 shadow-sm overflow-hidden">
            <DataPagination
              pagination={pagination}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
              isLoading={isLoading}
              itemLabel="packages"
              className="border-t-0"
            />
          </Card>
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
