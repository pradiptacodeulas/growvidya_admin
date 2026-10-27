import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useNavigate, Link } from "react-router"
import { useAppSelector } from "@/store/store"
import {
  fetchSaasSupportTicketByIdApi,
  replyToSaasSupportTicketApi,
  updateSaasSupportTicketApi,
  fetchAssignableSaasAdminsApi,
} from "@/services/supportTicketService"
import type { AssignableSaasAdmin, SupportTicket } from "@/types/supportTicket"
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
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Send,
  Paperclip,
  ExternalLink,
  Building2,
  Mail,
  Phone,
  User,
  Lock,
  MessageSquare,
  ShieldAlert,
  CreditCard,
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

export default function SupportTicketDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token) || ""
  const { can } = usePermission()
  const canReplyOrManage = can("support_tickets", ["can_edit", "can_manage", "can_add"])

  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [assignees, setAssignees] = useState<AssignableSaasAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingMeta, setUpdatingMeta] = useState(false)

  // Reply form state
  const [replyMessage, setReplyMessage] = useState("")
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [nextStatusOnSend, setNextStatusOnSend] = useState<string>("auto")
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [sendingReply, setSendingReply] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const threadEndRef = useRef<HTMLDivElement | null>(null)

  const loadTicket = useCallback(async () => {
    if (!token || !id) return
    try {
      setLoading(true)
      const data = await fetchSaasSupportTicketByIdApi(token, id)
      setTicket(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load ticket details")
    } finally {
      setLoading(false)
    }
  }, [token, id])

  useEffect(() => {
    loadTicket()
  }, [loadTicket])

  useEffect(() => {
    const handleTicketPush = (e: Event) => {
      const customEvent = e as CustomEvent
      const pushedTicketId = customEvent.detail?.data?.ticketId
      if (!pushedTicketId || String(pushedTicketId) === String(id)) {
        loadTicket()
      }
    }
    window.addEventListener("growvidya:saas_support_ticket_push", handleTicketPush)
    return () => window.removeEventListener("growvidya:saas_support_ticket_push", handleTicketPush)
  }, [loadTicket, id])

  useEffect(() => {
    if (!token) return
    fetchAssignableSaasAdminsApi(token)
      .then((list) => setAssignees(list))
      .catch(() => {})
  }, [token])

  const handleMetaUpdate = async (payload: {
    status?: string
    priority?: string
    assigned_to_saas_admin_id?: number | string | null
  }) => {
    if (!token || !id || !canReplyOrManage) return
    try {
      setUpdatingMeta(true)
      const updated = await updateSaasSupportTicketApi(token, id, payload)
      setTicket(updated)
      toast.success("Ticket updated successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update ticket")
    } finally {
      setUpdatingMeta(false)
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !id) return
    if (!replyMessage.trim() && !attachmentFile) {
      toast.warning("Please enter a reply message or attach a file")
      return
    }

    try {
      setSendingReply(true)
      const formData = new FormData()
      if (replyMessage.trim()) {
        formData.append("message", replyMessage.trim())
      }
      formData.append("is_internal_note", String(isInternalNote))
      if (nextStatusOnSend && nextStatusOnSend !== "auto") {
        formData.append("next_status", nextStatusOnSend)
      }
      if (attachmentFile) {
        formData.append("attachment", attachmentFile)
      }

      const updated = await replyToSaasSupportTicketApi(token, id, formData)
      setTicket(updated)
      setReplyMessage("")
      setAttachmentFile(null)
      setNextStatusOnSend("auto")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      toast.success(
        isInternalNote ? "Internal note added" : "Support reply sent to school"
      )
      setTimeout(() => {
        threadEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply")
    } finally {
      setSendingReply(false)
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

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return (
          <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30">
            Urgent Priority
          </Badge>
        )
      case "high":
        return (
          <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30">
            High Priority
          </Badge>
        )
      case "medium":
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">
            Medium Priority
          </Badge>
        )
      default:
        return <Badge variant="outline">Low Priority</Badge>
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="size-7 animate-spin text-primary" />
          <span className="text-sm">Loading ticket conversation...</span>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <p className="text-base font-semibold">Support Ticket Not Found</p>
            <Button variant="outline" onClick={() => navigate("/support-tickets")}>
              Back to Support Tickets
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const messages = Array.isArray(ticket.messages) ? ticket.messages : []
  const schoolLogoUrl = ticket.school_logo ? getFullImageUrl(ticket.school_logo) : null

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 cursor-pointer"
              onClick={() => navigate("/support-tickets")}
            >
              <ArrowLeft className="size-3.5" />
              Back
            </Button>
            <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded">
              {ticket.ticket_number}
            </span>
            {renderStatusBadge(ticket.status)}
            {renderPriorityBadge(ticket.priority)}
            <Badge variant="outline" className="text-xs">
              {CATEGORY_LABELS[ticket.category] || ticket.category}
            </Badge>
          </div>
          <h1 className="text-xl font-bold tracking-tight pt-1">{ticket.subject}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTicket}
            disabled={loading}
            className="gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Conversation Thread + Reply Composer */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="size-4 text-primary" />
                  Conversation Thread ({messages.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Started on {formatDateTime(ticket.created_at)}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 max-h-[560px] overflow-y-auto bg-muted/20">
              {messages.map((msg) => {
                const isSupport = msg.sender_type === "saas_admin"
                const isInternal = Boolean(msg.is_internal_note)
                const attachmentHref = msg.attachment_url
                  ? getFullImageUrl(msg.attachment_url)
                  : null

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isSupport ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] min-w-[260px] rounded-xl p-4 border shadow-2xs space-y-2 ${
                        isInternal
                          ? "bg-amber-500/10 border-amber-500/40"
                          : isSupport
                          ? "bg-primary/10 border-primary/30"
                          : "bg-card border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {msg.sender_name}
                          </span>
                          {isInternal ? (
                            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] py-0 h-4 gap-1">
                              <Lock className="size-2.5" />
                              Internal Note
                            </Badge>
                          ) : isSupport ? (
                            <Badge className="bg-primary text-primary-foreground text-[10px] py-0 h-4">
                              Growvidya Support
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] py-0 h-4">
                              School Admin
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDateTime(msg.created_at)}
                        </span>
                      </div>

                      <div className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                        {msg.message}
                      </div>

                      {attachmentHref && (
                        <div className="pt-2 border-t border-border/50">
                          <a
                            href={attachmentHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline bg-background/80 px-2.5 py-1.5 rounded-md border"
                          >
                            <Paperclip className="size-3.5" />
                            <span>{msg.attachment_name || "View Attachment"}</span>
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={threadEndRef} />
            </CardContent>

            {/* Reply Composer */}
            {canReplyOrManage && (
              <div className="p-4 border-t bg-card">
                <form onSubmit={handleSendReply} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-xs font-semibold flex items-center gap-2">
                      {isInternalNote ? (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <ShieldAlert className="size-4" />
                          Writing Internal Team Note (Hidden from School)
                        </span>
                      ) : (
                        <span>Reply to School Admin</span>
                      )}
                    </Label>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={isInternalNote ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs gap-1.5 cursor-pointer"
                        onClick={() => setIsInternalNote((prev) => !prev)}
                      >
                        <Lock className="size-3" />
                        {isInternalNote ? "Internal Note Mode" : "Switch to Internal Note"}
                      </Button>
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    placeholder={
                      isInternalNote
                        ? "Add an internal note visible only to SaaS admins..."
                        : "Type your support response to the school..."
                    }
                    value={replyMessage}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setReplyMessage(e.target.value)
                    }
                    className={`flex min-h-[96px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                      isInternalNote
                        ? "border-amber-500/50 bg-amber-500/5 focus-visible:ring-amber-500/30"
                        : "border-input"
                    }`}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
                        onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                        className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-border file:text-xs file:font-medium file:bg-muted/50 hover:file:bg-muted cursor-pointer max-w-[240px]"
                      />
                      {attachmentFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive"
                          onClick={() => {
                            setAttachmentFile(null)
                            if (fileInputRef.current) fileInputRef.current.value = ""
                          }}
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={nextStatusOnSend}
                        onValueChange={(val) => setNextStatusOnSend(val || "auto")}
                      >
                        <SelectTrigger className="h-9 w-[180px] text-xs">
                          <SelectValue placeholder="Status on send" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto (In Progress)</SelectItem>
                          <SelectItem value="in_progress">Mark In Progress</SelectItem>
                          <SelectItem value="resolved">Mark Resolved</SelectItem>
                          <SelectItem value="closed">Mark Closed</SelectItem>
                          <SelectItem value="open">Keep Open</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        type="submit"
                        disabled={sendingReply}
                        className="gap-1.5 cursor-pointer"
                      >
                        {sendingReply ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="size-4" />
                            {isInternalNote ? "Save Note" : "Send Reply"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Ticket Controls & School Context */}
        <div className="space-y-6">
          {/* Ticket Management Controls */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Ticket Management</CardTitle>
              <CardDescription className="text-xs">
                Update status, priority, or assign a support team member.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Ticket Status</Label>
                <Select
                  value={ticket.status}
                  disabled={!canReplyOrManage || updatingMeta}
                  onValueChange={(val) => {
                    if (val && val !== ticket.status) {
                      handleMetaUpdate({ status: val })
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Priority Level</Label>
                <Select
                  value={ticket.priority}
                  disabled={!canReplyOrManage || updatingMeta}
                  onValueChange={(val) => {
                    if (val && val !== ticket.priority) {
                      handleMetaUpdate({ priority: val })
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Assigned Support Agent</Label>
                <Select
                  value={
                    ticket.assigned_to_saas_admin_id
                      ? String(ticket.assigned_to_saas_admin_id)
                      : "unassigned"
                  }
                  disabled={!canReplyOrManage || updatingMeta}
                  onValueChange={(val) => {
                    handleMetaUpdate({
                      assigned_to_saas_admin_id: val === "unassigned" ? null : Number(val),
                    })
                  }}
                >
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {assignees.map((admin) => (
                      <SelectItem key={admin.id} value={String(admin.id)}>
                        {admin.full_name || admin.email} ({admin.role_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 border-t text-xs space-y-1.5 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="text-foreground font-medium">
                    {formatDateTime(ticket.created_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last Activity:</span>
                  <span className="text-foreground font-medium">
                    {formatDateTime(ticket.last_reply_at || ticket.updated_at)}
                  </span>
                </div>
                {ticket.resolved_at && (
                  <div className="flex justify-between">
                    <span>Resolved At:</span>
                    <span className="text-emerald-600 font-medium">
                      {formatDateTime(ticket.resolved_at)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* School & Subscription Context Card */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                School Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                {schoolLogoUrl ? (
                  <img
                    src={schoolLogoUrl}
                    alt={ticket.school_name}
                    className="size-11 rounded-lg object-cover border shrink-0"
                  />
                ) : (
                  <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 className="size-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{ticket.school_name}</p>
                  {ticket.school_code && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Code: {ticket.school_code}
                    </p>
                  )}
                  {ticket.branch_name && (
                    <Badge variant="outline" className="text-[10px] mt-1">
                      Branch: {ticket.branch_name}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-xs border-t pt-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="size-3.5 shrink-0" />
                  <span>Raised by:</span>
                  <span className="text-foreground font-medium truncate">
                    {ticket.created_by_name || "School Admin"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="text-foreground truncate">
                    {ticket.created_by_email || ticket.school_email || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-3.5 shrink-0" />
                  <span className="text-foreground">
                    {ticket.created_by_phone || ticket.school_phone || "—"}
                  </span>
                </div>
              </div>

              {/* Active Subscription Summary */}
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <CreditCard className="size-3.5 text-primary" />
                  Current Subscription
                </p>
                {ticket.plan_name ? (
                  <div className="rounded-lg border p-2.5 bg-muted/30 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{ticket.plan_name}</span>
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {ticket.subscription_status || "Active"}
                      </Badge>
                    </div>
                    {ticket.subscription_end_date && (
                      <p className="text-muted-foreground text-[11px]">
                        Valid until: {formatDateTime(ticket.subscription_end_date)}
                      </p>
                    )}
                    {ticket.subscription_id && (
                      <div className="pt-1">
                        <Link
                          to={`/subscriptions/${ticket.subscription_id}`}
                          className="text-primary hover:underline font-medium inline-flex items-center gap-1 text-[11px]"
                        >
                          View Subscription Details
                          <ExternalLink className="size-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No active subscription record found.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
