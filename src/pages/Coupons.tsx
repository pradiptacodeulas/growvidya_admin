import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import { fetchCouponsApi } from "@/services/couponService"
import type { Coupon, PaginationInfo } from "@/types/coupon"
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
  Ticket,
  Search,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Percent,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Eye,
} from "lucide-react"


function formatCurrency(val?: string | number | null) {
  if (val === null || val === undefined || val === "") return "—"
  const num = typeof val === "string" ? parseFloat(val) : val
  if (isNaN(num)) return "—"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num)
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr.replace(" ", "T"))
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return dateStr
  }
}

export default function Coupons() {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(token))
  const [error, setError] = useState<string | null>(null)

  // Filters & Pagination State
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "fixed" | "percentage">("all")
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleViewCoupon = (id: number) => {
    navigate(`/coupons/${id}`)
  }



  // Debounce search query
  useEffect(() => {
    if (searchQuery === debouncedSearch) return

    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 350)

    return () => {
      clearTimeout(handler)
    }
  }, [searchQuery, debouncedSearch])

  useEffect(() => {
    if (!token) return

    let isMounted = true

    fetchCouponsApi(token, {
      page,
      limit,
      search: debouncedSearch,
      status: statusFilter,
      discount_type: typeFilter,
    })
      .then((data) => {
        if (!isMounted) return
        setCoupons(data.coupons)
        setPagination(data.pagination)
        if (data.pagination.totalPages > 0 && page > data.pagination.totalPages) {
          setPage(data.pagination.totalPages)
        }
        setError(null)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        const errorMsg = err instanceof Error ? err.message : "Failed to load coupons"
        setError(errorMsg)
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [token, page, limit, debouncedSearch, statusFilter, typeFilter, refreshTrigger])

  const handleRefresh = () => {
    setIsLoading(true)
    setError(null)
    setRefreshTrigger((prev) => prev + 1)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage === page) return
    setIsLoading(true)
    setPage(newPage)
  }

  const handleLimitChange = (newLimit: number) => {
    if (newLimit === limit) return
    setIsLoading(true)
    setLimit(newLimit)
    setPage(1)
  }

  const handleStatusChange = (val: "all" | "active" | "inactive") => {
    if (val === statusFilter) return
    setIsLoading(true)
    setStatusFilter(val)
    setPage(1)
  }

  const handleTypeChange = (val: "all" | "fixed" | "percentage") => {
    if (val === typeFilter) return
    setIsLoading(true)
    setTypeFilter(val)
    setPage(1)
  }


  const handleCopyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleResetFilters = () => {
    setIsLoading(true)
    setSearchQuery("")
    setDebouncedSearch("")
    setStatusFilter("all")
    setTypeFilter("all")
    setPage(1)
  }


  // Aggregate Metrics
  const stats = useMemo(() => {
    const total = pagination ? pagination.total : coupons.length
    const active = coupons.filter((c) => c.status === 1).length
    const totalRedemptions = coupons.reduce(
      (sum, c) => sum + (c.total_redemptions ?? c.used_count ?? 0),
      0
    )
    const totalDiscount = coupons.reduce((sum, c) => {
      const val =
        typeof c.total_discount_given === "string"
          ? parseFloat(c.total_discount_given)
          : c.total_discount_given
      return sum + (val || 0)
    }, 0)

    return { total, active, totalRedemptions, totalDiscount }
  }, [coupons, pagination])

  const totalPages = pagination?.totalPages || 1
  const hasPrev = pagination ? pagination.hasPrevPage : page > 1
  const hasNext = pagination ? pagination.hasNextPage : page < totalPages
  const startItem =
    pagination && pagination.total > 0
      ? (page - 1) * limit + 1
      : coupons.length > 0
      ? 1
      : 0
  const endItem = pagination
    ? Math.min(page * limit, pagination.total)
    : coupons.length
  const totalCount = pagination ? pagination.total : coupons.length

  const getVisiblePageNumbers = (current: number, total: number) => {
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }
    const pages: (number | string)[] = []
    if (current <= 3) {
      pages.push(1, 2, 3, 4, "...", total)
    } else if (current >= total - 2) {
      pages.push(1, "...", total - 3, total - 2, total - 1, total)
    } else {
      pages.push(1, "...", current - 1, current, current + 1, "...", total)
    }
    return pages
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Coupons
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage promotional coupons, discount rules, and redemption limits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="gap-2 h-9 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Total Coupons</span>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? <Skeleton className="h-7 w-12" /> : stats.total}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Ticket className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Active Coupons</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {isLoading ? <Skeleton className="h-7 w-12" /> : stats.active}
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
              <span className="text-xs font-medium text-muted-foreground">Total Redemptions</span>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? <Skeleton className="h-7 w-12" /> : stats.totalRedemptions}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Discount Given</span>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  formatCurrency(stats.totalDiscount)
                )}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">Unable to fetch coupons:</span> {error}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            className="h-8 text-xs font-semibold border-destructive/40 text-destructive hover:bg-destructive/20"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by coupon code or description..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsLoading(true)
            }}
            className="pl-9 pr-8 h-9 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                if (debouncedSearch !== "") {
                  setIsLoading(true)
                }
              }}
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
              onClick={() => handleStatusChange("all")}
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
              onClick={() => handleStatusChange("active")}
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
              onClick={() => handleStatusChange("inactive")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === "inactive"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Inactive
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/30 text-xs">
            <button
              type="button"
              onClick={() => handleTypeChange("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("fixed")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === "fixed"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Fixed
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("percentage")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === "percentage"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Percentage
            </button>
          </div>
        </div>
      </div>



      {/* Coupons Table Card */}
      <Card className="border-border/70 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[220px]">Coupon Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Order Limits</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead className="text-right">Status / Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Skeleton className="h-5 w-28 mb-1" />
                    <Skeleton className="h-3 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-6 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                      <Ticket className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      No coupons found
                    </span>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                        ? "Try adjusting your search query or filters."
                        : "There are currently no discount coupons configured in the system."}
                    </p>
                    {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                        className="mt-2 text-xs font-semibold cursor-pointer"
                      >
                        Reset all filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => {
                const isPercentage = coupon.discount_type === "percentage"
                const discountFormatted = isPercentage
                  ? `${parseFloat(coupon.discount_value)}% OFF`
                  : `₹${parseFloat(coupon.discount_value).toLocaleString("en-IN")} FLAT`

                const usagePercentage =
                  coupon.max_uses && coupon.max_uses > 0
                    ? Math.min(100, Math.round((coupon.used_count / coupon.max_uses) * 100))
                    : null

                return (
                  <TableRow key={coupon.id} className="group">
                    {/* Code & Description */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewCoupon(coupon.id)}
                            title="Click to view coupon details"
                            className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 tracking-wider hover:bg-primary/20 transition-colors cursor-pointer text-left"
                          >
                            {coupon.code}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(coupon.id, coupon.code)}
                            title="Copy code"
                            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-sm cursor-pointer"
                          >
                            {copiedId === coupon.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        {coupon.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                            {coupon.description}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Discount Value */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="font-bold text-xs gap-1 py-0.5 px-2 bg-muted/60"
                        >
                          {isPercentage ? (
                            <Percent className="h-3 w-3 text-primary" />
                          ) : (
                            <IndianRupee className="h-3 w-3 text-primary" />
                          )}
                          {discountFormatted}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Order Limits */}
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div className="text-foreground">
                          <span className="text-muted-foreground">Min Order: </span>
                          <span className="font-medium">
                            {coupon.min_order_amount
                              ? formatCurrency(coupon.min_order_amount)
                              : "None"}
                          </span>
                        </div>
                        {isPercentage && (
                          <div className="text-muted-foreground text-[11px]">
                            Max Cap:{" "}
                            <span className="font-medium text-foreground">
                              {coupon.max_discount_amount
                                ? formatCurrency(coupon.max_discount_amount)
                                : "No limit"}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Usage & Limits */}
                    <TableCell>
                      <div className="space-y-1 max-w-[120px]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">
                            {coupon.used_count}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            / {coupon.max_uses ? coupon.max_uses : "∞"} uses
                          </span>
                        </div>
                        {usagePercentage !== null && (
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${usagePercentage}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Validity Window */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {formatDate(coupon.start_date)} — {formatDate(coupon.end_date)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Status Badge & Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {coupon.status === 1 ? (
                          <Badge
                            variant="default"
                            className="capitalize gap-1 text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="capitalize gap-1 text-[11px] font-semibold text-muted-foreground"
                          >
                            <XCircle className="h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                          onClick={() => handleViewCoupon(coupon.id)}
                          title="View coupon details & usages"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>

        </Table>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border/60 bg-muted/20">
          {/* Left: Range and Limits */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
            <span>
              Showing <strong className="text-foreground font-semibold">{startItem}</strong> to{" "}
              <strong className="text-foreground font-semibold">{endItem}</strong> of{" "}
              <strong className="text-foreground font-semibold">{totalCount}</strong> coupons
            </span>

            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                disabled={isLoading}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Right: Page Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-xs cursor-pointer"
              onClick={() => handlePageChange(1)}
              disabled={page <= 1 || isLoading}
              title="First Page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-xs cursor-pointer"
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={!hasPrev || isLoading}
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Desktop Numeric Pages */}
            <div className="hidden sm:flex items-center gap-1">
              {getVisiblePageNumbers(page, totalPages).map((p, idx) =>
                typeof p === "number" ? (
                  <Button
                    key={idx}
                    variant={page === p ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0 text-xs font-medium cursor-pointer"
                    onClick={() => handlePageChange(p)}
                    disabled={isLoading}
                  >
                    {p}
                  </Button>
                ) : (
                  <span key={idx} className="px-1 text-xs text-muted-foreground select-none">
                    {p}
                  </span>
                )
              )}
            </div>

            {/* Mobile Page indicator */}
            <span className="sm:hidden text-xs font-medium px-2 text-muted-foreground">
              Page {page} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-xs cursor-pointer"
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
              disabled={!hasNext || isLoading}
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-xs cursor-pointer"
              onClick={() => handlePageChange(totalPages)}
              disabled={page >= totalPages || isLoading}
              title="Last Page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

