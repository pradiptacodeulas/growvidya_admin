import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import {
  fetchSaasSupportTicketsApi,
  fetchAssignableSaasAdminsApi,
  updateSaasSupportTicketApi,
} from "@/services/supportTicketService"
import type {
  AssignableSaasAdmin,
  SupportTicket,
  SupportTicketCounts,
} from "@/types/supportTicket"
import {
  DEFAULT_PAGE_SIZE,
  EMPTY_PAGINATION,
  type PaginationMeta,
} from "@/types/pagination"
import { DataPagination } from "@/components/DataPagination"
import { getFullImageUrl } from "@/config/api"
import { usePermission } from "@/hooks/usePermission"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Headset,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Flame,
  MessageSquare,
  Building2,
  UserCheck,
  X,
} from "lucide-react"

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Technical Issue",
  billing: "Billing & Payments",
  subscription: "Subscription & Plan",
  hardware_rfid: "Hardware / RFID",
  feature_request: "Feature Request",
  other: "Other Inquiry",
}

export default function SupportTickets() {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token) || ""
  const { can } = usePermission()
  const canEdit = can("support_tickets", ["can_edit", "can_manage"])

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [assignees, setAssignees] = useState<AssignableSaasAdmin[]>([])
  const [counts, setCounts] = useState<SupportTicketCounts>({
    total_tickets: 0,
    open_tickets: 0,
    in_progress_tickets: 0,
    urgent_high_open_tickets: 0,
    resolved_tickets: 0,
    closed_tickets: 0,
  })
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  // Filters & Pagination
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [assignedFilter, setAssignedFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState<number>(DEFAULT_PAGE_SIZE)
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!token) return
    fetchAssignableSaasAdminsApi(token)
      .then((list) => setAssignees(list))
      .catch(() => {})
  }, [token])

  const loadTickets = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const res = await fetchSaasSupportTicketsApi(token, {
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        assigned_to: assignedFilter !== "all" ? assignedFilter : undefined,
      })

      setTickets(res.tickets)
      setCounts(res.counts)
      setPagination(res.pagination)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load support tickets")
    } finally {
      setLoading(false)
    }
  }, [
    token,
    page,
    limit,
    debouncedSearch,
    statusFilter,
    priorityFilter,
    categoryFilter,
    assignedFilter,
  ])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  useEffect(() => {
    const handleTicketPush = () => {
      loadTickets()
    }
    window.addEventListener("growvidya:saas_support_ticket_push", handleTicketPush)
    return () => window.removeEventListener("growvidya:saas_support_ticket_push", handleTicketPush)
  }, [loadTickets])

  const handleQuickStatusChange = async (ticketId: number, newStatus: string) => {
    if (!token || !canEdit) return
    try {
      setUpdatingId(ticketId)
      await updateSaasSupportTicketApi(token, ticketId, { status: newStatus })
      toast.success(`Ticket status updated to ${newStatus.replace("_", " ")}`)
      loadTickets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update ticket status")
    } finally {
      setUpdatingId(null)
    }
  }

  const clearFilters = () => {
    setSearch("")
    setDebouncedSearch("")
    setStatusFilter("all")
    setPriorityFilter("all")
    setCategoryFilter("all")
    setAssignedFilter("all")
    setPage(1)
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    categoryFilter !== "all" ||
    assignedFilter !== "all"

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return (
          <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/20">
            Urgent
          </Badge>
        )
      case "high":
        return (
          <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 hover:bg-orange-500/20">
            High
          </Badge>
        )
      case "medium":
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20">
            Medium
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Low
          </Badge>
        )
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">
            Open
          </Badge>
        )
      case "in_progress":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
            In Progress
          </Badge>
        )
      case "resolved":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            Resolved
          </Badge>
        )
      case "closed":
        return (
          <Badge variant="secondary" className="text-muted-foreground">
            Closed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return "—"
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Headset className="size-6 text-primary" />
            Help &amp; Support Tickets
          </h1>
          
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTickets}
            disabled={loading}
            className="gap-2 cursor-pointer"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Tickets</p>
              <p className="text-2xl font-bold mt-1">{counts.total_tickets}</p>
            </div>
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Headset className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Open (Needs Reply)</p>
              <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                {counts.open_tickets}
              </p>
            </div>
            <div className="size-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <AlertCircle className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                {counts.in_progress_tickets}
              </p>
            </div>
            <div className="size-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">High / Urgent Open</p>
              <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
                {counts.urgent_high_open_tickets}
              </p>
            </div>
            <div className="size-10 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Flame className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Resolved / Closed</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {counts.resolved_tickets + counts.closed_tickets}
              </p>
            </div>
            <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table Card */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-base">School Support Tickets</CardTitle>
              <CardDescription>
                Click on any ticket to view the conversation thread, attachments, and reply.
              </CardDescription>
            </div>

            {/* Filters Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search ticket #, subject, school..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val || "all")
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={priorityFilter}
                onValueChange={(val) => {
                  setPriorityFilter(val || "all")
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={categoryFilter}
                onValueChange={(val) => {
                  setCategoryFilter(val || "all")
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[160px] h-9 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="technical">Technical Issue</SelectItem>
                  <SelectItem value="billing">Billing &amp; Payments</SelectItem>
                  <SelectItem value="subscription">Subscription &amp; Plan</SelectItem>
                  <SelectItem value="hardware_rfid">Hardware / RFID</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                  <SelectItem value="other">Other Inquiry</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={assignedFilter}
                onValueChange={(val) => {
                  setAssignedFilter(val || "all")
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[160px] h-9 text-xs">
                  <SelectValue placeholder="All Assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assignees.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.full_name || a.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 px-2.5 text-xs gap-1 cursor-pointer"
                >
                  <X className="size-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[260px]">Ticket Details</TableHead>
                  <TableHead className="w-[240px]">School &amp; Plan</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="size-6 animate-spin text-primary" />
                        <span className="text-sm">Loading support tickets...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : tickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Headset className="size-8 opacity-40" />
                        <p className="text-sm font-medium text-foreground">
                          No support tickets found
                        </p>
                        <p className="text-xs">
                          {hasActiveFilters
                            ? "Try adjusting your search or filter criteria."
                            : "Tickets raised by schools from their admin panel will appear here."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((t) => {
                    const logoUrl = t.school_logo ? getFullImageUrl(t.school_logo) : null
                    return (
                      <TableRow
                        key={t.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate(`/support-tickets/${t.id}`)}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {t.ticket_number}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MessageSquare className="size-3" />
                                {Number(t.message_count || 1)}
                              </span>
                            </div>
                            <p
                              className="font-medium text-sm text-foreground line-clamp-1"
                              title={t.subject}
                            >
                              {t.subject}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Created: {formatDateTime(t.created_at)}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-start gap-2.5">
                            {logoUrl ? (
                              <img
                                src={logoUrl}
                                alt={t.school_name}
                                className="size-8 rounded-md object-cover border shrink-0 mt-0.5"
                              />
                            ) : (
                              <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                <Building2 className="size-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate" title={t.school_name}>
                                {t.school_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {t.created_by_email || t.school_email || t.school_phone || "—"}
                              </p>
                              {t.plan_name && (
                                <Badge variant="outline" className="mt-1 text-[10px] py-0 h-4">
                                  {t.plan_name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">
                            {CATEGORY_LABELS[t.category] || t.category}
                          </Badge>
                        </TableCell>

                        <TableCell>{renderPriorityBadge(t.priority)}</TableCell>

                        <TableCell>
                          {t.assigned_admin_name ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <UserCheck className="size-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate max-w-[130px]">
                                {t.assigned_admin_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Unassigned
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-xs text-foreground">
                              {formatDateTime(t.last_reply_at || t.updated_at)}
                            </p>
                            {t.last_reply_by === "school" ? (
                              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] py-0 h-4">
                                School Replied
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] py-0 h-4">
                                Support Replied
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {canEdit ? (
                            <Select
                              value={t.status}
                              disabled={updatingId === t.id}
                              onValueChange={(val) => {
                                if (val && val !== t.status) {
                                  handleQuickStatusChange(t.id, val)
                                }
                              }}
                            >
                              <SelectTrigger className="h-7 w-[125px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            renderStatusBadge(t.status)
                          )}
                        </TableCell>

                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 cursor-pointer"
                            onClick={() => navigate(`/support-tickets/${t.id}`)}
                          >
                            <MessageSquare className="size-3.5" />
                            View / Reply
                          </Button>
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
            itemLabel="support tickets"
            isLoading={loading}
            onPageChange={(nextPage) => setPage(nextPage)}
            onPageSizeChange={(newLimit) => {
              setLimit(newLimit)
              setPage(1)
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
