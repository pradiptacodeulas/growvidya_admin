import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import {
  fetchStoragePlansApi,
  deleteStoragePlanApi,
} from "@/services/storagePlanService"
import type { StoragePlan } from "@/types/storagePlan"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
} from "lucide-react"
import { toast } from "sonner"

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
]

const STATUS_FILTER_LABELS: Record<string, string> = {
  all: "All Statuses",
  active: "Active",
  inactive: "Inactive",
}

export default function StoragePlans() {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)
  const [plans, setPlans] = useState<StoragePlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<StoragePlan | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Fetch plans - strictly NO fallback mock data
  const loadPlans = async (showLoadingState = true) => {
    if (!token) return
    if (showLoadingState) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const data = await fetchStoragePlansApi(token, {
        search: debouncedSearch,
        status: statusFilter === "all" ? undefined : statusFilter === "active" ? 1 : 0,
      })
      setPlans(data || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load storage plans."
      toast.error(message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadPlans(true)
  }, [token, debouncedSearch, statusFilter])

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!token || !selectedPlan) return
    setIsSubmitting(true)

    try {
      await deleteStoragePlanApi(token, selectedPlan.id)
      toast.success(`Storage plan "${selectedPlan.plan_name}" deleted successfully.`)
      setIsDeleteOpen(false)
      setSelectedPlan(null)
      loadPlans(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete storage plan."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Summary Metrics
  const totalPlansCount = plans.length
  const activePlansCount = plans.filter((p) => Number(p.status) === 1).length
  const inactivePlansCount = plans.filter((p) => Number(p.status) === 0).length

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HardDrive className="size-6 text-primary" />
            Storage Plans
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage additional cloud storage packages and capacity quotas for schools.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPlans(false)}
            disabled={isLoading || isRefreshing}
            className="h-9 px-3 gap-1.5 cursor-pointer text-xs"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate("/storage-plans/create")}
            className="h-9 px-3.5 gap-1.5 cursor-pointer shadow-xs text-xs font-semibold"
          >
            <Plus className="size-4" />
            <span>Add Storage Plan</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total Storage Plans</p>
              <div className="text-2xl font-bold tracking-tight">
                {isLoading ? <Skeleton className="h-7 w-12" /> : totalPlansCount}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <HardDrive className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Active Plans</p>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {isLoading ? <Skeleton className="h-7 w-12" /> : activePlansCount}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Inactive Plans</p>
              <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                {isLoading ? <Skeleton className="h-7 w-12" /> : inactivePlansCount}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <XCircle className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Control Bar */}
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by plan name, capacity, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="w-[140px]">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  if (val) setStatusFilter(val as "all" | "active" | "inactive")
                }}
                items={STATUS_FILTER_OPTIONS}
                itemToStringLabel={(val) => STATUS_FILTER_LABELS[String(val)] || String(val || "")}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center border border-input rounded-md p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-sm text-xs cursor-pointer transition-colors ${
                  viewMode === "grid"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-sm text-xs cursor-pointer transition-colors ${
                  viewMode === "table"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Table View"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {isLoading ? (
        viewMode === "grid" ? (
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
        ) : (
          <Card className="border border-border/80">
            <CardContent className="p-0">
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <Skeleton key={idx} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ) : plans.length === 0 ? (
        <Card className="border border-dashed border-border py-12 text-center">
          <CardContent className="space-y-4">
            <div className="mx-auto size-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
              <HardDrive className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">No storage plans found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery || statusFilter !== "all"
                  ? "No plans match your current filters. Try resetting the search or filter options."
                  : "Get started by adding your first cloud storage package."}
              </p>
            </div>
            {searchQuery || statusFilter !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("all")
                }}
                className="cursor-pointer text-xs"
              >
                Reset Filters
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => navigate("/storage-plans/create")}
                className="gap-1.5 cursor-pointer text-xs"
              >
                <Plus className="size-4" />
                <span>Add Storage Plan</span>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid View */
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
                  {/* Top: Plan Name & Status */}
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

                  {/* Pricing Box */}
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

                  {/* Description */}
                  {plan.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {plan.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No description provided</p>
                  )}
                </CardContent>

                {/* Card Footer Actions */}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/storage-plans/${plan.id}/edit`)}
                      className="h-8 px-2.5 text-xs gap-1 cursor-pointer hover:bg-primary/10 hover:text-primary"
                    >
                      <Pencil className="size-3.5" />
                      <span>Edit</span>
                    </Button>

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
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="border border-border/80 shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">Plan Name</TableHead>
                    <TableHead className="text-xs font-semibold">Storage Capacity</TableHead>
                    <TableHead className="text-xs font-semibold">Monthly Price</TableHead>
                    <TableHead className="text-xs font-semibold">Annual Price</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Created Date</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => {
                    const isActive = Number(plan.status) === 1
                    const monthlyPriceNum = Number(plan.monthly_price) || 0
                    const annualPriceNum = Number(plan.annual_price) || 0

                    return (
                      <TableRow key={plan.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-xs text-foreground">
                          <div className="flex items-center gap-2">
                            <Cloud className="size-3.5 text-primary shrink-0" />
                            <span>{plan.plan_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge
                            variant="secondary"
                            className="font-medium text-[11px] bg-primary/10 text-primary border-primary/20"
                          >
                            {plan.storage_capacity} {plan.unit_code || "GB"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          ₹
                          {monthlyPriceNum.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          ₹
                          {annualPriceNum.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge
                            variant={isActive ? "default" : "destructive"}
                            className={`text-[11px] font-medium ${
                              isActive
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 border-rose-500/30"
                            }`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {plan.created_at
                            ? new Date(plan.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/storage-plans/${plan.id}/edit`)}
                              className="h-8 px-2.5 text-xs gap-1 cursor-pointer hover:bg-primary/10 hover:text-primary"
                            >
                              <Pencil className="size-3.5" />
                              <span>Edit</span>
                            </Button>
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
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
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
