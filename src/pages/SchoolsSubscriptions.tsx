import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  fetchSubscriptionsApi,
  approveSubscriptionApi,
  rejectSubscriptionApi,
  updateSubscriptionStatusApi,
  fetchSchoolsLookupApi,
  fetchPackagesApi,
  manualAssignSubscriptionApi,
} from "@/services/subscriptionService"
import type {
  SchoolSubscription,
  SubscriptionCounts,
  SubscriptionsPagination,
  SchoolLookupItem,
  SubscriptionPackage,
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
  Power,
  PowerOff,
  UserCog,
  FileText,
} from "lucide-react"

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

function formatCycleLabel(cycle?: string) {
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

export default function SchoolsSubscriptions() {
  const token = useAppSelector((state) => state.auth.token)
  const { can } = usePermission()
  const canManageSubscription = can(["subscriptions", "schools"], "can_manage")
  const canViewPackages = can("packages", "can_view")

  const [subscriptions, setSubscriptions] = useState<SchoolSubscription[]>([])
  const [counts, setCounts] = useState<SubscriptionCounts>({
    total: 0,
    pending: 0,
    active: 0,
    expired: 0,
    suspended: 0,
    trial: 0,
    rejected: 0,
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

  // Approve modal state
  const [selectedSubForApproval, setSelectedSubForApproval] = useState<SchoolSubscription | null>(null)
  const [isApproveOpen, setIsApproveOpen] = useState<boolean>(false)
  const [useCustomApprovalDates, setUseCustomApprovalDates] = useState<boolean>(false)
  const [approvalStartDate, setApprovalStartDate] = useState<string>("")
  const [approvalEndDate, setApprovalEndDate] = useState<string>("")
  const [approvalNotes, setApprovalNotes] = useState<string>("")
  const [isApproving, setIsApproving] = useState<boolean>(false)

  // Reject modal state
  const [selectedSubForRejection, setSelectedSubForRejection] = useState<SchoolSubscription | null>(null)
  const [isRejectOpen, setIsRejectOpen] = useState<boolean>(false)
  const [rejectionReason, setRejectionReason] = useState<string>("")
  const [isRejecting, setIsRejecting] = useState<boolean>(false)

  // Active <-> Inactive toggle modal state
  const [selectedSubForStatusChange, setSelectedSubForStatusChange] = useState<SchoolSubscription | null>(null)
  const [targetStatus, setTargetStatus] = useState<"active" | "suspended">("suspended")
  const [statusChangeNotes, setStatusChangeNotes] = useState<string>("")
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false)
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false)

  // Manual Plan Assignment (Enterprise Override) modal state
  const [isManualAssignOpen, setIsManualAssignOpen] = useState<boolean>(false)
  const [schoolSearchInput, setSchoolSearchInput] = useState<string>("")
  const [schoolsList, setSchoolsList] = useState<SchoolLookupItem[]>([])
  const [activePlans, setActivePlans] = useState<SubscriptionPackage[]>([])
  const [isLoadingLookup, setIsLoadingLookup] = useState<boolean>(false)
  const [manualSchoolId, setManualSchoolId] = useState<string>("")
  const [manualPlanId, setManualPlanId] = useState<string>("")
  const [manualCustomEndDate, setManualCustomEndDate] = useState<string>("")
  const [manualAmountPaid, setManualAmountPaid] = useState<string>("0")
  const [manualReason, setManualReason] = useState<string>("")
  const [isManualAssigning, setIsManualAssigning] = useState<boolean>(false)

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

  // Open Manual Plan Assignment modal
  const handleOpenManualAssign = async () => {
    if (!token || !canManageSubscription) return
    setIsManualAssignOpen(true)
    setManualSchoolId("")
    setManualPlanId("")
    setManualCustomEndDate("")
    setManualAmountPaid("0")
    setManualReason("")
    setSchoolSearchInput("")
    setIsLoadingLookup(true)
    try {
      const [schools, pkgRes] = await Promise.all([
        fetchSchoolsLookupApi(token, ""),
        fetchPackagesApi(token, { status: 1, limit: 100 }),
      ])
      setSchoolsList(schools || [])
      setActivePlans(pkgRes?.packages || [])
    } catch (err: any) {
      toast.error(err?.message || "Failed to load schools & plans for manual assignment.")
    } finally {
      setIsLoadingLookup(false)
    }
  }

  const handleSearchSchoolsLookup = async () => {
    if (!token) return
    setIsLoadingLookup(true)
    try {
      const schools = await fetchSchoolsLookupApi(token, schoolSearchInput)
      setSchoolsList(schools || [])
    } catch (err: any) {
      toast.error(err?.message || "Failed to search schools.")
    } finally {
      setIsLoadingLookup(false)
    }
  }

  const handleConfirmManualAssign = async () => {
    if (!token) return
    if (!manualSchoolId) {
      toast.error("Please select a school.")
      return
    }
    if (!manualPlanId) {
      toast.error("Please select a target subscription plan.")
      return
    }
    if (!manualReason.trim()) {
      toast.error("An audit reason is mandatory for Manual Plan Assignment.")
      return
    }

    setIsManualAssigning(true)
    try {
      const assigned = await manualAssignSubscriptionApi(token, {
        school_id: Number(manualSchoolId),
        plan_id: Number(manualPlanId),
        custom_end_date: manualCustomEndDate || null,
        amount_paid: Number(manualAmountPaid || 0),
        reason: manualReason.trim(),
      })
      toast.success(
        `Plan "${assigned.plan_name}" manually assigned to ${assigned.school_name} and logged in audit trail.`
      )
      setIsManualAssignOpen(false)
      loadSubscriptions()
    } catch (err: any) {
      toast.error(err?.message || "Failed to manually assign subscription plan.")
    } finally {
      setIsManualAssigning(false)
    }
  }

  // Open approval modal
  const handleOpenApprove = (sub: SchoolSubscription) => {
    setSelectedSubForApproval(sub)
    const todayStr = new Date().toISOString().split("T")[0]
    setApprovalStartDate(todayStr)
    setApprovalEndDate(computeCycleEndDate(todayStr, sub.billing_cycle))
    setUseCustomApprovalDates(false)
    setApprovalNotes(
      `Offline Bank Transfer verified and approved by Super Admin on ${new Date().toLocaleDateString()}`
    )
    setIsApproveOpen(true)
  }

  // Submit approval
  const handleConfirmApproval = async () => {
    if (!token || !selectedSubForApproval) return
    try {
      setIsApproving(true)
      const approved = await approveSubscriptionApi(token, selectedSubForApproval.id, {
        startDate: useCustomApprovalDates ? approvalStartDate || undefined : undefined,
        endDate: useCustomApprovalDates ? approvalEndDate || undefined : undefined,
        verificationNotes: approvalNotes,
      })

      toast.success(
        `Plan "${approved.plan_name}" for ${approved.school_name} has been approved and is now ACTIVE!`
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

  // Open Toggle Status Modal (Active <-> Inactive)
  const handleOpenToggleStatus = (sub: SchoolSubscription, newStatus: "active" | "suspended") => {
    setSelectedSubForStatusChange(sub)
    setTargetStatus(newStatus)
    setStatusChangeNotes("")
    setIsStatusModalOpen(true)
  }

  // Submit Status Change (Active <-> Inactive)
  const handleConfirmStatusChange = async () => {
    if (!token || !selectedSubForStatusChange) return
    try {
      setIsSubmittingStatus(true)
      await updateSubscriptionStatusApi(token, selectedSubForStatusChange.id, {
        status: targetStatus,
        notes: statusChangeNotes.trim() || undefined,
      })

      const actionName = targetStatus === "active" ? "activated" : "marked inactive"
      toast.success(
        `Subscription for "${selectedSubForStatusChange.school_name}" has been ${actionName} successfully.`
      )
      setIsStatusModalOpen(false)
      setSelectedSubForStatusChange(null)
      loadSubscriptions()
    } catch (err: any) {
      console.error("Status update error:", err)
      toast.error(err?.message || "Failed to update subscription status.")
    } finally {
      setIsSubmittingStatus(false)
    }
  }

  // Status badge styling helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1.5 font-medium px-2.5 py-0.5">
            <Clock className="size-3.5" />
            Pending Offline UTR
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
            <PowerOff className="size-3.5" />
            Inactive
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1.5 font-medium px-2.5 py-0.5">
            <XCircle className="size-3.5" />
            Rejected
          </Badge>
        )
      case "superseded":
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1.5 font-medium px-2.5 py-0.5">
            Superseded
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
            <Check className="size-3" /> Paid (Zero GST)
          </span>
        )
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Clock className="size-3" /> Pending Verification
          </span>
        )
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <Ban className="size-3" /> Failed / Rejected
          </span>
        )
      default:
        return <span className="text-xs text-muted-foreground">{status}</span>
    }
  }

  const schoolSelectLabels: Record<string, string> = {}
  for (const s of schoolsList) {
    schoolSelectLabels[String(s.id)] = `${s.school_name} (${s.school_code})${
      s.plan_name ? ` — Current: ${s.plan_name}` : ""
    }`
  }

  const planSelectLabels: Record<string, string> = {}
  for (const p of activePlans) {
    planSelectLabels[String(p.id)] = `${p.plan_name} [Tier ${p.tier_rank || 1} • ${formatCycleLabel(
      p.billing_cycle
    )} • ₹${Number(p.price || 0).toLocaleString("en-IN")}]`
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="size-7 text-primary" />
            School Subscriptions & Offline Bank Approvals
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Online Razorpay orders activate instantaneously. Review offline UTR bank transfers or assign enterprise plans manually below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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

          {canManageSubscription && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenManualAssign}
              className="gap-2 cursor-pointer border-primary/40 text-primary hover:bg-primary/10"
            >
              <UserCog className="size-4" />
              Manual Plan Assignment
            </Button>
          )}

          {canViewPackages && (
            <Button
              render={<Link to="/plans-pricing" />}
              size="sm"
              className="gap-2 cursor-pointer"
            >
              <Layers className="size-4" />
              Manage Packages
            </Button>
          )}
        </div>
      </div>

      {/* Live Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Offline UTR Queue
              </p>
              <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                {counts.pending}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Bank transfers to verify</p>
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="size-5" />
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
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active
              </p>
              <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {counts.active}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Fully operational</p>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Inactive Subscriptions Card */}
        <Card
          className={`border-2 transition-all cursor-pointer ${
            selectedStatusTab === "suspended"
              ? "border-rose-500 bg-rose-500/5 shadow-sm"
              : "border-border hover:border-rose-500/50"
          }`}
          onClick={() => {
            setSelectedStatusTab("suspended")
            setCurrentPage(1)
          }}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Inactive
              </p>
              <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                {counts.suspended}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Access suspended</p>
            </div>
            <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <PowerOff className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Expired Card */}
        <Card
          className={`border-2 transition-all cursor-pointer ${
            selectedStatusTab === "expired"
              ? "border-gray-500 bg-gray-500/5 shadow-sm"
              : "border-border hover:border-gray-500/50"
          }`}
          onClick={() => {
            setSelectedStatusTab("expired")
            setCurrentPage(1)
          }}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Expired
              </p>
              <h3 className="text-2xl font-extrabold text-gray-700 dark:text-gray-300 mt-1">
                {counts.expired}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Renewal required</p>
            </div>
            <div className="size-10 rounded-xl bg-gray-500/10 text-gray-600 dark:text-gray-400 flex items-center justify-center shrink-0">
              <AlertCircle className="size-5" />
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
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                All
              </p>
              <h3 className="text-2xl font-extrabold text-foreground mt-1">
                {counts.total}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Total recorded</p>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Layers className="size-5" />
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
            Pending Offline
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
              setSelectedStatusTab("trial")
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedStatusTab === "trial"
                ? "bg-background text-blue-700 dark:text-blue-400 shadow-sm border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="size-3.5 text-blue-500" />
            Trial
            <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-muted text-muted-foreground">
              {counts.trial || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedStatusTab("suspended")
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedStatusTab === "suspended"
                ? "bg-background text-rose-700 dark:text-rose-400 shadow-sm border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PowerOff className="size-3.5 text-rose-500" />
            Inactive
            <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-muted text-muted-foreground">
              {counts.suspended}
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
                ? "bg-background text-gray-700 dark:text-gray-300 shadow-sm border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertCircle className="size-3.5 text-gray-500" />
            Expired
            <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-muted text-muted-foreground">
              {counts.expired}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedStatusTab("rejected")
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedStatusTab === "rejected"
                ? "bg-background text-rose-700 dark:text-rose-400 shadow-sm border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <XCircle className="size-3.5 text-rose-500" />
            Rejected
            <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-muted text-muted-foreground">
              {counts.rejected || 0}
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
            <Layers className="size-3.5 text-primary" />
            All
            <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-muted text-muted-foreground">
              {counts.total}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search school, code, UTR, INV-..."
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
                <th className="px-4 py-3.5">Plan & Action</th>
                <th className="px-4 py-3.5">Net Amount & Gateway</th>
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
                          ? "No Pending Offline Bank Transfers"
                          : "No Subscription Records Found"}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {selectedStatusTab === "pending"
                          ? "Online Razorpay payments activate automatically. Offline bank transfers with UTR numbers appear here for verification."
                          : "No school subscriptions match your active filters."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const isPending = sub.status === "pending"
                  const isActive = sub.status === "active"
                  const isSuspended = sub.status === "suspended"
                  const addonsAmt = parseFloat(String(sub.addons_amount || 0))
                  const planAmt = parseFloat(String(sub.plan_amount ?? sub.plan_price ?? 0))

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
                            {(sub.invoice_no || sub.order_no) && (
                              <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                                <FileText className="size-3 text-primary/70" />
                                <span>{sub.invoice_no || sub.order_no}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Plan details */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-foreground">{sub.plan_name}</span>
                          {sub.tier_rank ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                              T{sub.tier_rank}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="font-semibold text-foreground/80">
                            {formatCycleLabel(sub.billing_cycle)}
                          </span>
                          {sub.action_type && (
                            <>
                              <span>•</span>
                              <span className="uppercase text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                                {sub.action_type.replace("_", " ")}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Amount & Gateway */}
                      <td className="px-4 py-4">
                        <div className="font-bold text-foreground">
                          ₹{parseFloat(String(sub.amount_paid || 0)).toLocaleString("en-IN")}
                        </div>
                        {addonsAmt > 0 && (
                          <div className="text-[11px] text-muted-foreground">
                            Plan ₹{planAmt.toLocaleString("en-IN")} + Add-ons ₹
                            {addonsAmt.toLocaleString("en-IN")}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span className="capitalize font-medium">
                            {(sub.payment_gateway || "Direct").replace("_", " ")}
                          </span>
                          {sub.payment_transaction_id && (
                            <span
                              className="font-mono text-[11px] truncate max-w-[110px]"
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
                          <span className="font-medium text-foreground">Created: </span>
                          {new Date(sub.created_at).toLocaleDateString("en-IN")}
                        </div>
                        {(sub.status === "active" || sub.status === "trial") && sub.end_date && (
                          <div className="mt-0.5">
                            <span className="font-medium text-foreground">Expires: </span>
                            {new Date(sub.end_date).toLocaleDateString("en-IN")}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && canManageSubscription && (
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

                          {isActive && canManageSubscription && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenToggleStatus(sub, "suspended")}
                              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30 text-xs h-8 px-2.5 gap-1.5 cursor-pointer font-medium"
                              title="Make Inactive"
                            >
                              <PowerOff className="size-3.5" />
                              Make Inactive
                            </Button>
                          )}

                          {isSuspended && canManageSubscription && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenToggleStatus(sub, "active")}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-2.5 gap-1.5 shadow-sm cursor-pointer"
                              title="Make Active"
                            >
                              <Power className="size-3.5" />
                              Make Active
                            </Button>
                          )}

                          <Link to={`/subscriptions/${sub.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="View Subscription & Invoice Details"
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

      {/* Review & Approve Offline Bank Transfer Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
              Approve Offline Bank Transfer & Activate Plan
            </DialogTitle>
            <DialogDescription>
              Verify the school&apos;s UTR / bank transfer reference below. Approving generates a Zero-GST Invoice, activates bundled add-ons, and credits any purchased SMS/Push packs.
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
                    {selectedSubForApproval.plan_name} (
                    {formatCycleLabel(selectedSubForApproval.billing_cycle)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net Amount (Zero GST):</span>
                  <span className="font-bold text-foreground">
                    ₹{parseFloat(String(selectedSubForApproval.amount_paid || 0)).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gateway / UTR Reference:</span>
                  <span className="font-mono text-xs text-foreground">
                    {selectedSubForApproval.payment_gateway || "Bank Transfer"}{" "}
                    {selectedSubForApproval.payment_transaction_id
                      ? `(${selectedSubForApproval.payment_transaction_id})`
                      : ""}
                  </span>
                </div>
              </div>

              {/* Automatic Renewal Stacking vs Custom Date Override */}
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
                      <Label htmlFor="start_date" className="text-xs font-semibold">
                        Effective Start Date
                      </Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={approvalStartDate}
                        onChange={(e) => {
                          setApprovalStartDate(e.target.value)
                          if (e.target.value && selectedSubForApproval) {
                            setApprovalEndDate(
                              computeCycleEndDate(e.target.value, selectedSubForApproval.billing_cycle)
                            )
                          }
                        }}
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
                )}
              </div>

              {/* Approval Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="approval_notes" className="text-xs font-semibold">
                  Admin Approval Notes
                </Label>
                <textarea
                  id="approval_notes"
                  rows={2}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="e.g. Bank transfer UTR verified in statement..."
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
              Reject Offline Transfer Request
            </DialogTitle>
            <DialogDescription>
              Rejecting this pending request for{" "}
              <strong>{selectedSubForRejection?.school_name}</strong> marks it as{" "}
              <strong>Rejected</strong> without disturbing any existing active plan on their account.
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
              placeholder="e.g. UTR transaction reference could not be matched in bank statement."
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

          {selectedSubForStatusChange && (
            <div className="space-y-4 py-2 text-sm">
              <div className="p-3 rounded-lg bg-muted/60 border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">School:</span>
                  <span className="font-semibold text-foreground">
                    {selectedSubForStatusChange.school_name} ({selectedSubForStatusChange.school_code})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium text-foreground">
                    {selectedSubForStatusChange.plan_name} (
                    {formatCycleLabel(selectedSubForStatusChange.billing_cycle)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Status:</span>
                  <div>{renderStatusBadge(selectedSubForStatusChange.status)}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status_notes" className="text-xs font-semibold">
                  Reason / Notes <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <textarea
                  id="status_notes"
                  rows={2}
                  value={statusChangeNotes}
                  onChange={(e) => setStatusChangeNotes(e.target.value)}
                  placeholder={
                    targetStatus === "suspended"
                      ? "e.g. Payment overdue, Administrative review, Requested by school"
                      : "e.g. Payment cleared, Subscription restored"
                  }
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStatusModalOpen(false)}
              disabled={isSubmittingStatus}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmStatusChange}
              disabled={isSubmittingStatus}
              className={`gap-1.5 cursor-pointer text-white font-semibold ${
                targetStatus === "active"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {isSubmittingStatus ? (
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

      {/* Manual Plan Assignment (Enterprise Override) Dialog */}
      <Dialog open={isManualAssignOpen} onOpenChange={setIsManualAssignOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <UserCog className="size-5" />
              Super Admin Manual Plan Assignment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign or override a school&apos;s subscription plan directly (for Enterprise contracts, custom agreements, or administrative overrides). Every manual assignment is permanently recorded in <code className="font-mono">subscription_audit_logs</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* School Search & Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Select School <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Filter school name or code..."
                  value={schoolSearchInput}
                  onChange={(e) => setSchoolSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSearchSchoolsLookup()
                    }
                  }}
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoadingLookup}
                  onClick={handleSearchSchoolsLookup}
                  className="h-8 text-xs cursor-pointer shrink-0"
                >
                  {isLoadingLookup ? "..." : "Filter"}
                </Button>
              </div>

              <Select
                value={manualSchoolId}
                onValueChange={(val) => setManualSchoolId(String(val || ""))}
                items={schoolSelectLabels}
                itemToStringLabel={(val) => schoolSelectLabels[String(val)] || "Choose school..."}
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="Choose a school..." />
                </SelectTrigger>
                <SelectContent>
                  {schoolsList.map((s) => (
                    <SelectItem
                      key={s.id}
                      value={String(s.id)}
                      label={schoolSelectLabels[String(s.id)]}
                    >
                      {schoolSelectLabels[String(s.id)]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Plan Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Target Subscription Package <span className="text-destructive">*</span>
              </Label>
              <Select
                value={manualPlanId}
                onValueChange={(val) => {
                  const nextId = String(val || "")
                  setManualPlanId(nextId)
                  const found = activePlans.find((p) => String(p.id) === nextId)
                  if (found) {
                    setManualAmountPaid(String(Number(found.price || 0)))
                  }
                }}
                items={planSelectLabels}
                itemToStringLabel={(val) => planSelectLabels[String(val)] || "Choose active plan..."}
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="Choose active plan..." />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={String(p.id)}
                      label={planSelectLabels[String(p.id)]}
                    >
                      {planSelectLabels[String(p.id)]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount Paid & Optional Custom Expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Net Amount Recorded (₹ — Zero GST)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualAmountPaid}
                  onChange={(e) => setManualAmountPaid(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Custom Expiry Date <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  type="date"
                  value={manualCustomEndDate}
                  onChange={(e) => setManualCustomEndDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Mandatory Audit Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Mandatory Audit Trail Reason <span className="text-destructive">*</span>
              </Label>
              <textarea
                rows={2}
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                placeholder="e.g. Custom Enterprise MOU signed (#MOU-2026-14) or Complimentary Migration"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsManualAssignOpen(false)}
              disabled={isManualAssigning}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmManualAssign}
              disabled={isManualAssigning}
              className="gap-1.5 cursor-pointer font-semibold"
            >
              {isManualAssigning ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Assign & Activate Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
