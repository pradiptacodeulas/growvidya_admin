import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
import {
  fetchStoragePlansApi,
  deleteStoragePlanApi,
  toggleStoragePlanStatusApi,
} from "@/services/storagePlanService"
import type { StoragePlan } from "@/types/storagePlan"
import {
  DEFAULT_PAGE_SIZE,
  EMPTY_COUNTS,
  EMPTY_PAGINATION,
  type CatalogCounts,
  type PaginationMeta,
} from "@/types/pagination"
import { DataPagination } from "@/components/DataPagination"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  HardDrive,
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle,
  Trash2,
  X,
  Plus,
  Pencil,
  Database,
  IndianRupee,
  Calendar,
  Cloud,
  Power,
} from "lucide-react"
import { toast } from "sonner"

export default function StoragePlans() {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)
  const { can } = usePermission()
  const canAddStorage = can("storage_plans", "can_add")
  const canEditStorage = can("storage_plans", "can_edit")
  const canDeleteStorage = can("storage_plans", "can_delete")
  const canManageStorage = can("storage_plans", "can_manage")
  const [plans, setPlans] = useState<StoragePlan[]>([])
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")

  // Server-side pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION)
  const [counts, setCounts] = useState<CatalogCounts>(EMPTY_COUNTS)
  const latestRequestRef = useRef(0)

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<StoragePlan | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debounce search input (and go back to the first page when the term changes)
  useEffect(() => {
    if (searchQuery === debouncedSearch) return
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery, debouncedSearch])

  // Fetch one page of plans - strictly NO fallback mock data
  const loadPlans = async (showLoadingState = true) => {
    if (!token) return
    const requestId = ++latestRequestRef.current
    if (showLoadingState) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const data = await fetchStoragePlansApi(token, {
        search: debouncedSearch,
        status: statusFilter === "all" ? undefined : statusFilter === "active" ? 1 : 0,
        page,
        limit: pageSize,
      })
      // Ignore stale responses from superseded requests
      if (requestId !== latestRequestRef.current) return

      // If the current page no longer exists (e.g. rows removed elsewhere), jump to the last page
      if (data.pagination.total > 0 && page > data.pagination.totalPages) {
        setPage(data.pagination.totalPages)
        return
      }

      setPlans(data.plans)
      setPagination(data.pagination)
      setCounts(data.counts)
    } catch (err: unknown) {
      if (requestId !== latestRequestRef.current) return
      const message = err instanceof Error ? err.message : "Failed to load storage plans."
      toast.error(message)
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }

  useEffect(() => {
    loadPlans(true)
  }, [token, debouncedSearch, statusFilter, page, pageSize])

  const handleStatusFilterChange = (value: "all" | "active" | "inactive") => {
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
    setSearchQuery("")
    setDebouncedSearch("")
    setStatusFilter("all")
    setPage(1)
  }

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!token || !selectedPlan) return
    setIsSubmitting(true)

    try {
      await deleteStoragePlanApi(token, selectedPlan.id)
      toast.success(`Storage plan "${selectedPlan.plan_name}" deleted successfully.`)
      setIsDeleteOpen(false)
      setSelectedPlan(null)
      // Removed the last row on a page > 1: step back a page (effect reloads); otherwise reload in place
      if (plans.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        loadPlans(false)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete storage plan."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle status
  const handleToggleStatus = async (plan: StoragePlan) => {
    if (!token || togglingId === plan.id) return
    const newStatus: 0 | 1 = Number(plan.status) === 1 ? 0 : 1
    setTogglingId(plan.id)

    try {
      await toggleStoragePlanStatusApi(token, plan.id, newStatus)
      toast.success(
        `Storage plan "${plan.plan_name}" is now ${newStatus === 1 ? "Active" : "Inactive"}.`
      )
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, status: newStatus } : p))
      )
      // Refresh the current page so the global counts (and status filter) stay accurate
      loadPlans(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update storage plan status."
      toast.error(message)
    } finally {
      setTogglingId(null)
    }
  }

  // Summary Metrics — global catalog totals from the server (not just the current page)
  const totalPlansCount = counts.total
  const activePlansCount = counts.active
  const inactivePlansCount = counts.inactive
  const hasActiveFilters = Boolean(searchQuery) || statusFilter !== "all"

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HardDrive className="size-6 text-primary" />
            Storage Plans
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPlans(false)}
            disabled={isLoading || isRefreshing}
            className="h-9 gap-2 cursor-pointer text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading || isRefreshing ? "animate-spin" : ""}`} />
            <span>{isLoading || isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </Button>

          {canAddStorage && (
            <Button
              size="sm"
              onClick={() => navigate("/storage-plans/create")}
              className="h-9 gap-1.5 cursor-pointer shadow-sm text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>Add Storage Plan</span>
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Total Storage Plans</span>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? <Skeleton className="h-7 w-12" /> : totalPlansCount}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HardDrive className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Active Plans</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {isLoading ? <Skeleton className="h-7 w-12" /> : activePlansCount}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Inactive Plans</span>
              <div className="text-2xl font-bold tracking-tight text-muted-foreground">
                {isLoading ? <Skeleton className="h-7 w-12" /> : inactivePlansCount}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by plan name, capacity, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

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

          {/* View Mode Switcher */}
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

      {/* Main Content Area: DataTable or Grid View */}
      {viewMode === "table" ? (
        <Card className="border-border/70 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[240px]">Plan Name</TableHead>
                <TableHead>Storage Capacity</TableHead>
                <TableHead>Monthly Price</TableHead>
                <TableHead>Annual Price</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Status / Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Skeleton className="h-5 w-36 mb-1" />
                      <Skeleton className="h-3 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-6 w-24 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                        <HardDrive className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        No storage plans found
                      </span>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {hasActiveFilters
                          ? "Try adjusting your search query or filters."
                          : "Get started by adding your first cloud storage package."}
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
                      ) : canAddStorage ? (
                        <Button
                          size="sm"
                          onClick={() => navigate("/storage-plans/create")}
                          className="mt-2 text-xs font-semibold gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Storage Plan</span>
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => {
                  const isActive = Number(plan.status) === 1
                  const isToggling = togglingId === plan.id
                  const monthlyPriceNum = Number(plan.monthly_price) || 0
                  const annualPriceNum = Number(plan.annual_price) || 0

                  return (
                    <TableRow key={plan.id} className="group">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Cloud className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-semibold text-sm text-foreground">
                              {plan.plan_name}
                            </span>
                          </div>
                          {plan.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                              {plan.description}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="font-bold text-xs gap-1 py-0.5 px-2 bg-primary/10 text-primary border-primary/20"
                        >
                          <Database className="h-3 w-3" />
                          {plan.storage_capacity} {plan.unit_code || "GB"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs font-semibold text-foreground">
                        ₹
                        {monthlyPriceNum.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <span className="text-[11px] font-normal text-muted-foreground ml-0.5">
                          /mo
                        </span>
                      </TableCell>

                      <TableCell className="text-xs font-semibold text-foreground">
                        ₹
                        {annualPriceNum.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <span className="text-[11px] font-normal text-muted-foreground ml-0.5">
                          /yr
                        </span>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {plan.created_at
                              ? new Date(plan.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => canManageStorage && handleToggleStatus(plan)}
                            disabled={!canManageStorage || isToggling}
                            title={
                              canManageStorage
                                ? `Click to mark as ${isActive ? "Inactive" : "Active"}`
                                : undefined
                            }
                            className={`transition-transform ${
                              canManageStorage ? "cursor-pointer active:scale-95" : "cursor-default"
                            } ${isToggling ? "opacity-50 pointer-events-none" : ""}`}
                          >
                            {isActive ? (
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

                          {canEditStorage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/storage-plans/${plan.id}/edit`)}
                              title="Edit storage plan"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}

                          {canDeleteStorage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedPlan(plan)
                                setIsDeleteOpen(true)
                              }}
                              title="Delete storage plan"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
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
            isLoading={isLoading || isRefreshing}
            itemLabel="plans"
          />
        </Card>
      ) : (
        /* Grid View */
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <Card key={idx} className="border border-border/80">
                  <CardContent className="p-5 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="pt-2 flex justify-end gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <Card className="border-border/70 shadow-sm p-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="mx-auto size-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                  <HardDrive className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No storage plans found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {hasActiveFilters
                    ? "No plans match your current filters. Try resetting the search or filter options."
                    : "Get started by adding your first cloud storage package."}
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {plans.map((plan) => {
                const isActive = Number(plan.status) === 1
                const monthlyPriceNum = Number(plan.monthly_price) || 0
                const annualPriceNum = Number(plan.annual_price) || 0

                return (
                  <Card
                    key={plan.id}
                    className="border border-border/80 hover:border-primary/40 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden group"
                  >
                    <CardContent className="p-5 space-y-4 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Cloud className="size-4 text-primary shrink-0" />
                            <h3 className="font-bold text-base text-foreground leading-snug line-clamp-1">
                              {plan.plan_name}
                            </h3>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-xs font-semibold px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20"
                          >
                            <Database className="size-3 mr-1" />
                            {plan.storage_capacity} {plan.unit_code || "GB"}
                          </Badge>
                        </div>

                        <Badge
                          variant={isActive ? "default" : "destructive"}
                          className={`text-[11px] font-medium shrink-0 ${
                            isActive
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 border-rose-500/30"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-muted-foreground">Monthly Fee</span>
                          <span className="text-sm font-bold text-foreground flex items-center">
                            <IndianRupee className="size-3.5" />
                            {monthlyPriceNum.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            <span className="text-[11px] font-normal text-muted-foreground ml-0.5">
                              /mo
                            </span>
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between border-t border-border/40 pt-1.5">
                          <span className="text-xs text-muted-foreground">Annual Fee</span>
                          <span className="text-sm font-bold text-foreground flex items-center">
                            <IndianRupee className="size-3.5" />
                            {annualPriceNum.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            <span className="text-[11px] font-normal text-muted-foreground ml-0.5">
                              /yr
                            </span>
                          </span>
                        </div>
                      </div>

                      {plan.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {plan.description}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No description provided
                        </p>
                      )}
                    </CardContent>

                    <div className="px-5 py-3 bg-muted/20 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3" />
                        {plan.created_at
                          ? new Date(plan.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {canManageStorage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={togglingId === plan.id}
                            onClick={() => handleToggleStatus(plan)}
                            title={isActive ? "Deactivate Plan" : "Activate Plan"}
                            className="h-8 px-2.5 text-xs gap-1 cursor-pointer hover:bg-muted"
                          >
                            <Power
                              className={`size-3.5 ${
                                isActive ? "text-amber-600" : "text-emerald-600"
                              }`}
                            />
                            <span>{isActive ? "Deactivate" : "Activate"}</span>
                          </Button>
                        )}

                        {canEditStorage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/storage-plans/${plan.id}/edit`)}
                            className="h-8 px-2.5 text-xs gap-1 cursor-pointer hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil className="size-3.5" />
                            <span>Edit</span>
                          </Button>
                        )}

                        {canDeleteStorage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPlan(plan)
                              setIsDeleteOpen(true)
                            }}
                            className="h-8 px-2.5 text-xs gap-1 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Delete</span>
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
              isLoading={isLoading || isRefreshing}
              itemLabel="plans"
              className="border-t-0"
            />
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              Delete Storage Plan
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to delete the storage plan{" "}
              <strong className="text-foreground font-semibold">
                "{selectedPlan?.plan_name}"
              </strong>
              ? This action cannot be undone and will prevent future subscriptions from selecting this tier.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
              className="cursor-pointer gap-1.5"
            >
              {isSubmitting ? "Deleting..." : "Delete Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
