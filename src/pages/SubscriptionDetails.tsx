import { useState, useEffect, useCallback } from "react"
import { useParams, Link } from "react-router"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
import {
  fetchSubscriptionByIdApi,
  approveSubscriptionApi,
  rejectSubscriptionApi,
  updateSubscriptionStatusApi,
} from "@/services/subscriptionService"
import type { SchoolSubscription } from "@/types/subscription"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Ban,
  Check,
  Copy,
  RefreshCw,
  Building2,
  CreditCard,
  Calendar,
  Layers,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Power,
  PowerOff,
  FileText,
  Printer,
  History,
  Package,
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
    return d.toLocaleDateString("en-IN", {
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
    return d.toLocaleString("en-IN", {
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

function computeCycleEndDate(startStr: string, cycle: string): string {
  const d = new Date(`${startStr}T00:00:00`)
  if (isNaN(d.getTime())) return startStr
  switch (cycle) {
    case "monthly":
      d.setMonth(d.getMonth() + 1)
      break
    case "quarterly":
      d.setMonth(d.getMonth() + 3)
      break
    case "half_yearly":
      d.setMonth(d.getMonth() + 6)
      break
    case "trial":
      d.setDate(d.getDate() + 14)
      break
    case "annual":
    default:
      d.setFullYear(d.getFullYear() + 1)
      break
  }
  return d.toISOString().split("T")[0]
}

function formatCycleLabel(cycle?: string | null) {
  switch (cycle) {
    case "monthly":
      return "Monthly"
    case "quarterly":
      return "Quarterly"
    case "half_yearly":
      return "Half-Yearly"
    case "annual":
      return "Annual"
    case "trial":
      return "Free Trial"
    default:
      return cycle || "—"
  }
}

export default function SubscriptionDetails() {
  const { id } = useParams<{ id: string }>()
  const token = useAppSelector((state) => state.auth.token)
  const { can } = usePermission()
  const canManageSubscription = can(["subscriptions", "schools"], "can_manage")

  const [subscription, setSubscription] = useState<SchoolSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Approve dialog states
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [useCustomApprovalDates, setUseCustomApprovalDates] = useState(false)
  const [approvalStartDate, setApprovalStartDate] = useState("")
  const [approvalEndDate, setApprovalEndDate] = useState("")
  const [approvalNotes, setApprovalNotes] = useState("")

  // Reject dialog states
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  // Status toggle (Active <-> Inactive) modal states
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [targetStatus, setTargetStatus] = useState<"active" | "suspended">("suspended")
  const [statusChangeNotes, setStatusChangeNotes] = useState("")

  // Printable Zero-GST Invoice dialog
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)

  const loadSubscription = useCallback(
    async (showLoading = true) => {
      if (!token || !id) return
      if (showLoading) setIsLoading(true)
      else setIsRefreshing(true)
      setError(null)

      try {
        const subId = parseInt(id, 10)
        if (isNaN(subId)) {
          throw new Error("Invalid subscription ID specified.")
        }
        const data = await fetchSubscriptionByIdApi(token, subId)
        setSubscription(data)
      } catch (err: any) {
        console.error("Failed to load subscription details:", err)
        setError(err.message || "Failed to load subscription details.")
        toast.error(err.message || "Failed to load subscription record.")
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [token, id]
  )

  useEffect(() => {
    loadSubscription(true)
  }, [loadSubscription])

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success("Copied to clipboard!")
    setTimeout(() => {
      setCopiedKey(null)
    }, 2000)
  }

  // Open Approval Dialog
  const handleOpenApprove = () => {
    if (!subscription) return
    const todayStr = new Date().toISOString().split("T")[0]
    setApprovalStartDate(todayStr)
    setApprovalEndDate(computeCycleEndDate(todayStr, subscription.billing_cycle))
    setUseCustomApprovalDates(false)
    setApprovalNotes(
      `Offline Bank Transfer verified and approved by Super Admin on ${new Date().toLocaleDateString()}`
    )
    setIsApproveOpen(true)
  }

  // Submit Approval
  const handleConfirmApproval = async () => {
    if (!token || !subscription) return
    try {
      setIsApproving(true)
      const approved = await approveSubscriptionApi(token, subscription.id, {
        startDate: useCustomApprovalDates ? approvalStartDate || undefined : undefined,
        endDate: useCustomApprovalDates ? approvalEndDate || undefined : undefined,
        verificationNotes: approvalNotes,
      })

      toast.success(
        `Plan "${approved.plan_name}" for ${approved.school_name} has been approved and activated!`
      )
      setIsApproveOpen(false)
      loadSubscription(false)
    } catch (err: any) {
      console.error("Approval error:", err)
      toast.error(err?.message || "Failed to approve plan.")
    } finally {
      setIsApproving(false)
    }
  }

  // Open Rejection Dialog
  const handleOpenReject = () => {
    setRejectionReason("")
    setIsRejectOpen(true)
  }

  // Submit Rejection
  const handleConfirmRejection = async () => {
    if (!token || !subscription) return
    try {
      setIsRejecting(true)
      await rejectSubscriptionApi(token, subscription.id, {
        rejectionReason: rejectionReason.trim() || "Rejected by Super Admin",
      })

      toast.info(`Subscription request for ${subscription.school_name} has been rejected.`)
      setIsRejectOpen(false)
      loadSubscription(false)
    } catch (err: any) {
      console.error("Rejection error:", err)
      toast.error(err?.message || "Failed to reject plan request.")
    } finally {
      setIsRejecting(false)
    }
  }

  // Open Status Toggle Modal (Active <-> Inactive)
  const handleOpenStatusModal = (status: "active" | "suspended") => {
    setTargetStatus(status)
    setStatusChangeNotes("")
    setIsStatusModalOpen(true)
  }

  // Submit Status Change (Active <-> Inactive)
  const handleConfirmStatusChange = async () => {
    if (!token || !subscription) return
    try {
      setIsUpdatingStatus(true)
      await updateSubscriptionStatusApi(token, subscription.id, {
        status: targetStatus,
        notes: statusChangeNotes.trim() || undefined,
      })

      const actionName = targetStatus === "active" ? "activated" : "marked inactive"
      toast.success(`Subscription has been ${actionName} successfully.`)
      setIsStatusModalOpen(false)
      loadSubscription(false)
    } catch (err: any) {
      console.error("Status update error:", err)
      toast.error(err?.message || "Failed to update subscription status.")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handlePrintInvoice = () => {
    window.print()
  }

  // Badge helpers
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1.5 font-medium px-3 py-1 text-xs">
            <Clock className="size-3.5" />
            Pending Offline UTR
          </Badge>
        )
      case "active":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 font-medium px-3 py-1 text-xs">
            <CheckCircle2 className="size-3.5" />
            Active
          </Badge>
        )
      case "trial":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1.5 font-medium px-3 py-1 text-xs">
            <ShieldCheck className="size-3.5" />
            Free Trial
          </Badge>
        )
      case "expired":
        return (
          <Badge className="bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30 gap-1.5 font-medium px-3 py-1 text-xs">
            <AlertCircle className="size-3.5" />
            Expired
          </Badge>
        )
      case "suspended":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1.5 font-medium px-3 py-1 text-xs">
            <PowerOff className="size-3.5" />
            Inactive
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1.5 font-medium px-3 py-1 text-xs">
            <XCircle className="size-3.5" />
            Rejected
          </Badge>
        )
      case "superseded":
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1.5 font-medium px-3 py-1 text-xs">
            Superseded
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="capitalize text-xs px-3 py-1">
            {status}
          </Badge>
        )
    }
  }

  const renderPaymentBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 font-medium px-3 py-1 text-xs">
            <Check className="size-3.5" /> Paid (Zero GST)
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1.5 font-medium px-3 py-1 text-xs">
            <Clock className="size-3.5" /> Unpaid / Pending Verification
          </Badge>
        )
      case "failed":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1.5 font-medium px-3 py-1 text-xs">
            <Ban className="size-3.5" /> Failed / Rejected
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="capitalize text-xs px-3 py-1">
            {status}
          </Badge>
        )
    }
  }

  // Days remaining calculation
  const getDaysRemaining = (endDateStr?: string | null) => {
    if (!endDateStr) return null
    try {
      const end = new Date(endDateStr.replace(" ", "T"))
      const now = new Date()
      const diffTime = end.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    } catch {
      return null
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-80 lg:col-span-2" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !subscription) {
    return (
      <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
        <Link to="/subscriptions">
          <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
            <ArrowLeft className="size-4" /> Back to Subscriptions
          </Button>
        </Link>
        <Card className="border-destructive/40 bg-destructive/5 text-center py-12">
          <CardContent className="space-y-4">
            <AlertCircle className="size-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Subscription Not Found</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {error || "The subscription record you requested does not exist or may have been deleted."}
            </p>
            <div className="pt-2">
              <Button onClick={() => loadSubscription(true)} variant="outline" className="gap-2">
                <RefreshCw className="size-4" /> Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const daysRemaining = getDaysRemaining(subscription.end_date)
  const orderDetails = subscription.order_details || null
  const auditLogs = subscription.audit_logs || []
  const invoiceNumber =
    subscription.invoice_no ||
    orderDetails?.invoice_no ||
    (subscription.payment_status === "completed" ? `INV-SUB-${subscription.id}` : null)

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
      {/* Breadcrumbs & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Link
            to="/subscriptions"
            className="hover:text-foreground font-medium transition-colors flex items-center gap-1"
          >
            <ShieldCheck className="size-3.5" />
            Plan Approvals & Subscriptions
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground font-semibold">Subscription #{subscription.id}</span>
        </div>

        <Link to="/subscriptions">
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 cursor-pointer">
            <ArrowLeft className="size-3.5" />
            Back to Subscriptions
          </Button>
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="size-6 text-primary" />
              {subscription.school_name}
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {subscription.school_code}
            </Badge>
            {invoiceNumber && (
              <Badge variant="secondary" className="font-mono text-xs gap-1">
                <FileText className="size-3" />
                {invoiceNumber}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {renderStatusBadge(subscription.status)}
            {renderPaymentBadge(subscription.payment_status)}
            <Badge variant="secondary" className="text-xs font-normal">
              {formatCycleLabel(subscription.billing_cycle)} Cycle
            </Badge>
            {subscription.action_type && (
              <Badge variant="outline" className="uppercase font-mono text-[11px]">
                {subscription.action_type.replace("_", " ")}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadSubscription(false)}
            disabled={isRefreshing}
            className="h-9 gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {(orderDetails || subscription.payment_status === "completed") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsInvoiceOpen(true)}
              className="h-9 gap-1.5 cursor-pointer border-primary/40 text-primary hover:bg-primary/10"
            >
              <Printer className="size-3.5" />
              Print Zero-GST Invoice
            </Button>
          )}

          {subscription.status === "pending" && canManageSubscription && (
            <>
              <Button
                size="sm"
                onClick={handleOpenApprove}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-9 px-3.5 gap-1.5 shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="size-4" />
                Approve Plan Request
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenReject}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-200 h-9 px-3.5 gap-1.5 cursor-pointer"
              >
                <XCircle className="size-4" />
                Reject Request
              </Button>
            </>
          )}

          {subscription.status === "active" && canManageSubscription && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenStatusModal("suspended")}
              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30 font-medium h-9 px-3.5 gap-1.5 cursor-pointer"
            >
              <PowerOff className="size-4" />
              Make Inactive
            </Button>
          )}

          {subscription.status === "suspended" && canManageSubscription && (
            <Button
              size="sm"
              onClick={() => handleOpenStatusModal("active")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-9 px-3.5 gap-1.5 shadow-sm cursor-pointer"
            >
              <Power className="size-4" />
              Make Active
            </Button>
          )}
        </div>
      </div>

      {/* Rejection / Warning Banner if Rejected */}
      {(subscription.status === "rejected" || subscription.status === "suspended") &&
        subscription.rejection_reason && (
          <Card className="border-rose-300 bg-rose-50/70 dark:bg-rose-950/20 dark:border-rose-900">
            <CardContent className="p-4 flex items-start gap-3">
              <XCircle className="size-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                  Subscription Request Rejected
                </h4>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-1">
                  Reason: {subscription.rejection_reason}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: School Information */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  School Organization Details
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  ID: #{subscription.school_id}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">School Name</span>
                  <div className="font-medium text-foreground">{subscription.school_name}</div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">School Code</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-foreground">
                      {subscription.school_code}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => handleCopy("school_code", subscription.school_code)}
                      title="Copy code"
                    >
                      {copiedKey === "school_code" ? (
                        <Check className="size-3 text-emerald-600" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Contact Email</span>
                  {subscription.school_email ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={`mailto:${subscription.school_email}`}
                        className="text-primary hover:underline flex items-center gap-1.5 truncate"
                      >
                        <Mail className="size-3.5 shrink-0" />
                        <span className="truncate">{subscription.school_email}</span>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                        onClick={() => handleCopy("school_email", subscription.school_email!)}
                        title="Copy email"
                      >
                        {copiedKey === "school_email" ? (
                          <Check className="size-3 text-emerald-600" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Not provided</span>
                  )}
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Phone Number</span>
                  {subscription.school_phone ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${subscription.school_phone}`}
                        className="text-primary hover:underline flex items-center gap-1.5"
                      >
                        <Phone className="size-3.5 shrink-0" />
                        <span>{subscription.school_phone}</span>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                        onClick={() => handleCopy("school_phone", subscription.school_phone!)}
                        title="Copy phone"
                      >
                        {copiedKey === "school_phone" ? (
                          <Check className="size-3 text-emerald-600" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Not provided</span>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground block mb-0.5">Campus Address</span>
                  <div className="flex items-start gap-1.5 text-foreground">
                    <MapPin className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <span>{subscription.school_address || "No address specified."}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Plan & Package Details */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  Subscription Plan & Quotas
                </CardTitle>
                <div className="flex items-center gap-2">
                  {subscription.tier_rank ? (
                    <Badge variant="secondary" className="font-mono text-xs">
                      Tier Rank #{subscription.tier_rank}
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="font-mono text-xs">
                    Plan ID: #{subscription.plan_id}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Plan Name</span>
                  <div className="font-semibold text-foreground text-base">
                    {subscription.plan_name}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Plan Code</span>
                  <div className="font-mono text-foreground">
                    {subscription.plan_code || "N/A"}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Billing Cycle</span>
                  <div className="font-medium text-foreground">
                    {formatCycleLabel(subscription.billing_cycle)}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Base Plan Price (Net)</span>
                  <div className="font-medium text-foreground">
                    {formatCurrency(subscription.plan_amount ?? subscription.plan_price)}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Max Students Capacity</span>
                  <div className="font-medium text-foreground">
                    {subscription.max_students && subscription.max_students > 0
                      ? `${subscription.max_students.toLocaleString("en-IN")} Students`
                      : "Unlimited Students"}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Teachers & Branches</span>
                  <div className="font-medium text-emerald-600 dark:text-emerald-400">
                    Unlimited Teachers & Unlimited Branches
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Included Base Storage</span>
                  <div className="font-medium text-foreground">
                    {Number(subscription.included_storage_gb) || 0} GB Included
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Subscription Status</span>
                  <div>{renderStatusBadge(subscription.status)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Itemized Order & Add-ons Breakdown (Zero GST) */}
          {orderDetails && (
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Package className="size-4 text-primary" />
                    Itemized Order & Add-ons Breakdown (Zero GST)
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {orderDetails.order_no}
                    </Badge>
                    {orderDetails.invoice_no && (
                      <Badge className="font-mono text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                        {orderDetails.invoice_no}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {orderDetails.line_items && orderDetails.line_items.length > 0 ? (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground uppercase border-b font-semibold">
                        <tr>
                          <th className="px-3 py-2.5">Item / Add-on</th>
                          <th className="px-3 py-2.5">Category</th>
                          <th className="px-3 py-2.5 text-right">Qty</th>
                          <th className="px-3 py-2.5 text-right">Unit Net</th>
                          <th className="px-3 py-2.5 text-right">Total Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {orderDetails.line_items.map((li, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2.5 font-medium text-foreground">
                              {li.title}
                              {li.description && (
                                <span className="block text-[11px] text-muted-foreground font-normal">
                                  {li.description}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 capitalize text-muted-foreground">
                              {li.category.replace("_", " ")}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">{li.quantity}</td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              {formatCurrency(li.unit_price)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground">
                              {formatCurrency(li.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <div className="p-3.5 rounded-lg bg-muted/40 border space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Software Plan Amount</span>
                    <span className="font-mono font-medium">
                      {formatCurrency(orderDetails.plan_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Add-ons Total (Storage / Hardware / Credits)</span>
                    <span className="font-mono font-medium">
                      {formatCurrency(orderDetails.addons_amount)}
                    </span>
                  </div>
                  {Number(orderDetails.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>
                        Coupon Discount {orderDetails.coupon_code ? `(${orderDetails.coupon_code})` : ""}
                      </span>
                      <span className="font-mono font-semibold">
                        -{formatCurrency(orderDetails.discount_amount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax / GST</span>
                    <span className="font-mono">₹0.00 (Zero GST)</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-sm text-foreground">
                    <span>Net Grand Total</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(orderDetails.grand_total)}
                    </span>
                  </div>
                </div>

                {orderDetails.shipping_address && (
                  <div className="p-3 rounded-lg border bg-amber-500/5 text-xs space-y-1">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-primary" />
                      Hardware Dispatch / Shipping Address
                    </span>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {orderDetails.shipping_address}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Card: Payment & Transaction Details */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                Payment & Billing Summary (Zero GST)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Payment Status</span>
                  <div>{renderPaymentBadge(subscription.payment_status)}</div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Net Total Paid</span>
                  <div className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(subscription.amount_paid)}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Original Gross Amount</span>
                  <div className="font-medium text-muted-foreground">
                    {subscription.original_amount
                      ? formatCurrency(subscription.original_amount)
                      : formatCurrency(subscription.plan_price)}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Coupon & Discount</span>
                  {subscription.coupon_code ? (
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {subscription.coupon_code}
                      </Badge>
                      {Number(subscription.discount_amount || 0) > 0 && (
                        <span className="text-emerald-600 text-xs font-semibold">
                          (-{formatCurrency(subscription.discount_amount)})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No coupon applied</span>
                  )}
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Payment Method</span>
                  <div className="font-medium text-foreground uppercase">
                    {(subscription.payment_gateway || "Direct / Bank Transfer").replace("_", " ")}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Transaction / UTR Reference</span>
                  {subscription.payment_transaction_id ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-foreground truncate">
                        {subscription.payment_transaction_id}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                        onClick={() =>
                          handleCopy("payment_transaction_id", subscription.payment_transaction_id!)
                        }
                        title="Copy Transaction ID"
                      >
                        {copiedKey === "payment_transaction_id" ? (
                          <Check className="size-3 text-emerald-600" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">None provided</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Subscription Audit Trail */}
          {auditLogs.length > 0 && (
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <History className="size-4 text-primary" />
                  Subscription Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg border bg-muted/20 text-xs space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="uppercase font-mono text-[10px]">
                            {log.action.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-muted-foreground">
                            by <strong className="text-foreground">{log.actor_type}</strong>
                          </span>
                        </div>
                        <span className="text-muted-foreground font-mono text-[11px]">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>

                      {(log.old_status || log.new_status || log.new_end_date) && (
                        <div className="text-muted-foreground flex flex-wrap items-center gap-3">
                          {(log.old_status || log.new_status) && (
                            <span>
                              Status:{" "}
                              <code className="font-mono">{log.old_status || "none"}</code> &rarr;{" "}
                              <code className="font-mono text-foreground">
                                {log.new_status || "—"}
                              </code>
                            </span>
                          )}
                          {log.new_end_date && (
                            <span>
                              Validity End:{" "}
                              {log.old_end_date ? `${formatDate(log.old_end_date)} → ` : ""}
                              <strong className="text-foreground">
                                {formatDate(log.new_end_date)}
                              </strong>
                            </span>
                          )}
                        </div>
                      )}

                      {log.notes && (
                        <p className="text-foreground/90 pt-0.5 whitespace-pre-wrap">{log.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (1 Col wide on desktop) */}
        <div className="space-y-6">
          {/* Card: Validity & Timeline */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                Validity & Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-xs text-muted-foreground">Subscription ID</span>
                <span className="font-mono font-semibold text-foreground">#{subscription.id}</span>
              </div>

              {invoiceNumber && (
                <div className="flex justify-between items-center py-1.5 border-b">
                  <span className="text-xs text-muted-foreground">Invoice Number</span>
                  <span className="font-mono font-semibold text-foreground">{invoiceNumber}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-xs text-muted-foreground">Start Date</span>
                <span className="font-medium text-foreground">
                  {subscription.status === "pending"
                    ? "Pending Activation"
                    : formatDate(subscription.start_date)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-xs text-muted-foreground">End Date</span>
                <span className="font-medium text-foreground">
                  {subscription.status === "pending"
                    ? "Pending Activation"
                    : formatDate(subscription.end_date)}
                </span>
              </div>

              {(subscription.status === "active" || subscription.status === "trial") && (
                <div className="flex justify-between items-center py-1.5 border-b">
                  <span className="text-xs text-muted-foreground">Validity Status</span>
                  <span className="text-xs font-semibold">
                    {daysRemaining !== null && daysRemaining > 0 ? (
                      <span className="text-emerald-600">{daysRemaining} days remaining</span>
                    ) : daysRemaining !== null && daysRemaining === 0 ? (
                      <span className="text-amber-600">Expires today</span>
                    ) : (
                      <span className="text-rose-600">Expired</span>
                    )}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-xs text-muted-foreground">Created On</span>
                <span className="text-foreground text-xs">{formatDateTime(subscription.created_at)}</span>
              </div>

              {subscription.updated_at && (
                <div className="flex justify-between items-center py-1.5 border-b">
                  <span className="text-xs text-muted-foreground">Last Updated</span>
                  <span className="text-foreground text-xs">
                    {formatDateTime(subscription.updated_at)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Verification & Audit */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserCheck className="size-4 text-primary" />
                Admin Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block mb-1 font-semibold">
                  Verification Status
                </span>
                {subscription.status === "pending" ? (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <Clock className="size-4 shrink-0" />
                    <span>Awaiting Super Admin review of Offline Bank Transfer UTR.</span>
                  </div>
                ) : subscription.status === "rejected" || subscription.status === "suspended" ? (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                    <XCircle className="size-4 shrink-0" />
                    <span>
                      {subscription.status === "rejected"
                        ? "Offline subscription request was rejected."
                        : "Subscription is currently marked inactive."}
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>Subscription verified and active.</span>
                  </div>
                )}
              </div>

              {subscription.verified_by_name && (
                <div className="pt-2 text-xs">
                  <span className="text-muted-foreground block">Verified By:</span>
                  <span className="font-semibold text-foreground">
                    {subscription.verified_by_name}
                  </span>
                  {subscription.verified_at && (
                    <span className="text-muted-foreground block mt-0.5">
                      at {formatDateTime(subscription.verified_at)}
                    </span>
                  )}
                </div>
              )}

              {subscription.verification_notes && (
                <div className="p-3 rounded-lg bg-muted/60 border text-xs space-y-1">
                  <span className="text-muted-foreground font-semibold block">
                    Verification Notes:
                  </span>
                  <p className="text-foreground whitespace-pre-wrap">
                    {subscription.verification_notes}
                  </p>
                </div>
              )}

              {subscription.rejection_reason && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
                  <span className="text-rose-700 dark:text-rose-400 font-semibold block">
                    Rejection Reason:
                  </span>
                  <p className="text-foreground whitespace-pre-wrap">
                    {subscription.rejection_reason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Printable Zero-GST Invoice Dialog */}
      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 pr-6">
              <span className="flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Subscription Invoice / Payment Receipt (Zero GST)
              </span>
              <Button
                type="button"
                size="sm"
                onClick={handlePrintInvoice}
                className="h-8 gap-1.5 text-xs cursor-pointer print:hidden"
              >
                <Printer className="size-3.5" />
                Print / Save PDF
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="border rounded-xl p-5 space-y-5 text-xs bg-background">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-foreground">GrowVidya Cloud ERP</h3>
                <p className="text-muted-foreground">Official SaaS Subscription & Add-on Receipt</p>
              </div>
              <div className="sm:text-right space-y-0.5">
                <div className="font-mono font-bold text-sm text-foreground">
                  {invoiceNumber || `ORD-${subscription.id}`}
                </div>
                {orderDetails?.order_no && (
                  <div className="font-mono text-muted-foreground">
                    Order Ref: {orderDetails.order_no}
                  </div>
                )}
                <div className="text-muted-foreground">
                  Date: {formatDate(orderDetails?.paid_at || subscription.created_at)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] uppercase font-semibold text-muted-foreground">
                  Billed To
                </span>
                <div className="font-bold text-sm text-foreground mt-0.5">
                  {subscription.school_name} ({subscription.school_code})
                </div>
                {subscription.school_email && <div>{subscription.school_email}</div>}
                {subscription.school_phone && <div>{subscription.school_phone}</div>}
                {subscription.school_address && (
                  <div className="text-muted-foreground mt-0.5">{subscription.school_address}</div>
                )}
              </div>

              <div className="sm:text-right space-y-1">
                <div>
                  <span className="text-muted-foreground">Payment Status: </span>
                  <strong className="uppercase text-emerald-600">
                    {subscription.payment_status}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Gateway: </span>
                  <strong className="uppercase">
                    {(subscription.payment_gateway || "Direct").replace("_", " ")}
                  </strong>
                </div>
                {subscription.payment_transaction_id && (
                  <div>
                    <span className="text-muted-foreground">Txn / UTR: </span>
                    <code className="font-mono">{subscription.payment_transaction_id}</code>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Validity: </span>
                  <strong>
                    {formatDate(subscription.start_date)} &rarr; {formatDate(subscription.end_date)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 border-b font-semibold">
                  <tr>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Net</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orderDetails?.line_items && orderDetails.line_items.length > 0 ? (
                    orderDetails.line_items.map((li, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium">{li.title}</td>
                        <td className="px-3 py-2 text-right font-mono">{li.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatCurrency(li.unit_price)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">
                          {formatCurrency(li.total)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-2 font-medium">
                        {subscription.plan_name} ({formatCycleLabel(subscription.billing_cycle)})
                      </td>
                      <td className="px-3 py-2 text-right font-mono">1</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatCurrency(subscription.original_amount ?? subscription.plan_price)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">
                        {formatCurrency(subscription.original_amount ?? subscription.plan_price)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-full sm:w-64 space-y-1.5">
                {Number(subscription.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({subscription.coupon_code || "Coupon"})</span>
                    <span className="font-mono">
                      -{formatCurrency(subscription.discount_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax / GST</span>
                  <span className="font-mono">₹0.00 (Zero GST)</span>
                </div>
                <div className="flex justify-between pt-2 border-t text-sm font-bold text-foreground">
                  <span>Total Net Paid</span>
                  <span className="font-mono">{formatCurrency(subscription.amount_paid)}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Modal Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
              Approve & Activate Subscription
            </DialogTitle>
            <DialogDescription>
              Confirm offline UTR payment verification and activate{" "}
              <strong>{subscription.school_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">School:</span>
                <span className="font-semibold text-foreground">{subscription.school_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested Plan:</span>
                <span className="font-semibold text-foreground">{subscription.plan_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing Cycle:</span>
                <span className="font-semibold text-foreground">
                  {formatCycleLabel(subscription.billing_cycle)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Amount (Zero GST):</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(subscription.amount_paid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">UTR / Transaction ID:</span>
                <span className="font-mono text-foreground">
                  {subscription.payment_transaction_id || "None"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useCustomApprovalDates}
                  onChange={(e) => setUseCustomApprovalDates(e.target.checked)}
                  className="rounded border-border"
                />
                <span>Override automatic validity dates (leave unchecked to preserve remaining days on early renewals)</span>
              </label>

              {useCustomApprovalDates && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="approve_start" className="text-xs font-semibold">
                      Start Date
                    </Label>
                    <Input
                      id="approve_start"
                      type="date"
                      value={approvalStartDate}
                      onChange={(e) => {
                        setApprovalStartDate(e.target.value)
                        if (e.target.value) {
                          setApprovalEndDate(
                            computeCycleEndDate(e.target.value, subscription.billing_cycle)
                          )
                        }
                      }}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="approve_end" className="text-xs font-semibold">
                      End Date
                    </Label>
                    <Input
                      id="approve_end"
                      type="date"
                      value={approvalEndDate}
                      onChange={(e) => setApprovalEndDate(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="approve_notes" className="text-xs font-semibold">
                Verification Notes
              </Label>
              <textarea
                id="approve_notes"
                rows={3}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Payment verified via bank transfer..."
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

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

      {/* Reject Modal Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <XCircle className="size-5" />
              Reject Offline Transfer Request
            </DialogTitle>
            <DialogDescription>
              Rejecting marks this offline request for{" "}
              <strong>{subscription.school_name}</strong> as Rejected without disturbing any existing active plan.
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
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

      {/* Active <-> Inactive Status Toggle Dialog */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle
              className={`flex items-center gap-2 ${
                targetStatus === "active"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {targetStatus === "active" ? (
                <Power className="size-5" />
              ) : (
                <PowerOff className="size-5" />
              )}
              {targetStatus === "active"
                ? "Activate School Subscription"
                : "Deactivate Subscription (Mark Inactive)"}
            </DialogTitle>
            <DialogDescription>
              {targetStatus === "active"
                ? "Activating this subscription will restore full institutional access for the school."
                : "Deactivating this subscription will suspend module access for the school until reactivated."}
            </DialogDescription>
          </DialogHeader>

          {subscription && (
            <div className="space-y-4 py-2 text-sm">
              <div className="p-3 rounded-lg bg-muted/60 border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">School:</span>
                  <span className="font-semibold text-foreground">
                    {subscription.school_name} ({subscription.school_code})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium text-foreground">
                    {subscription.plan_name} ({formatCycleLabel(subscription.billing_cycle)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Status:</span>
                  <div>{renderStatusBadge(subscription.status)}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="details_status_notes" className="text-xs font-semibold">
                  Reason / Notes <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <textarea
                  id="details_status_notes"
                  rows={2}
                  value={statusChangeNotes}
                  onChange={(e) => setStatusChangeNotes(e.target.value)}
                  placeholder={
                    targetStatus === "suspended"
                      ? "e.g. Payment overdue, Administrative review, Requested by school"
                      : "e.g. Payment cleared, Subscription restored"
                  }
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStatusModalOpen(false)}
              disabled={isUpdatingStatus}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmStatusChange}
              disabled={isUpdatingStatus}
              className={`gap-1.5 cursor-pointer text-white font-semibold ${
                targetStatus === "active"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {isUpdatingStatus ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Updating...
                </>
              ) : targetStatus === "active" ? (
                <>
                  <Power className="size-4" />
                  Confirm & Make Active
                </>
              ) : (
                <>
                  <PowerOff className="size-4" />
                  Confirm & Make Inactive
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
