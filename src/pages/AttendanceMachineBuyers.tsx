import { useState, useEffect, useCallback } from "react"
import { useAppSelector } from "@/store/store"
import { getFullImageUrl } from "@/config/api"
import {
  fetchAttendanceMachineBuyersApi,
  updateAttendanceMachineBuyerOrderApi,
} from "@/services/attendanceMachineService"
import type {
  AttendanceMachineBuyerCounts,
  AttendanceMachineBuyerOrder,
  HardwareOrderStatus,
} from "@/types/attendanceMachine"
import {
  DEFAULT_PAGE_SIZE,
  EMPTY_PAGINATION,
  type PaginationMeta,
} from "@/types/pagination"
import { DataPagination } from "@/components/DataPagination"
import { usePermission } from "@/hooks/usePermission"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Cpu,
  Search,
  RefreshCw,
  IndianRupee,
  Clock,
  CheckCircle2,
  Eye,
  Settings2,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Layers,
  Loader2,
  X,
} from "lucide-react"

const INITIAL_COUNTS: AttendanceMachineBuyerCounts = {
  total_orders: 0,
  total_quantity: 0,
  total_revenue: 0,
  pending_count: 0,
  approved_count: 0,
  dispatched_count: 0,
  delivered_count: 0,
  cancelled_count: 0,
  active_devices: 0,
}

const ORDER_STATUS_OPTIONS: Array<{ value: HardwareOrderStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
]

function getOrderStatusBadge(status: string) {
  switch ((status || "").toLowerCase()) {
    case "delivered":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    case "dispatched":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30"
    case "approved":
      return "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
    case "cancelled":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
    default:
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
  }
}

function getBasePlanStatusBadge(status: string | null) {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/25"
    case "trial":
      return "bg-blue-500/10 text-blue-600 border-blue-500/25"
    case "pending":
      return "bg-amber-500/10 text-amber-600 border-amber-500/25"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

export default function AttendanceMachineBuyers() {
  const token = useAppSelector((state) => state.auth.token)
  const { can } = usePermission()
  const canManage = can("attendance_machines", ["can_manage", "can_edit"])

  const [buyers, setBuyers] = useState<AttendanceMachineBuyerOrder[]>([])
  const [counts, setCounts] = useState<AttendanceMachineBuyerCounts>(INITIAL_COUNTS)
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)

  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // View Details Modal
  const [selectedOrder, setSelectedOrder] = useState<AttendanceMachineBuyerOrder | null>(null)

  // Edit Order / Device Modal
  const [editingOrder, setEditingOrder] = useState<AttendanceMachineBuyerOrder | null>(null)
  const [editOrderStatus, setEditOrderStatus] = useState<HardwareOrderStatus>("pending")
  const [editDeviceStatus, setEditDeviceStatus] = useState<number>(0)
  const [editSerialNo, setEditSerialNo] = useState("")
  const [editLocation, setEditLocation] = useState("")
  const [editIpAddress, setEditIpAddress] = useState("")
  const [editPort, setEditPort] = useState("")
  const [editShippingAddress, setEditShippingAddress] = useState("")
  const [editRemarks, setEditRemarks] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const loadBuyers = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const result = await fetchAttendanceMachineBuyersApi(token, {
        search: debouncedSearch,
        status: statusFilter,
        page,
        limit,
      })
      setBuyers(result.buyers)
      setPagination(result.pagination)
      setCounts(result.counts)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load attendance machine buyers.")
    } finally {
      setIsLoading(false)
    }
  }, [token, debouncedSearch, statusFilter, page, limit])

  useEffect(() => {
    loadBuyers()
  }, [loadBuyers])

  const openEditModal = (order: AttendanceMachineBuyerOrder) => {
    setEditingOrder(order)
    setEditOrderStatus((order.order_status || "pending") as HardwareOrderStatus)
    setEditDeviceStatus(Number(order.status) === 1 ? 1 : 0)
    setEditSerialNo(order.device_serial_number || "")
    setEditLocation(order.device_location || "")
    setEditIpAddress(order.ip_address || "")
    setEditPort(order.port !== null && order.port !== undefined ? String(order.port) : "")
    setEditShippingAddress(order.shipping_address || "")
    setEditRemarks(order.remarks || "")
  }

  const handleSaveOrder = async () => {
    if (!token || !editingOrder) return
    setIsSaving(true)
    try {
      await updateAttendanceMachineBuyerOrderApi(token, editingOrder.id, {
        order_status: editOrderStatus,
        status: editDeviceStatus,
        device_serial_number: editSerialNo.trim(),
        device_location: editLocation.trim() || null,
        ip_address: editIpAddress.trim() || null,
        port: editPort.trim() ? Number(editPort.trim()) : null,
        shipping_address: editShippingAddress.trim() || null,
        remarks: editRemarks.trim() || null,
      })
      toast.success("Attendance machine order updated successfully.")
      setEditingOrder(null)
      loadBuyers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update order.")
    } finally {
      setIsSaving(false)
    }
  }

  const formatPrice = (price: number | string) => {
    const num = Number(price || 0)
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num)
  }

  const formatDate = (dateStr: string | null) => {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Cpu className="size-6 text-primary" />
            Attendance Machine Buyers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View all schools and users who purchased attendance machines, along with their base subscription plan and device status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBuyers}
            disabled={isLoading}
            className="gap-2 h-9 cursor-pointer"
          >
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-xs py-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Machine Orders</p>
              <p className="text-2xl font-bold mt-1">{counts.total_orders}</p>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Cpu className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs py-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {formatPrice(counts.total_revenue)}
              </p>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <IndianRupee className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs py-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pending Delivery / Setup</p>
              <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                {counts.pending_count}
              </p>
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs py-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Delivered / Active Devices</p>
              <p className="text-2xl font-bold mt-1 text-sky-600 dark:text-sky-400">
                {counts.delivered_count} / {counts.active_devices}
              </p>
            </div>
            <div className="size-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search Bar */}
      <Card className="border-border/60 shadow-xs py-0">
        <CardContent className="p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search school, user, email, phone, serial, or model..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="pl-9 pr-8 h-9 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("")
                  setPage(1)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
              {(["all", "pending", "approved", "dispatched", "delivered", "cancelled"] as const).map(
                (st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st)
                      setPage(1)
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-all cursor-pointer ${
                      statusFilter === st
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coupons-Style DataTable with Integrated Footer Pagination */}
      <Card className="border-border/70 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Order / Serial</TableHead>
                <TableHead className="font-semibold">Buyer (School & User)</TableHead>
                <TableHead className="font-semibold">Current Base Plan</TableHead>
                <TableHead className="font-semibold">Attendance Machine</TableHead>
                <TableHead className="font-semibold">Qty & Amount</TableHead>
                <TableHead className="font-semibold">Device & Location</TableHead>
                <TableHead className="font-semibold">Purchased On</TableHead>
                <TableHead className="font-semibold">Order Status</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-44" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : buyers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-56 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Cpu className="size-9 opacity-30" />
                      <p className="font-medium text-foreground">No attendance machine purchases found</p>
                      <p className="text-xs">
                        When schools purchase an attendance machine during or after their base plan, their details will appear here.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                buyers.map((order) => {
                  const imgUrl = getFullImageUrl(order.machine_image)
                  return (
                    <TableRow key={order.id} className="group">
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
                            {order.order_no || `MACH-${order.id}`}
                          </span>
                          <p className="text-[11px] font-mono text-muted-foreground">
                            SN: {order.device_serial_number}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5 max-w-[230px]">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-sm text-foreground truncate">
                              {order.school_name}
                            </p>
                            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                              {order.school_code}
                            </Badge>
                          </div>
                          {order.admin_name && (
                            <p className="text-xs text-foreground/85 flex items-center gap-1 truncate">
                              <User className="size-3 text-muted-foreground shrink-0" />
                              {order.admin_name}
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground truncate">
                            {order.admin_email || order.school_email || "—"}
                            {order.admin_phone ? ` • ${order.admin_phone}` : ""}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        {order.base_plan_name ? (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-foreground">
                              {order.base_plan_name}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-[10px] capitalize ${getBasePlanStatusBadge(
                                order.base_subscription_status
                              )}`}
                            >
                              {order.base_subscription_status || "Active"}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No Base Plan</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={order.machine_name}
                                className="size-full object-contain p-1"
                              />
                            ) : (
                              <Cpu className="size-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{order.machine_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {order.brand} • {order.model_number}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-bold text-sm text-foreground">
                            {formatPrice(order.total_amount)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Qty: {order.quantity} × {formatPrice(order.unit_price)}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5 max-w-[170px]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`size-2 rounded-full ${
                                Number(order.status) === 1 ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                            <span className="text-xs font-medium">
                              {Number(order.status) === 1 ? "Online" : "Offline"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {order.device_location || "Main Gate"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${getOrderStatusBadge(order.order_status)}`}
                        >
                          {order.order_status || "pending"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 cursor-pointer"
                            title="View Buyer & Order Details"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 cursor-pointer"
                              title="Update Order & Device Status"
                              onClick={() => openEditModal(order)}
                            >
                              <Settings2 className="size-4" />
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
        </div>

        <DataPagination
          pagination={{ ...pagination, page, limit }}
          itemLabel="machine orders"
          isLoading={isLoading}
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextLimit) => {
            setLimit(nextLimit)
            setPage(1)
          }}
        />
      </Card>

      {/* View Buyer & Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="size-5 text-primary" />
              Attendance Machine Purchase Details
            </DialogTitle>
            <DialogDescription>
              Order {selectedOrder?.order_no || `#${selectedOrder?.id}`} • Purchased on{" "}
              {formatDate(selectedOrder?.created_at || null)}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 text-sm">
              {/* Buyer School & User Info */}
              <div className="rounded-xl border p-3.5 bg-muted/20 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-primary" />
                  School & Buyer User Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-muted-foreground">School Name:</span>
                    <p className="font-semibold text-sm text-foreground">
                      {selectedOrder.school_name} ({selectedOrder.school_code})
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Admin User:</span>
                    <p className="font-semibold text-sm text-foreground">
                      {selectedOrder.admin_name || "School Administrator"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{selectedOrder.admin_email || selectedOrder.school_email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-3.5 text-muted-foreground shrink-0" />
                    <span>{selectedOrder.admin_phone || selectedOrder.school_phone || "—"}</span>
                  </div>
                </div>
                {selectedOrder.shipping_address && (
                  <div className="pt-1 border-t border-border/60 flex items-start gap-1.5 text-xs">
                    <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{selectedOrder.shipping_address}</span>
                  </div>
                )}
              </div>

              {/* Current Base Subscription Plan */}
              <div className="rounded-xl border p-3.5 bg-muted/20 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-primary" />
                    Current Default / Base Plan
                  </p>
                  <p className="font-semibold text-sm">
                    {selectedOrder.base_plan_name || "No Active Base Plan"}
                  </p>
                  {selectedOrder.base_end_date && (
                    <p className="text-xs text-muted-foreground">
                      Valid till {formatDate(selectedOrder.base_end_date)}
                    </p>
                  )}
                </div>
                {selectedOrder.base_subscription_status && (
                  <Badge
                    variant="outline"
                    className={`capitalize ${getBasePlanStatusBadge(selectedOrder.base_subscription_status)}`}
                  >
                    {selectedOrder.base_subscription_status}
                  </Badge>
                )}
              </div>

              {/* Machine & Payment Details */}
              <div className="rounded-xl border p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{selectedOrder.machine_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {selectedOrder.brand} • Model: {selectedOrder.model_number} ({selectedOrder.machine_type})
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`capitalize ${getOrderStatusBadge(selectedOrder.order_status)}`}
                  >
                    {selectedOrder.order_status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t text-xs">
                  <div>
                    <span className="text-muted-foreground">Quantity:</span>
                    <p className="font-semibold">{selectedOrder.quantity}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Unit Price:</span>
                    <p className="font-semibold">{formatPrice(selectedOrder.unit_price)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Paid:</span>
                    <p className="font-bold text-emerald-600">{formatPrice(selectedOrder.total_amount)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Serial Number:</span>
                    <p className="font-mono font-medium">{selectedOrder.device_serial_number}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">IP / Port:</span>
                    <p className="font-mono">
                      {selectedOrder.ip_address
                        ? `${selectedOrder.ip_address}${selectedOrder.port ? `:${selectedOrder.port}` : ""}`
                        : "Not configured"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment Ref:</span>
                    <p className="font-mono truncate">{selectedOrder.payment_transaction_id || "—"}</p>
                  </div>
                </div>

                {selectedOrder.remarks && (
                  <div className="pt-2 border-t text-xs">
                    <span className="text-muted-foreground">Remarks: </span>
                    <span>{selectedOrder.remarks}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {canManage && selectedOrder && (
              <Button
                variant="outline"
                onClick={() => {
                  const order = selectedOrder
                  setSelectedOrder(null)
                  openEditModal(order)
                }}
                className="cursor-pointer"
              >
                Update Order / Device
              </Button>
            )}
            <Button onClick={() => setSelectedOrder(null)} className="cursor-pointer">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Order & Device Modal */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Machine Order & Device</DialogTitle>
            <DialogDescription>
              {editingOrder?.school_name} — {editingOrder?.machine_name} ({editingOrder?.order_no})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Order Delivery Status</Label>
                <select
                  value={editOrderStatus}
                  onChange={(e) => setEditOrderStatus(e.target.value as HardwareOrderStatus)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ORDER_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Device Connection Status</Label>
                <select
                  value={editDeviceStatus}
                  onChange={(e) => setEditDeviceStatus(Number(e.target.value))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value={1}>Online / Active</option>
                  <option value={0}>Offline / Inactive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Device Serial Number</Label>
                <Input
                  value={editSerialNo}
                  onChange={(e) => setEditSerialNo(e.target.value)}
                  placeholder="e.g. DEV_2026_001"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Installation Location</Label>
                <Input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. Main School Gate"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Device IP Address</Label>
                <Input
                  value={editIpAddress}
                  onChange={(e) => setEditIpAddress(e.target.value)}
                  placeholder="e.g. 192.168.1.201"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={editPort}
                  onChange={(e) => setEditPort(e.target.value)}
                  placeholder="e.g. 4370"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Shipping / Campus Address</Label>
              <Input
                value={editShippingAddress}
                onChange={(e) => setEditShippingAddress(e.target.value)}
                placeholder="Delivery address"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Remarks / Tracking Notes</Label>
              <Input
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                placeholder="Courier tracking or setup notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingOrder(null)}
              disabled={isSaving}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveOrder} disabled={isSaving} className="gap-2 cursor-pointer">
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
