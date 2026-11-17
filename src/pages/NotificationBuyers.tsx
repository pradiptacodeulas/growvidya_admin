import { useState, useEffect, useCallback } from "react"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
import {
  fetchNotificationBuyersApi,
  fetchNotificationBuyerLedgerApi,
  approveNotificationOrderApi,
  rejectNotificationOrderApi,
} from "@/services/settingsService"
import type {
  NotificationBuyerWallet,
  NotificationBuyerCounts,
  NotificationLedgerEntry,
  PendingNotificationOrder,
} from "@/types/settings"
import {
  DEFAULT_PAGE_SIZE,
  EMPTY_PAGINATION,
  type PaginationMeta,
} from "@/types/pagination"
import { DataPagination } from "@/components/DataPagination"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Bell,
  Search,
  RefreshCw,
  IndianRupee,
  Building2,
  Eye,
  MessageSquare,
  X,
} from "lucide-react"

const INITIAL_COUNTS: NotificationBuyerCounts = {
  total_schools: 0,
  total_sms_balance: 0,
  total_push_balance: 0,
  total_sms_purchased: 0,
  total_push_purchased: 0,
  total_sms_used: 0,
  total_push_used: 0,
  total_revenue: 0,
}

export default function NotificationBuyers() {
  const token = useAppSelector((state) => state.auth.token)
  const { can } = usePermission()
  const canManage =
    can("subscriptions", ["can_manage", "can_edit"]) ||
    can("packages", ["can_manage", "can_edit"]) ||
    can("email_delivery", ["can_manage", "can_edit"])

  const [buyers, setBuyers] = useState<NotificationBuyerWallet[]>([])
  const [pendingOrders, setPendingOrders] = useState<PendingNotificationOrder[]>([])
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null)
  const [counts, setCounts] = useState<NotificationBuyerCounts>(INITIAL_COUNTS)
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)

  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  const [selectedBuyer, setSelectedBuyer] = useState<NotificationBuyerWallet | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<NotificationLedgerEntry[]>([])
  const [isLoadingLedger, setIsLoadingLedger] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const loadBuyers = useCallback(async () => {
    if (!token) return
    try {
      setIsLoading(true)
      const data = await fetchNotificationBuyersApi(token, {
        search: debouncedSearch || undefined,
        page,
        limit,
      })
      setBuyers(data.buyers || [])
      setPendingOrders(data.pending_orders || [])
      if (data.counts) setCounts(data.counts)
      if (data.pagination) setPagination(data.pagination)
    } catch (err: any) {
      toast.error(err.message || "Failed to load notification credit buyers.")
    } finally {
      setIsLoading(false)
    }
  }, [token, debouncedSearch, page, limit])

  useEffect(() => {
    loadBuyers()
  }, [loadBuyers])

  const handleOpenLedger = async (buyer: NotificationBuyerWallet) => {
    if (!token) return
    setSelectedBuyer(buyer)
    setLedgerEntries([])
    setIsLoadingLedger(true)
    try {
      const rows = await fetchNotificationBuyerLedgerApi(token, buyer.school_id)
      setLedgerEntries(Array.isArray(rows) ? rows : [])
    } catch (err: any) {
      toast.error(err.message || "Failed to load notification ledger.")
    } finally {
      setIsLoadingLedger(false)
    }
  }

  const handleApproveOrder = async (orderId: number) => {
    if (!token) return
    try {
      setProcessingOrderId(orderId)
      await approveNotificationOrderApi(token, orderId)
      toast.success("Offline notification credit order approved and credited to school wallet.")
      loadBuyers()
    } catch (err: any) {
      toast.error(err.message || "Failed to approve order.")
    } finally {
      setProcessingOrderId(null)
    }
  }

  const handleRejectOrder = async (orderId: number) => {
    if (!token) return
    const reason = window.prompt("Enter rejection reason for the school:", "Bank transfer receipt could not be verified.")
    if (!reason || !reason.trim()) return
    try {
      setProcessingOrderId(orderId)
      await rejectNotificationOrderApi(token, orderId, reason.trim())
      toast.success("Offline notification credit order rejected.")
      loadBuyers()
    } catch (err: any) {
      toast.error(err.message || "Failed to reject order.")
    } finally {
      setProcessingOrderId(null)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—"
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Notification Credit Buyers
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Schools with notification credit wallets and purchase history.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadBuyers}
          disabled={isLoading}
          className="gap-2 h-9 text-xs font-semibold cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Schools</p>
              <p className="text-2xl font-bold mt-1">{counts.total_schools}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
              <p className="text-2xl font-bold mt-1">
                ₹{Number(counts.total_revenue || 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">SMS Credits (Bal / Purchased)</p>
              <p className="text-lg font-bold mt-1">
                {counts.total_sms_balance.toLocaleString("en-IN")} /{" "}
                <span className="text-muted-foreground text-sm">
                  {counts.total_sms_purchased.toLocaleString("en-IN")}
                </span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <MessageSquare className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Push Credits (Bal / Purchased)</p>
              <p className="text-lg font-bold mt-1">
                {counts.total_push_balance.toLocaleString("en-IN")} /{" "}
                <span className="text-muted-foreground text-sm">
                  {counts.total_push_purchased.toLocaleString("en-IN")}
                </span>
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Bell className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by school name, email, phone..."
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
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Pending Offline Bank Transfer Orders */}
      {pendingOrders.length > 0 && (
        <Card className="border border-amber-500/40 bg-amber-500/5 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-500/20 flex items-center justify-between">
            <div className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Badge className="bg-amber-500 text-white text-[10px]">
                {pendingOrders.length} Pending
              </Badge>
              <span>Offline Bank Transfer Notification Credit Orders</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-semibold">Order</TableHead>
                  <TableHead className="text-xs font-semibold">School</TableHead>
                  <TableHead className="text-xs font-semibold">Push Credits</TableHead>
                  <TableHead className="text-xs font-semibold">SMS Credits</TableHead>
                  <TableHead className="text-xs font-semibold">Amount</TableHead>
                  <TableHead className="text-xs font-semibold">UTR / Ref</TableHead>
                  <TableHead className="text-xs font-semibold">Submitted</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrders.map((ord) => (
                  <TableRow key={ord.id}>
                    <TableCell className="font-mono text-xs font-semibold">#{ord.id}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs">{ord.school_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {ord.school_email || ord.school_phone || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {Number(ord.push_units ?? ord.push_qty ?? 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {Number(ord.sms_units ?? ord.sms_qty ?? 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      ₹{Number(ord.grand_total ?? ord.notifications_amount ?? ord.total_amount ?? 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div>{ord.utr_number || ord.offline_transaction_ref || "—"}</div>
                      {ord.company_bank_name && (
                        <div className="font-sans text-[11px] text-muted-foreground">
                          {ord.company_bank_name}
                          {ord.company_account_number ? ` (…${ord.company_account_number.slice(-4)})` : ""}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(ord.created_at)}
                    </TableCell>
                    <TableCell className="text-right space-x-1.5">
                      {canManage ? (
                        <>
                          <Button
                            size="sm"
                            disabled={processingOrderId === ord.id}
                            onClick={() => handleApproveOrder(ord.id)}
                            className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={processingOrderId === ord.id}
                            onClick={() => handleRejectOrder(ord.id)}
                            className="h-7 px-2.5 text-xs text-destructive border-destructive/40 cursor-pointer"
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">View Only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs font-semibold">School</TableHead>
                <TableHead className="text-xs font-semibold">SMS Balance</TableHead>
                <TableHead className="text-xs font-semibold">SMS Purchased / Used</TableHead>
                <TableHead className="text-xs font-semibold">Push Balance</TableHead>
                <TableHead className="text-xs font-semibold">Push Purchased / Used</TableHead>
                <TableHead className="text-xs font-semibold">Total Spent</TableHead>
                <TableHead className="text-xs font-semibold">Updated</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    {Array.from({ length: 8 }).map((__, cIdx) => (
                      <TableCell key={cIdx}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : buyers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-xs text-muted-foreground">
                    No notification credit buyers found.
                  </TableCell>
                </TableRow>
              ) : (
                buyers.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">{b.school_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {b.school_email || b.school_phone || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      {Number(b.sms_balance || 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {Number(b.total_sms_purchased || 0).toLocaleString("en-IN")} /{" "}
                      {Number(b.total_sms_used || 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      {Number(b.push_balance || 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {Number(b.total_push_purchased || 0).toLocaleString("en-IN")} /{" "}
                      {Number(b.total_push_used || 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      ₹{Number(b.total_amount_spent || 0).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(b.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenLedger(b)}
                        className="h-7 px-2.5 text-xs gap-1 cursor-pointer"
                      >
                        <Eye className="size-3.5" />
                        Ledger
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DataPagination
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={(newLimit: number) => {
            setLimit(newLimit)
            setPage(1)
          }}
        />
      </Card>

      {/* Ledger Modal */}
      <Dialog open={Boolean(selectedBuyer)} onOpenChange={(o) => !o && setSelectedBuyer(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Notification Credit Ledger — {selectedBuyer?.school_name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Recent credit purchases and usage history from the database.
            </DialogDescription>
          </DialogHeader>

          {isLoadingLedger ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : ledgerEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No ledger transactions found for this school.
            </p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Channel</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Units</TableHead>
                    <TableHead className="text-xs">Balance After</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="uppercase font-mono text-xs font-semibold">
                        {entry.channel}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={entry.entry_type === "credit" ? "default" : "secondary"}
                          className="text-[10px] uppercase"
                        >
                          {entry.entry_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.entry_type === "credit" ? "+" : "-"}
                        {Number(entry.units).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {Number(entry.balance_after).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        ₹{Number(entry.total_amount || 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(entry.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
