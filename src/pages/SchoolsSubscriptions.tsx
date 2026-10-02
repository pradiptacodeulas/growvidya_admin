import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router"
import { useAppSelector } from "@/store/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  fetchSubscriptionsApi,
  approveSubscriptionApi,
  rejectSubscriptionApi,
} from "@/services/subscriptionService"
import type {
  SchoolSubscription,
  SubscriptionCounts,
  SubscriptionsPagination,
} from "@/types/subscription"
import { toast } from "sonner"
import {
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Building2,
  Layers,
  ShieldCheck,
  Ban,
  Eye,
  Check,
} from "lucide-react"

export default function SchoolsSubscriptions() {
  const token = useAppSelector((state) => state.auth.token)

  const [subscriptions, setSubscriptions] = useState<SchoolSubscription[]>([])
  const [counts, setCounts] = useState<SubscriptionCounts>({
    total: 0,
    pending: 0,
    active: 0,
    expired: 0,
    suspended: 0,
    trial: 0,
  })
  const [pagination, setPagination] = useState<SubscriptionsPagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  })
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("pending")
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Modals state
  const [selectedSubForApproval, setSelectedSubForApproval] = useState<SchoolSubscription | null>(null)
  const [isApproveOpen, setIsApproveOpen] = useState<boolean>(false)
  const [approvalStartDate, setApprovalStartDate] = useState<string>("")
  const [approvalEndDate, setApprovalEndDate] = useState<string>("")
  const [approvalNotes, setApprovalNotes] = useState<string>("")
  const [isApproving, setIsApproving] = useState<boolean>(false)

  const [selectedSubForRejection, setSelectedSubForRejection] = useState<SchoolSubscription | null>(null)
  const [isRejectOpen, setIsRejectOpen] = useState<boolean>(false)
  const [rejectionReason, setRejectionReason] = useState<string>("")
  const [isRejecting, setIsRejecting] = useState<boolean>(false)

  // Fetch subscriptions from database
  const loadSubscriptions = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const data = await fetchSubscriptionsApi(token, {
        search: searchQuery,
        status: selectedStatusTab === "all" ? undefined : selectedStatusTab,
        page: currentPage,
        limit: 10,
      })

      setSubscriptions(data.subscriptions || [])
      setPagination(data.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 })
      if (data.counts) {
        setCounts(data.counts)
      }
    } catch (err: any) {
      console.error("Failed to fetch subscriptions:", err)
      toast.error(err?.message || "Could not load subscription records.")
      setSubscriptions([])
    } finally {
      setLoading(false)
    }
  }, [token, searchQuery, selectedStatusTab, currentPage])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  // Open approval modal
  const handleOpenApprove = (sub: SchoolSubscription) => {
    setSelectedSubForApproval(sub)
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]
    setApprovalStartDate(todayStr)

    const end = new Date(today)
    if (sub.billing_cycle === "monthly") {
      end.setMonth(end.getMonth() + 1)
    } else if (sub.billing_cycle === "trial") {
      end.setDate(end.getDate() + 14)
    } else {
      end.setFullYear(end.getFullYear() + 1)
    }
    setApprovalEndDate(end.toISOString().split("T")[0])
    setApprovalNotes(`Verified and approved by Super Admin on ${new Date().toLocaleDateString()}`)
    setIsApproveOpen(true)
  }

  // Submit approval
  const handleConfirmApproval = async () => {
    if (!token || !selectedSubForApproval) return
    try {
      setIsApproving(true)
      const approved = await approveSubscriptionApi(token, selectedSubForApproval.id, {
        startDate: approvalStartDate || undefined,
        endDate: approvalEndDate || undefined,
        verificationNotes: approvalNotes,
      })

      toast.success(
        `🎉 Plan "${approved.plan_name}" for ${approved.school_name} has been approved and is now ACTIVE!`
      )
      setIsApproveOpen(false)
      setSelectedSubForApproval(null)
      loadSubscriptions()
    } catch (err: any) {
      console.error("Approval error:", err)
      toast.error(err?.message || "Failed to approve plan.")
    } finally {
      setIsApproving(false)
    }
  }

  // Open rejection modal
  const handleOpenReject = (sub: SchoolSubscription) => {
    setSelectedSubForRejection(sub)
    setRejectionReason("")
    setIsRejectOpen(true)
  }

  // Submit rejection
  const handleConfirmRejection = async () => {
    if (!token || !selectedSubForRejection) return
    try {
      setIsRejecting(true)
      await rejectSubscriptionApi(token, selectedSubForRejection.id, {
        rejectionReason: rejectionReason.trim() || "Rejected by Super Admin",
      })

      toast.info(`Subscription request for ${selectedSubForRejection.school_name} has been rejected.`)
      setIsRejectOpen(false)
      setSelectedSubForRejection(null)
      loadSubscriptions()
    } catch (err: any) {
      console.error("Rejection error:", err)
      toast.error(err?.message || "Failed to reject plan request.")
    } finally {
      setIsRejecting(false)
    }
  }

  // Status badge styling helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1.5 font-medium px-2.5 py-0.5">
            <Clock className="size-3.5" />
            Pending Approval
          </Badge>
        )
      case "active":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 font-medium px-2.5 py-0.5">
            <CheckCircle2 className="size-3.5" />
            Active
          </Badge>
        )
      case "trial":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1.5 font-medium px-2.5 py-0.5">
            <ShieldCheck className="size-3.5" />
            Trial
          </Badge>
        )
      case "expired":
        return (
          <Badge className="bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30 gap-1.5 font-medium px-2.5 py-0.5">
            <AlertCircle className="size-3.5" />
            Expired
          </Badge>
        )
      case "suspended":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1.5 font-medium px-2.5 py-0.5">
            <XCircle className="size-3.5" />
            Suspended
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="capitalize">
            {status}
          </Badge>
        )
    }
  }

  const renderPaymentBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="size-3" /> Paid
          </span>
        )
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Clock className="size-3" /> Unpaid / Pending
          </span>
        )
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <Ban className="size-3" /> Failed
          </span>
        )
      default:
        return <span className="text-xs text-muted-foreground">{status}</span>
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="size-7 text-primary" />
            School Subscriptions & Plan Approvals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve school plan selections. When a user selects a plan, it stays pending until approved by the Super Admin.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSubscriptions}
            disabled={loading}
            className="gap-2 cursor-pointer"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            render={<Link to="/plans-pricing" />}
            size="sm"
            className="gap-2 cursor-pointer"
          >
            <Layers className="size-4" />
            Manage Packages
          </Button>
        </div>
      </div>

      {/* Live Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Approvals Card */}
        <Card
          className={`border-2 transition-all cursor-pointer ${
            selectedStatusTab === "pending"
              ? "border-amber-500 bg-amber-500/5 shadow-sm"
              : "border-border hover:border-amber-500/50"
          }`}
          onClick={() => {
            setSelectedStatusTab("pending")
            setCurrentPage(1)
          }}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pending Approvals
              </p>
              <h3 className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                {counts.pending}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Awaiting Super Admin review</p>
            </div>
            <div className="size-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Active Subscriptions Card */}
        <Card
          className={`border-2 transition-all cursor-pointer ${
            selectedStatusTab === "active"
              ? "border-emerald-500 bg-emerald-500/5 shadow-sm"
              : "border-border hover:border-emerald-500/50"
          }`}
          onClick={() => {
            setSelectedStatusTab("active")
            setCurrentPage(1)
          }}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Subscriptions
              </p>
              <h3 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {counts.active}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Fully active institutional tiers</p>
            </div>
            <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Expired / Suspended Card */}
        <Card
          className={`border-2 transition-all cursor-pointer ${
            selectedStatusTab === "expired"
              ? "border-rose-500 bg-rose-500/5 shadow-sm"
              : "border-border hover:border-rose-500/50"
          }`}
          onClick={() => {
            setSelectedStatusTab("expired")
            setCurrentPage(1)
          }}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Expired Plans
              </p>
              <h3 className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                {counts.expired}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Renewal required</p>
            </div>
            <div className="size-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Subscriptions Card */}
        <Card
          className={`border-2 transition-all cursor-pointer ${
            selectedStatusTab === "all"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => {
            setSelectedStatusTab("all")
            setCurrentPage(1)
          }}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                All Subscriptions
              </p>
              <h3 className="text-3xl font-extrabold text-foreground mt-1">
                {counts.total}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Total school subscriptions recorded</p>
            </div>
            <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Layers className="size-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-lg border">
          <button
            type="button"
            onClick={() => {
              setSelectedStatusTab("pending")
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedStatusTab === "pending"
                ? "bg-background text-amber-700 dark:text-amber-400 shadow-sm border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="size-3.5 text-amber-500" />
            Pending Approvals
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                counts.pending > 0
                  ? "bg-amber-500 text-white font-bold"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {counts.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedStatusTab("active")
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedStatusTab === "active"
                ? "bg-background text-emerald-700 dark:text-emerald-400 shadow-sm border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            Active
            <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-muted text-muted-foreground">
              {counts.active}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedStatusTab("all")
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedStatusTab === "all"
                ? "bg-background text-foreground shadow-sm border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Subscriptions
            <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-muted text-muted-foreground">
              {counts.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedStatusTab("expired")
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedStatusTab === "expired"
                ? "bg-background text-rose-700 dark:text-rose-400 shadow-sm border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Expired
            <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-muted text-muted-foreground">
              {counts.expired}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search school name, code, txn ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <Card className="overflow-hidden border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3.5">School Details</th>
                <th className="px-4 py-3.5">Requested Plan</th>
                <th className="px-4 py-3.5">Amount & Gateway</th>
                <th className="px-4 py-3.5">Payment</th>
                <th className="px-4 py-3.5">Plan Status</th>
                <th className="px-4 py-3.5">Dates</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`skel-${idx}`}>
                    <td className="px-4 py-4" colSpan={7}>
                      <Skeleton className="h-10 w-full rounded-md" />
                    </td>
                  </tr>
                ))
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
                        <Clock className="size-7" />
                      </div>
                      <h4 className="font-semibold text-foreground text-base mb-1">
                        {selectedStatusTab === "pending"
                          ? "No Pending Plan Requests"
                          : "No Subscription Records Found"}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {selectedStatusTab === "pending"
                          ? "There are currently no school plan selections waiting for review and approval."
                          : "No school subscriptions match your active filters."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const isPending = sub.status === "pending"
                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-muted/40 transition-colors ${
                        isPending ? "bg-amber-500/[0.02]" : ""
                      }`}
                    >
                      {/* School Details */}
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-2.5">
                          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                            <Building2 className="size-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-[14px]">
                              {sub.school_name}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono font-medium text-primary/80">
                                {sub.school_code}
                              </span>
                              {sub.school_email && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[180px]">{sub.school_email}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Plan details */}
                      <td className="px-4 py-4">
                        <div className="font-medium text-foreground">{sub.plan_name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span className="capitalize font-semibold text-foreground/80">
                            {sub.billing_cycle}
                          </span>
                          <span>•</span>
                          <span>₹{parseFloat(String(sub.plan_price || 0)).toLocaleString("en-IN")}</span>
                        </div>
                      </td>

                      {/* Amount & Gateway */}
                      <td className="px-4 py-4">
                        <div className="font-bold text-foreground">
                          ₹{parseFloat(String(sub.amount_paid || 0)).toLocaleString("en-IN")}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span className="capitalize font-medium">
                            {sub.payment_gateway || "Direct"}
                          </span>
                          {sub.payment_transaction_id && (
                            <span
                              className="font-mono text-[11px] truncate max-w-[100px]"
                              title={sub.payment_transaction_id}
                            >
                              ({sub.payment_transaction_id})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Payment Status */}
                      <td className="px-4 py-4">{renderPaymentBadge(sub.payment_status)}</td>

                      {/* Subscription Status */}
                      <td className="px-4 py-4">{renderStatusBadge(sub.status)}</td>

                      {/* Dates */}
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium text-foreground">Requested: </span>
                          {new Date(sub.created_at).toLocaleDateString()}
                        </div>
                        {sub.status === "active" && sub.end_date && (
                          <div className="mt-0.5">
                            <span className="font-medium text-foreground">Expires: </span>
                            {new Date(sub.end_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleOpenApprove(sub)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-2.5 gap-1.5 shadow-sm cursor-pointer"
                              >
                                <CheckCircle2 className="size-3.5" />
                                Approve
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenReject(sub)}
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-200 text-xs h-8 px-2 cursor-pointer"
                              >
                                <XCircle className="size-3.5" />
                                Reject
                              </Button>
                            </>
                          )}

                          <Link to={`/subscriptions/${sub.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="View Subscription Details"
                            >
                              <Eye className="size-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Showing page <span className="font-semibold text-foreground">{pagination.page}</span> of{" "}
              <span className="font-semibold text-foreground">{pagination.totalPages}</span> (
              {pagination.total} records total)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="text-xs h-7 px-2.5 cursor-pointer"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="text-xs h-7 px-2.5 cursor-pointer"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Review & Approve Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
              Approve School Subscription Plan
            </DialogTitle>
            <DialogDescription>
              Review the plan selection details below. Once approved, the plan will immediately become{" "}
              <strong>active</strong> for the user and their school account.
            </DialogDescription>
          </DialogHeader>

          {selectedSubForApproval && (
            <div className="space-y-4 py-2 text-sm">
              {/* Summary box */}
              <div className="p-3 rounded-lg bg-muted/60 border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">School:</span>
                  <span className="font-semibold text-foreground">
                    {selectedSubForApproval.school_name} ({selectedSubForApproval.school_code})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested Plan:</span>
                  <span className="font-semibold text-foreground">
                    {selectedSubForApproval.plan_name} ({selectedSubForApproval.billing_cycle})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid / Quoted:</span>
                  <span className="font-bold text-foreground">
                    ₹{parseFloat(String(selectedSubForApproval.amount_paid || 0)).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Gateway / Txn ID:</span>
                  <span className="font-mono text-xs text-foreground">
                    {selectedSubForApproval.payment_gateway || "N/A"}{" "}
                    {selectedSubForApproval.payment_transaction_id
                      ? `(${selectedSubForApproval.payment_transaction_id})`
                      : ""}
                  </span>
                </div>
              </div>

              {/* Start Date & End Date controls */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start_date" className="text-xs font-semibold">
                    Effective Start Date
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={approvalStartDate}
                    onChange={(e) => setApprovalStartDate(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="end_date" className="text-xs font-semibold">
                    Expiry / End Date
                  </Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={approvalEndDate}
                    onChange={(e) => setApprovalEndDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Approval Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="approval_notes" className="text-xs font-semibold">
                  Admin Approval Notes (Optional)
                </Label>
                <textarea
                  id="approval_notes"
                  rows={2}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="e.g. Payment verified via bank transfer ref #..."
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApproveOpen(false)}
              disabled={isApproving}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmApproval}
              disabled={isApproving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 cursor-pointer"
            >
              {isApproving ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Confirm & Activate Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Request Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <XCircle className="size-5" />
              Reject Plan Request
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this plan request for{" "}
              <strong>{selectedSubForRejection?.school_name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="reject_reason" className="text-xs font-semibold">
              Rejection Reason
            </Label>
            <textarea
              id="reject_reason"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Bank transfer transaction reference could not be verified."
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectOpen(false)}
              disabled={isRejecting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmRejection}
              disabled={isRejecting}
              className="gap-1.5 cursor-pointer"
            >
              {isRejecting ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
