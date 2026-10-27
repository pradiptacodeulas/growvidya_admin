import { useState, useRef, useEffect, useCallback } from "react"
import { useNavigate, useLocation } from "react-router"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
import { fetchSaasSupportTicketsApi } from "@/services/supportTicketService"
import type { SupportTicket } from "@/types/supportTicket"
import {
  getNotificationPermission,
  isWebPushSupported,
  subscribeSaasWebPush,
} from "@/services/webPushService"
import { toast } from "sonner"
import {
  Bell,
  BellRing,
  CheckCircle2,
  ExternalLink,
  Headphones,
  Loader2,
  RefreshCw,
} from "lucide-react"

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ""
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-600 border-red-500/20",
  high: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  medium: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  low: "bg-slate-500/10 text-slate-600 border-slate-500/20",
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  closed: "bg-slate-500/10 text-slate-600 border-slate-500/20",
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [openCount, setOpenCount] = useState(0)
  const [pushPerm, setPushPerm] = useState<string>(() => getNotificationPermission())
  const [enablingPush, setEnablingPush] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const token = useAppSelector((state) => state.auth.token)
  const { can } = usePermission()
  const canViewSupport = can("support_tickets", "can_view")

  const loadNotifications = useCallback(async () => {
    if (!token || !canViewSupport) return
    try {
      setLoading(true)
      const res = await fetchSaasSupportTicketsApi(token, { page: 1, limit: 8 })
      setTickets(res.tickets)
      setOpenCount(Number(res.counts.open_tickets || 0) + Number(res.counts.in_progress_tickets || 0))
    } catch {
      // Silently ignore background fetch errors in header
    } finally {
      setLoading(false)
    }
  }, [token, canViewSupport])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications, location.pathname])

  useEffect(() => {
    const handlePushUpdate = () => {
      loadNotifications()
    }
    window.addEventListener("growvidya:saas_support_ticket_push", handlePushUpdate)
    return () => window.removeEventListener("growvidya:saas_support_ticket_push", handlePushUpdate)
  }, [loadNotifications])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const handleToggleDropdown = () => {
    const next = !isOpen
    setIsOpen(next)
    setPushPerm(getNotificationPermission())
    if (next) {
      loadNotifications()
    }
  }

  const handleEnablePush = async () => {
    if (!token) return
    setEnablingPush(true)
    try {
      const res = await subscribeSaasWebPush(token, true)
      const currentPerm = getNotificationPermission()
      setPushPerm(currentPerm)
      if (res.success) {
        toast.success("Desktop push notifications enabled")
      } else if (res.reason === "permission_denied") {
        toast.error("Notification permission was blocked by the browser")
      }
    } finally {
      setEnablingPush(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggleDropdown}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/30 hover:bg-muted/70 text-foreground transition-colors cursor-pointer"
      >
        <Bell className="h-4 w-4" />
        {openCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white shadow-xs">
            {openCount > 99 ? "99+" : openCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/20">
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Support Notifications</span>
              {openCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {openCount} active
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={loadNotifications}
              disabled={loading}
              title="Refresh notifications"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Web Push Status Banner */}
          {isWebPushSupported() && pushPerm === "default" && (
            <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-primary/5 px-4 py-2">
              <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                <BellRing className="h-3.5 w-3.5 shrink-0" />
                <span>Enable desktop push alerts</span>
              </div>
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={enablingPush}
                className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
              >
                {enablingPush ? "Enabling..." : "Enable"}
              </button>
            </div>
          )}

          {isWebPushSupported() && pushPerm === "granted" && (
            <div className="flex items-center gap-1.5 border-b border-border/60 bg-emerald-500/5 px-4 py-1.5 text-[11px] text-emerald-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Desktop push alerts active</span>
            </div>
          )}

          {/* Ticket List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
            {!canViewSupport ? (
              <div className="py-8 px-4 text-center text-xs text-muted-foreground">
                You do not have permission to view support tickets.
              </div>
            ) : loading && tickets.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading support updates...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <Bell className="h-6 w-6 text-muted-foreground/50 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-muted-foreground">
                  No support tickets found
                </p>
              </div>
            ) : (
              tickets.map((ticket) => {
                const isWaitingOnSupport =
                  ticket.status !== "closed" && ticket.last_reply_by === "school"
                const pStyle = PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.medium
                const sStyle = STATUS_STYLES[ticket.status] || STATUS_STYLES.open

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      navigate(`/support-tickets/${ticket.id}`)
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors cursor-pointer flex flex-col gap-1 ${
                      isWaitingOnSupport ? "bg-primary/[0.03]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[11px] font-semibold text-primary shrink-0">
                          {ticket.ticket_number}
                        </span>
                        <span
                          className={`rounded border px-1.5 py-0 text-[10px] font-medium capitalize ${sStyle}`}
                        >
                          {ticket.status.replace("_", " ")}
                        </span>
                        <span
                          className={`rounded border px-1.5 py-0 text-[10px] font-medium capitalize ${pStyle}`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatRelativeTime(ticket.last_reply_at || ticket.created_at)}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-foreground truncate">
                      {ticket.subject}
                    </p>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{ticket.school_name || "School"}</span>
                      {isWaitingOnSupport && (
                        <span className="text-[10px] font-semibold text-amber-600 shrink-0">
                          Awaiting reply
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {canViewSupport && (
            <div className="border-t border-border/60 bg-muted/20 p-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  navigate("/support-tickets")
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <span>View All Support Tickets</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
