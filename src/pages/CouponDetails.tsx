import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router"
import { useAppSelector } from "@/store/store"
import {
  fetchCouponByIdApi,
  deleteCouponApi,
  toggleCouponStatusApi,
} from "@/services/couponService"
import type { CouponDetail } from "@/types/coupon"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  ChevronRight,
  Ticket,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

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

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr.replace(" ", "T"))
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

export default function CouponDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)

  const [coupon, setCoupon] = useState<CouponDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [currentTime] = useState(() => Date.now())

  useEffect(() => {
    let isMounted = true

    if (!id) {
      Promise.resolve().then(() => {
        if (!isMounted) return
        setError("Invalid coupon ID specified.")
        setIsLoading(false)
      })
      return () => {
        isMounted = false
      }
    }

    if (!token) {
      Promise.resolve().then(() => {
        if (!isMounted) return
        setIsLoading(false)
      })
      return () => {
        isMounted = false
      }
    }

    fetchCouponByIdApi(token, id)
      .then((data) => {
        if (!isMounted) return
        setCoupon(data)
        setError(null)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        const errorMsg = err instanceof Error ? err.message : "Coupon not found."
        setError(errorMsg)
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id, token, refreshTrigger])

  const handleRefresh = () => {
    setIsLoading(true)
    setError(null)
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleCopyCode = () => {
    if (!coupon?.code) return
    navigator.clipboard.writeText(coupon.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false)

  const handleToggleStatus = async () => {
    if (!token || !coupon) return
    const nextStatus = coupon.status === 1 ? 0 : 1
    try {
      await toggleCouponStatusApi(token, coupon.id, nextStatus)
      toast.success(`Coupon marked as ${nextStatus === 1 ? "Active" : "Inactive"}.`)
      setCoupon((prev) => (prev ? { ...prev, status: nextStatus } : null))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle status."
      toast.error(msg)
    }
  }

  const handleDeleteSubmit = async () => {
    if (!token || !coupon) return
    setIsSubmittingDelete(true)
    try {
      await deleteCouponApi(token, coupon.id)
      toast.success("Coupon deleted successfully.")
      setIsDeleteOpen(false)
      navigate("/coupons")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete coupon."
      toast.error(msg)
    } finally {
      setIsSubmittingDelete(false)
    }
  }

  const isPercentage = coupon?.discount_type === "percentage"
  const discountFormatted = coupon
    ? isPercentage
      ? `${parseFloat(coupon.discount_value)}% OFF`
      : `${formatCurrency(coupon.discount_value)} FLAT`
    : "—"

  const usagePercentage =
    coupon && coupon.max_uses && coupon.max_uses > 0
      ? Math.min(100, Math.round((coupon.used_count / coupon.max_uses) * 100))
      : null

  const isExpired = coupon ? new Date(coupon.end_date).getTime() < currentTime : false

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumbs & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <nav className="flex items-center flex-wrap text-xs sm:text-sm text-muted-foreground gap-1.5 sm:gap-2">
          <Link to="/overview" className="hover:text-foreground transition-colors font-medium">
            Dashboard
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
          <Link to="/coupons" className="hover:text-foreground transition-colors font-medium">
            Coupons
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
          <span className="text-foreground font-semibold truncate max-w-[200px] sm:max-w-none">
            {coupon ? coupon.code : `#${id}`}
          </span>
        </nav>

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

          {coupon && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/coupons/${coupon.id}/edit`)}
                className="gap-1.5 h-9 text-xs font-semibold cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Coupon</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteOpen(true)}
                className="gap-1.5 h-9 text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error View */}
      {error && !isLoading && (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-destructive">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <div>
                <h3 className="font-semibold text-base">Unable to load coupon details</h3>
                <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="h-8 text-xs font-semibold border-destructive/40 text-destructive hover:bg-destructive/20 cursor-pointer"
              >
                Retry
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/coupons")}
                className="h-8 text-xs font-semibold cursor-pointer"
              >
                Return to Coupons
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-6">
          <Card className="border-border/70 p-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72" />
              </div>
              <Skeleton className="h-7 w-24" />
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border/70 p-6">
                <Skeleton className="h-6 w-36 mb-4" />
                <Skeleton className="h-32 w-full" />
              </Card>
            </div>
            <div>
              <Card className="border-border/70 p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-40 w-full" />
              </Card>
            </div>
          </div>
        </div>
      ) : coupon ? (
        <div className="space-y-6">
          {/* Top Hero Banner */}
          <Card className="border-border/70 shadow-sm overflow-hidden bg-card">
            <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-2xl sm:text-3xl font-bold tracking-wider px-3.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    {coupon.code}
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/80 px-3 py-1.5 rounded-lg bg-background shadow-2xs hover:bg-muted/30 transition-all cursor-pointer"
                    title="Copy code"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-600 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    className="cursor-pointer transition-transform active:scale-95"
                    title={`Click to mark coupon as ${coupon.status === 1 ? "Inactive" : "Active"}`}
                  >
                    {coupon.status === 1 ? (
                      <Badge
                        variant="default"
                        className="gap-1.5 py-1 px-3 text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30"
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="gap-1.5 py-1 px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Inactive
                      </Badge>
                    )}
                  </button>

                  {isExpired && (
                    <Badge variant="destructive" className="text-xs">
                      Expired
                    </Badge>
                  )}
                </div>

                {coupon.description ? (
                  <p className="text-sm text-muted-foreground max-w-2xl">
                    {coupon.description}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    No description provided for this coupon.
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:items-end gap-1 text-xs text-muted-foreground border-t sm:border-t-0 pt-4 sm:pt-0 border-border/60">
                <div>
                  Created: <span className="font-medium text-foreground">{formatDate(coupon.created_at)}</span>
                </div>
                <div>
                  Last Updated: <span className="font-medium text-foreground">{formatDateTime(coupon.updated_at)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Details & Usages Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Coupon Rules & Redemption History */}
            <div className="lg:col-span-2 space-y-6">
              {/* Configuration Rules */}
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-primary" />
                    Discount Rules & Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1 p-3 rounded-lg border border-border/60 bg-muted/20">
                      <span className="text-xs text-muted-foreground font-medium">Discount Type</span>
                      <p className="font-semibold text-foreground capitalize">
                        {coupon.discount_type} Discount
                      </p>
                    </div>

                    <div className="space-y-1 p-3 rounded-lg border border-border/60 bg-muted/20">
                      <span className="text-xs text-muted-foreground font-medium">Discount Value</span>
                      <p className="font-semibold text-foreground">
                        {discountFormatted}
                      </p>
                    </div>

                    <div className="space-y-1 p-3 rounded-lg border border-border/60 bg-muted/20">
                      <span className="text-xs text-muted-foreground font-medium">Minimum Order Amount</span>
                      <p className="font-semibold text-foreground">
                        {coupon.min_order_amount ? formatCurrency(coupon.min_order_amount) : "No minimum requirement"}
                      </p>
                    </div>

                    <div className="space-y-1 p-3 rounded-lg border border-border/60 bg-muted/20">
                      <span className="text-xs text-muted-foreground font-medium">Maximum Discount Cap</span>
                      <p className="font-semibold text-foreground">
                        {coupon.max_discount_amount ? formatCurrency(coupon.max_discount_amount) : "No maximum cap"}
                      </p>
                    </div>

                    <div className="space-y-1 p-3 rounded-lg border border-border/60 bg-muted/20">
                      <span className="text-xs text-muted-foreground font-medium">Start Date</span>
                      <p className="font-semibold text-foreground">
                        {formatDate(coupon.start_date)}
                      </p>
                    </div>

                    <div className="space-y-1 p-3 rounded-lg border border-border/60 bg-muted/20">
                      <span className="text-xs text-muted-foreground font-medium">End Date</span>
                      <p className="font-semibold text-foreground">
                        {formatDate(coupon.end_date)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Usages / Redemption History Table */}
              <Card className="border-border/70 shadow-sm overflow-hidden">
                <CardHeader className="p-4 sm:p-5 border-b border-border/60 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                      Redemption History
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Customers and schools that have applied this coupon code.
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-semibold text-xs">
                    {coupon.usages?.length ?? 0} {coupon.usages?.length === 1 ? "Redemption" : "Redemptions"}
                  </Badge>
                </CardHeader>

                <CardContent className="p-0">
                  {(!coupon.usages || coupon.usages.length === 0) ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                        <Ticket className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        No redemptions recorded yet
                      </span>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        This coupon has not been applied to any purchases or subscriptions yet.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead>Order #</TableHead>
                          <TableHead>User / Customer</TableHead>
                          <TableHead>Discount Applied</TableHead>
                          <TableHead className="text-right">Redeemed At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coupon.usages.map((usage, idx) => (
                          <TableRow key={usage.id ?? idx}>
                            <TableCell className="font-mono text-xs font-semibold">
                              #{usage.order_id || idx + 1}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-medium text-foreground">
                                {usage.school_name || usage.user_email || `User #${usage.user_id || '—'}`}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs font-bold text-primary">
                                {usage.discount_amount ? formatCurrency(usage.discount_amount) : "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {usage.used_at || usage.created_at
                                ? formatDateTime(usage.used_at || usage.created_at)
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Usage Limits & Performance */}
            <div className="space-y-6">
              {/* Usage Progress Card */}
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Usage & Capacity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Used Capacity</span>
                      <span className="font-bold text-foreground">
                        {usagePercentage !== null ? `${usagePercentage}%` : "Unlimited"}
                      </span>
                    </div>

                    {usagePercentage !== null && (
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${usagePercentage}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span>{coupon.used_count} used</span>
                      <span>{coupon.max_uses ? `${coupon.max_uses} limit` : "No limit"}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-semibold text-foreground">
                        {coupon.status === 1 ? "Active & Redeemable" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Redemptions</span>
                      <span className="font-semibold text-foreground">
                        {coupon.total_redemptions ?? coupon.used_count}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Discount Given</span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(coupon.total_discount_given ?? 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              <span>Delete Coupon?</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete coupon{" "}
              <strong className="text-foreground">{coupon?.code}</strong>?
              This will permanently revoke this coupon.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isSubmittingDelete}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubmit}
              disabled={isSubmittingDelete}
              className="cursor-pointer gap-1.5"
            >
              {isSubmittingDelete ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Coupon</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
