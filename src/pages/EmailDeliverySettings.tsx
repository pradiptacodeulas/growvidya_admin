import { useState, useEffect } from "react"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
import {
  fetchEmailCredentialsApi,
  saveEmailCredentialsApi,
  updateEmailCredentialsApi,
  setDefaultEmailProviderApi,
  toggleEmailCredentialStatusApi,
  deleteEmailCredentialsApi,
  sendTestEmailApi,
  fetchCommunicationSettingsApi,
  updateCommunicationSettingsApi,
  fetchNotificationPricingApi,
  updateNotificationPricingApi,
} from "@/services/settingsService"
import type {
  EmailCredential,
  EmailProviderType,
  SmtpEncryptionType,
  SaveEmailCredentialPayload,
  CommunicationSettings,
  NotificationPricingItem,
} from "@/types/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  KeyRound,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Lock,
  Mail,
  Server,
  Star,
  Send,
  Loader2,
  Power,
  Settings as SettingsIcon,
  ChevronRight,
  ShieldAlert,
  Bell,
  MessageSquare,
  Save,
  IndianRupee,
} from "lucide-react"
import { toast } from "sonner"

const ENCRYPTION_OPTIONS: { value: SmtpEncryptionType; label: string }[] = [
  { value: "tls", label: "TLS (Recommended - Port 587)" },
  { value: "ssl", label: "SSL (Port 465)" },
  { value: "none", label: "None (Unencrypted - Port 25)" },
]

const ENCRYPTION_LABELS: Record<SmtpEncryptionType, string> = {
  tls: "TLS (Recommended - Port 587)",
  ssl: "SSL (Port 465)",
  none: "None (Unencrypted - Port 25)",
}

function formatDate(dateStr?: string) {
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
      hour12: true,
    })
  } catch {
    return dateStr
  }
}

export default function EmailDeliverySettings() {
  const token = useAppSelector((state) => state.auth.token)
  const adminUser = useAppSelector((state) => state.auth.user)
  const { can } = usePermission()

  // Permissions
  const canUpdateSettings =
    can("email_delivery.update") ||
    can("email_delivery", ["can_edit", "can_manage", "can_add"]) ||
    can("email_settings", ["can_edit", "can_manage", "can_add"])
  const canDeleteSettings =
    can("email_delivery", "can_delete") ||
    can("email_settings", "can_delete") ||
    canUpdateSettings

  // Email credentials state
  const [emailCredentials, setEmailCredentials] = useState<EmailCredential[]>([])
  const [isEmailLoading, setIsEmailLoading] = useState(true)
  const [isEmailRefreshing, setIsEmailRefreshing] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  // Optional Subscription Communication Settings State
  const [commSettings, setCommSettings] = useState<CommunicationSettings>({
    email_alerts_enabled: 0,
    sms_alerts_enabled: 0,
    notify_on_payment_success: 1,
    notify_on_offline_decision: 1,
    notify_on_expiry_reminder: 1,
    sms_provider: "",
    sms_sender_id: "",
  })
  const [isSavingComm, setIsSavingComm] = useState(false)

  // Notification Credit Pricing State (SMS & Push)
  const [pricingItems, setPricingItems] = useState<NotificationPricingItem[]>([])
  const [isSavingPricing, setIsSavingPricing] = useState(false)

  // Add / Edit Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [emailFormMode, setEmailFormMode] = useState<"add" | "edit">("add")
  const [editingEmailId, setEditingEmailId] = useState<number | null>(null)
  const [provider, setProvider] = useState<EmailProviderType>("mailjet")
  const [fromName, setFromName] = useState("")
  const [fromEmail, setFromEmail] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState("587")
  const [smtpUsername, setSmtpUsername] = useState("")
  const [smtpPassword, setSmtpPassword] = useState("")
  const [smtpEncryption, setSmtpEncryption] = useState<SmtpEncryptionType>("tls")
  const [emailStatus, setEmailStatus] = useState<0 | 1>(1)
  const [emailIsDefault, setEmailIsDefault] = useState<0 | 1>(1)
  const [showEmailSecret, setShowEmailSecret] = useState(false)
  const [emailFormError, setEmailFormError] = useState<string | null>(null)
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false)

  // Delete Modal State
  const [deleteEmailTarget, setDeleteEmailTarget] = useState<EmailCredential | null>(null)
  const [isEmailDeleting, setIsEmailDeleting] = useState(false)

  // Send Test Email Modal State
  const [testEmailTarget, setTestEmailTarget] = useState<EmailCredential | null>(null)
  const [testRecipientEmail, setTestRecipientEmail] = useState("")
  const [isSendingTest, setIsSendingTest] = useState(false)

  const loadAllSettings = async (showSkeleton = true) => {
    if (!token) return
    if (showSkeleton) setIsEmailLoading(true)
    else setIsEmailRefreshing(true)

    try {
      const [creds, comm, pricing] = await Promise.all([
        fetchEmailCredentialsApi(token),
        fetchCommunicationSettingsApi(token).catch(() => null),
        fetchNotificationPricingApi(token).catch(() => []),
      ])
      setEmailCredentials(creds || [])
      if (comm) {
        setCommSettings({
          email_alerts_enabled: comm.email_alerts_enabled ? 1 : 0,
          sms_alerts_enabled: comm.sms_alerts_enabled ? 1 : 0,
          notify_on_payment_success:
            comm.notify_on_payment_success !== undefined
              ? (comm.notify_on_payment_success ? 1 : 0)
              : 1,
          notify_on_offline_decision:
            comm.notify_on_offline_decision !== undefined
              ? (comm.notify_on_offline_decision ? 1 : 0)
              : 1,
          notify_on_expiry_reminder:
            comm.notify_on_expiry_reminder !== undefined
              ? (comm.notify_on_expiry_reminder ? 1 : 0)
              : 1,
          sms_provider: comm.sms_provider || "",
          sms_sender_id: comm.sms_sender_id || "",
        })
      }
      if (Array.isArray(pricing) && pricing.length > 0) {
        setPricingItems(pricing)
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load email & communication settings.")
    } finally {
      setIsEmailLoading(false)
      setIsEmailRefreshing(false)
    }
  }

  useEffect(() => {
    loadAllSettings(true)
  }, [token])

  const handleSaveCommSettings = async () => {
    if (!token) return
    if (!canUpdateSettings) {
      toast.error("Access denied. Update permission required.")
      return
    }
    setIsSavingComm(true)
    try {
      const saved = await updateCommunicationSettingsApi(token, {
        ...commSettings,
        sms_provider: commSettings.sms_provider?.trim() || null,
        sms_sender_id: commSettings.sms_sender_id?.trim() || null,
      })
      setCommSettings({
        email_alerts_enabled: saved.email_alerts_enabled ? 1 : 0,
        sms_alerts_enabled: saved.sms_alerts_enabled ? 1 : 0,
        notify_on_payment_success: saved.notify_on_payment_success ? 1 : 0,
        notify_on_offline_decision: saved.notify_on_offline_decision ? 1 : 0,
        notify_on_expiry_reminder: saved.notify_on_expiry_reminder ? 1 : 0,
        sms_provider: saved.sms_provider || "",
        sms_sender_id: saved.sms_sender_id || "",
      })
      toast.success("Subscription alert preferences saved successfully.")
    } catch (err: any) {
      toast.error(err.message || "Failed to save alert preferences.")
    } finally {
      setIsSavingComm(false)
    }
  }

  const handleUpdatePricingField = (
    index: number,
    field: keyof NotificationPricingItem,
    value: string | number
  ) => {
    setPricingItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    )
  }

  const handleSaveNotificationPricing = async () => {
    if (!token) return
    if (!canUpdateSettings) {
      toast.error("Access denied. Update permission required.")
      return
    }
    for (const item of pricingItems) {
      const unitPrice = Number(item.unit_price)
      const minQty = Number(item.min_qty)
      if (!item.pack_name?.trim()) {
        toast.error(`Pack name is required for ${item.channel.toUpperCase()}.`)
        return
      }
      if (isNaN(unitPrice) || unitPrice < 0) {
        toast.error(`Valid non-negative unit price is required for ${item.channel.toUpperCase()}.`)
        return
      }
      if (!Number.isInteger(minQty) || minQty < 1) {
        toast.error(`Minimum credit order quantity must be at least 1 for ${item.channel.toUpperCase()}.`)
        return
      }
    }

    setIsSavingPricing(true)
    try {
      const updated = await updateNotificationPricingApi(
        token,
        pricingItems.map((it) => ({
          ...it,
          pack_name: it.pack_name.trim(),
          unit_price: Number(it.unit_price),
          min_qty: Number(it.min_qty),
          status: it.status ? 1 : 0,
        }))
      )
      setPricingItems(updated)
      toast.success("SMS & Push Notification credit pricing updated (Zero GST).")
    } catch (err: any) {
      toast.error(err.message || "Failed to update notification credit pricing.")
    } finally {
      setIsSavingPricing(false)
    }
  }

  const handleCopyValue = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    toast.success(`${label} copied to clipboard!`)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const mailjetConfig = emailCredentials.find((c) => c.provider === "mailjet") || null
  const smtpConfig = emailCredentials.find((c) => c.provider === "smtp") || null
  const defaultEmailConfig =
    emailCredentials.find((c) => c.is_default === 1 && c.status === 1) || null

  const openEmailModal = (targetProvider: EmailProviderType, existing?: EmailCredential | null) => {
    if (!canUpdateSettings) {
      toast.error("You do not have permission to modify email delivery configuration.")
      return
    }
    setProvider(targetProvider)
    setShowEmailSecret(false)
    setEmailFormError(null)

    if (existing) {
      setEmailFormMode("edit")
      setEditingEmailId(existing.id)
      setFromName(existing.from_name || "")
      setFromEmail(existing.from_email || "")
      setApiKey(existing.api_key || "")
      setApiSecret("")
      setSmtpHost(existing.smtp_host || "")
      setSmtpPort(String(existing.smtp_port || 587))
      setSmtpUsername(existing.smtp_username || "")
      setSmtpPassword("")
      setSmtpEncryption(existing.smtp_encryption || "tls")
      setEmailStatus(existing.status)
      setEmailIsDefault(existing.is_default)
    } else {
      setEmailFormMode("add")
      setEditingEmailId(null)
      setFromName("Growvidya")
      setFromEmail("")
      setApiKey("")
      setApiSecret("")
      setSmtpHost("")
      setSmtpPort("587")
      setSmtpUsername("")
      setSmtpPassword("")
      setSmtpEncryption("tls")
      setEmailStatus(1)
      setEmailIsDefault(emailCredentials.length === 0 ? 1 : 0)
    }

    setIsEmailModalOpen(true)
  }

  const handleEmailSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!canUpdateSettings) {
      toast.error("Access denied. You do not have update permission.")
      return
    }
    setEmailFormError(null)

    if (!fromName.trim()) {
      setEmailFormError("Sender From Name is required.")
      return
    }
    if (!fromEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail.trim())) {
      setEmailFormError("Please enter a valid Sender From Email address.")
      return
    }

    const payload: SaveEmailCredentialPayload = {
      provider,
      from_name: fromName.trim(),
      from_email: fromEmail.trim(),
      status: emailIsDefault === 1 ? 1 : emailStatus,
      is_default: emailIsDefault,
    }

    if (provider === "mailjet") {
      if (!apiKey.trim()) {
        setEmailFormError("Mailjet API Key is required.")
        return
      }
      if (emailFormMode === "add" && !apiSecret.trim()) {
        setEmailFormError("Mailjet Secret Key is required.")
        return
      }
      payload.api_key = apiKey.trim()
      if (apiSecret.trim() !== "") {
        payload.api_secret = apiSecret.trim()
      }
    } else {
      if (!smtpHost.trim()) {
        setEmailFormError("SMTP Host is required (e.g. smtp.gmail.com).")
        return
      }
      const parsedPort = Number(smtpPort)
      if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        setEmailFormError("SMTP Port must be between 1 and 65535.")
        return
      }
      if (!smtpUsername.trim()) {
        setEmailFormError("SMTP Username is required.")
        return
      }
      if (emailFormMode === "add" && !smtpPassword.trim()) {
        setEmailFormError("SMTP Password is required.")
        return
      }
      payload.smtp_host = smtpHost.trim()
      payload.smtp_port = parsedPort
      payload.smtp_username = smtpUsername.trim()
      payload.smtp_encryption = smtpEncryption
      if (smtpPassword.trim() !== "") {
        payload.smtp_password = smtpPassword.trim()
      }
    }

    setIsEmailSubmitting(true)
    try {
      if (emailFormMode === "edit" && editingEmailId) {
        await updateEmailCredentialsApi(token, editingEmailId, payload)
        toast.success(
          `${provider === "mailjet" ? "Mailjet" : "SMTP"} configuration updated successfully.`
        )
      } else {
        await saveEmailCredentialsApi(token, payload)
        toast.success(
          `${provider === "mailjet" ? "Mailjet" : "SMTP"} configuration saved successfully.`
        )
      }
      setIsEmailModalOpen(false)
      await loadAllSettings(false)
    } catch (err: any) {
      const msg = err.message || "Failed to save email configuration."
      setEmailFormError(msg)
      toast.error(msg)
    } finally {
      setIsEmailSubmitting(false)
    }
  }

  const handleSetDefaultProvider = async (cred: EmailCredential) => {
    if (!token || actionId === cred.id) return
    if (!canUpdateSettings) {
      toast.error("Access denied. Update permission required.")
      return
    }
    setActionId(cred.id)
    try {
      await setDefaultEmailProviderApi(token, cred.id)
      toast.success(
        `${cred.provider === "mailjet" ? "Mailjet" : "SMTP"} is now set as the Default email provider.`
      )
      await loadAllSettings(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to set default email provider.")
    } finally {
      setActionId(null)
    }
  }

  const handleToggleEmailStatus = async (cred: EmailCredential) => {
    if (!token || actionId === cred.id) return
    if (!canUpdateSettings) {
      toast.error("Access denied. Update permission required.")
      return
    }
    const nextStatus: 0 | 1 = cred.status === 1 ? 0 : 1
    setActionId(cred.id)
    try {
      await toggleEmailCredentialStatusApi(token, cred.id, nextStatus)
      toast.success(
        `${cred.provider === "mailjet" ? "Mailjet" : "SMTP"} marked as ${
          nextStatus === 1 ? "Active" : "Inactive"
        }.`
      )
      await loadAllSettings(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to update provider status.")
    } finally {
      setActionId(null)
    }
  }

  const handleConfirmEmailDelete = async () => {
    if (!token || !deleteEmailTarget) return
    if (!canDeleteSettings) {
      toast.error("Access denied. Delete permission required.")
      return
    }
    setIsEmailDeleting(true)
    try {
      await deleteEmailCredentialsApi(token, deleteEmailTarget.id)
      toast.success(
        `${deleteEmailTarget.provider === "mailjet" ? "Mailjet" : "SMTP"} configuration deleted.`
      )
      setDeleteEmailTarget(null)
      await loadAllSettings(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to delete email configuration.")
    } finally {
      setIsEmailDeleting(false)
    }
  }

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !testEmailTarget) return
    if (!testRecipientEmail.trim()) {
      toast.error("Please enter a recipient email address.")
      return
    }

    setIsSendingTest(true)
    try {
      await sendTestEmailApi(token, {
        to_email: testRecipientEmail.trim(),
        credential_id: testEmailTarget.id,
      })
      toast.success(
        `Test email sent to ${testRecipientEmail.trim()} via ${
          testEmailTarget.provider === "mailjet" ? "Mailjet" : "SMTP"
        }!`
      )
      setTestEmailTarget(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to send test email.")
    } finally {
      setIsSendingTest(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
      {/* Read-Only Notice when user lacks update permission */}
      {!canUpdateSettings && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-medium">
          <ShieldAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Read-only access:</strong> You have permission to view Email & Communication settings. Modifying providers, toggles, or credit pricing requires update permission.
          </span>
        </div>
      )}

      {/* Top Page Header with Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
            <SettingsIcon className="h-3.5 w-3.5" />
            <span>Settings</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-semibold">Email, SMS & Notification Pricing</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Email Delivery, Optional Alert Toggles & Credit Pricing
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure Mailjet / SMTP, toggle optional subscription Email & SMS alerts On/Off, and manage SMS/Push credit rates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAllSettings(false)}
            disabled={isEmailLoading || isEmailRefreshing}
            className="gap-2 h-9 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isEmailRefreshing ? "animate-spin" : ""}`}
            />
            {isEmailRefreshing ? "Refreshing..." : "Refresh"}
          </Button>

          {canUpdateSettings && !mailjetConfig && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEmailModal("mailjet", null)}
              className="gap-1.5 h-9 text-xs font-semibold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Configure Mailjet
            </Button>
          )}

          {canUpdateSettings && !smtpConfig && (
            <Button
              size="sm"
              onClick={() => openEmailModal("smtp", null)}
              className="gap-1.5 h-9 text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Configure SMTP
            </Button>
          )}
        </div>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Default Active Provider
              </p>
              <div className="text-lg font-bold tracking-tight">
                {isEmailLoading ? (
                  <Skeleton className="h-6 w-28" />
                ) : !defaultEmailConfig ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    Not Selected
                  </span>
                ) : defaultEmailConfig.provider === "mailjet" ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    Mailjet API
                  </span>
                ) : (
                  <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    SMTP Server
                  </span>
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Star className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Default Sender Identity
              </p>
              <div className="text-sm sm:text-base font-bold tracking-tight truncate">
                {isEmailLoading ? (
                  <Skeleton className="h-6 w-40" />
                ) : !defaultEmailConfig ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span title={`${defaultEmailConfig.from_name} <${defaultEmailConfig.from_email}>`}>
                    {defaultEmailConfig.from_name} ({defaultEmailConfig.from_email})
                  </span>
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <Mail className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Subscription Email Alerts
              </p>
              <div className="text-lg font-bold tracking-tight">
                {isEmailLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : commSettings.email_alerts_enabled === 1 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Enabled (ON)</span>
                ) : (
                  <span className="text-muted-foreground">Optional (OFF)</span>
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Bell className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Subscription SMS Alerts
              </p>
              <div className="text-lg font-bold tracking-tight">
                {isEmailLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : commSettings.sms_alerts_enabled === 1 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Enabled (ON)</span>
                ) : (
                  <span className="text-muted-foreground">Optional (OFF)</span>
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <MessageSquare className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optional Subscription Lifecycle Alert Controls (Super Admin On/Off) */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="border-b bg-muted/25 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Optional Subscription Lifecycle Alerts (Super Admin Controlled)
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Control whether subscription payment receipts, bank transfer approvals, and expiry reminders are dispatched via Email (SMTP/Mailjet) or SMS. When turned OFF, workflows skip external messaging cleanly without errors.
              </CardDescription>
            </div>
            {canUpdateSettings && (
              <Button
                type="button"
                size="sm"
                onClick={handleSaveCommSettings}
                disabled={isSavingComm || isEmailLoading}
                className="gap-1.5 h-8 text-xs font-semibold cursor-pointer self-start sm:self-auto"
              >
                {isSavingComm ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save Alert Preferences
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* Master Channel Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border bg-muted/20 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Email Alerts (via Active SMTP / Mailjet)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {defaultEmailConfig
                    ? `Uses default provider: ${defaultEmailConfig.provider.toUpperCase()} (${defaultEmailConfig.from_email})`
                    : "No active default email provider configured yet — alerts will be skipped safely."}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  disabled={!canUpdateSettings}
                  variant={commSettings.email_alerts_enabled === 1 ? "default" : "outline"}
                  onClick={() =>
                    setCommSettings((p) => ({ ...p, email_alerts_enabled: 1 }))
                  }
                  className="h-8 px-3 text-xs cursor-pointer"
                >
                  ON
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!canUpdateSettings}
                  variant={commSettings.email_alerts_enabled === 0 ? "default" : "outline"}
                  onClick={() =>
                    setCommSettings((p) => ({ ...p, email_alerts_enabled: 0 }))
                  }
                  className="h-8 px-3 text-xs cursor-pointer"
                >
                  OFF
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-muted/20 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-semibold text-foreground">
                    SMS Subscription Alerts (Optional)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Toggle transactional SMS alerts for school subscription activations & reminders.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  disabled={!canUpdateSettings}
                  variant={commSettings.sms_alerts_enabled === 1 ? "default" : "outline"}
                  onClick={() =>
                    setCommSettings((p) => ({ ...p, sms_alerts_enabled: 1 }))
                  }
                  className="h-8 px-3 text-xs cursor-pointer"
                >
                  ON
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!canUpdateSettings}
                  variant={commSettings.sms_alerts_enabled === 0 ? "default" : "outline"}
                  onClick={() =>
                    setCommSettings((p) => ({ ...p, sms_alerts_enabled: 0 }))
                  }
                  className="h-8 px-3 text-xs cursor-pointer"
                >
                  OFF
                </Button>
              </div>
            </div>
          </div>

          {/* Event-level Switches */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex items-start gap-2.5 p-3 rounded-lg border bg-background cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={!canUpdateSettings}
                checked={commSettings.notify_on_payment_success === 1}
                onChange={(e) =>
                  setCommSettings((p) => ({
                    ...p,
                    notify_on_payment_success: e.target.checked ? 1 : 0,
                  }))
                }
                className="mt-0.5 rounded border-border"
              />
              <div className="text-xs">
                <span className="font-semibold text-foreground block">
                  Online Payment & Instant Activation
                </span>
                <span className="text-muted-foreground">
                  Send Zero-GST invoice confirmation when Razorpay payment succeeds.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-lg border bg-background cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={!canUpdateSettings}
                checked={commSettings.notify_on_offline_decision === 1}
                onChange={(e) =>
                  setCommSettings((p) => ({
                    ...p,
                    notify_on_offline_decision: e.target.checked ? 1 : 0,
                  }))
                }
                className="mt-0.5 rounded border-border"
              />
              <div className="text-xs">
                <span className="font-semibold text-foreground block">
                  Offline Bank Transfer Decisions
                </span>
                <span className="text-muted-foreground">
                  Notify schools when Super Admin approves or rejects UTR bank transfers.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-lg border bg-background cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={!canUpdateSettings}
                checked={commSettings.notify_on_expiry_reminder === 1}
                onChange={(e) =>
                  setCommSettings((p) => ({
                    ...p,
                    notify_on_expiry_reminder: e.target.checked ? 1 : 0,
                  }))
                }
                className="mt-0.5 rounded border-border"
              />
              <div className="text-xs">
                <span className="font-semibold text-foreground block">
                  Automated Expiry Reminders
                </span>
                <span className="text-muted-foreground">
                  Remind schools at 15, 7, 3, 1, and 0 days before subscription expiry.
                </span>
              </div>
            </label>
          </div>

          {/* Optional SMS Sender Metadata when SMS is ON */}
          {commSettings.sms_alerts_enabled === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  SMS Provider Name <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  placeholder="e.g. MSG91 / TextLocal / Fast2SMS"
                  value={commSettings.sms_provider || ""}
                  disabled={!canUpdateSettings}
                  onChange={(e) =>
                    setCommSettings((p) => ({ ...p, sms_provider: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  SMS DLT Sender ID <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  placeholder="e.g. GRWVDY"
                  value={commSettings.sms_sender_id || ""}
                  disabled={!canUpdateSettings}
                  onChange={(e) =>
                    setCommSettings((p) => ({ ...p, sms_sender_id: e.target.value }))
                  }
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SMS & Push Notification Credit Pricing (Zero GST) */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="border-b bg-muted/25 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" />
                Prepaid SMS & Push Notification Credit Pricing (Zero GST)
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Dynamic database rates used across Onboarding & School ERP Add-on Checkout. Schools purchase prepaid credits into their metered Notification Wallet with zero hardcoded prices and zero GST.
              </CardDescription>
            </div>
            {canUpdateSettings && pricingItems.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={handleSaveNotificationPricing}
                disabled={isSavingPricing || isEmailLoading}
                className="gap-1.5 h-8 text-xs font-semibold cursor-pointer self-start sm:self-auto"
              >
                {isSavingPricing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving Rates...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save Credit Pricing
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {isEmailLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          ) : pricingItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No notification pricing rows returned from server.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pricingItems.map((item, idx) => {
                const sampleTotal = (Number(item.unit_price || 0) * Number(item.min_qty || 1000)).toFixed(2)
                return (
                  <div
                    key={item.channel}
                    className="p-4 rounded-xl border bg-muted/15 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="uppercase font-mono text-xs font-bold border-primary/40 bg-primary/10 text-primary"
                        >
                          {item.channel.toUpperCase()} Channel
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Min pack = ₹{Number(sampleTotal).toLocaleString("en-IN")} net
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={!canUpdateSettings}
                        onClick={() =>
                          handleUpdatePricingField(idx, "status", item.status === 1 ? 0 : 1)
                        }
                        className="cursor-pointer"
                      >
                        <Badge
                          variant={item.status === 1 ? "default" : "secondary"}
                          className={
                            item.status === 1
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px]"
                              : "text-[11px]"
                          }
                        >
                          {item.status === 1 ? "Active" : "Disabled"}
                        </Badge>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1 sm:col-span-1">
                        <Label className="text-[11px] font-semibold">Pack Label</Label>
                        <Input
                          value={item.pack_name}
                          disabled={!canUpdateSettings}
                          onChange={(e) =>
                            handleUpdatePricingField(idx, "pack_name", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Net Price / Credit (₹)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          disabled={!canUpdateSettings}
                          onChange={(e) =>
                            handleUpdatePricingField(idx, "unit_price", e.target.value)
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Min Order Credits</Label>
                        <Input
                          type="number"
                          step="100"
                          min="1"
                          value={item.min_qty}
                          disabled={!canUpdateSettings}
                          onChange={(e) =>
                            handleUpdatePricingField(idx, "min_qty", Number(e.target.value))
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Description</Label>
                      <Input
                        value={item.description || ""}
                        disabled={!canUpdateSettings}
                        placeholder="Short description shown in school add-on configurator"
                        onChange={(e) =>
                          handleUpdatePricingField(idx, "description", e.target.value)
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two Provider Cards: Mailjet & SMTP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Mailjet Card */}
        <Card
          className={`border transition-all shadow-xs flex flex-col justify-between ${
            mailjetConfig?.is_default === 1
              ? "border-primary ring-1 ring-primary/30"
              : "border-border/80"
          }`}
        >
          <div>
            <CardHeader className="border-b bg-muted/25 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base font-bold">
                        Mailjet Email API
                      </CardTitle>
                      {mailjetConfig?.is_default === 1 && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] gap-1 px-2 py-0.5">
                          <Star className="h-3 w-3 fill-current" />
                          Default Provider
                        </Badge>
                      )}
                      {mailjetConfig && (
                        <Badge
                          variant={mailjetConfig.status === 1 ? "default" : "secondary"}
                          className={
                            mailjetConfig.status === 1
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]"
                              : "text-[10px]"
                          }
                        >
                          {mailjetConfig.status === 1 ? "Active" : "Inactive"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              {isEmailLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
              ) : !mailjetConfig ? (
                <div className="py-8 text-center space-y-3">
                  <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Mailjet Not Configured
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Add your Mailjet API Key and Secret Key to send transactional emails through Mailjet.
                    </p>
                  </div>
                  {canUpdateSettings && (
                    <Button
                      size="sm"
                      onClick={() => openEmailModal("mailjet", null)}
                      className="gap-1.5 text-xs h-8 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Configure Mailjet
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">From Name</span>
                    <span className="font-semibold text-foreground">
                      {mailjetConfig.from_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">From Email</span>
                    <span className="font-mono font-semibold text-foreground">
                      {mailjetConfig.from_email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">API Key</span>
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono bg-muted px-2 py-0.5 rounded border text-xs">
                        {mailjetConfig.api_key}
                      </code>
                      {mailjetConfig.api_key && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopyValue(mailjetConfig.api_key!, "Mailjet API Key")
                          }
                          className="h-6 w-6 p-0 cursor-pointer"
                        >
                          {copiedText === mailjetConfig.api_key ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Secret Key</span>
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border select-none">
                        {mailjetConfig.api_secret_masked || "••••••••••••••••"}
                      </code>
                      <Badge
                        variant="outline"
                        className="text-[10px] gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      >
                        <Lock className="h-2.5 w-2.5" />
                        Encrypted
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                    <span>Last Updated</span>
                    <span>
                      {formatDate(mailjetConfig.updated_at || mailjetConfig.created_on)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </div>

          {mailjetConfig && (
            <div className="px-5 py-3 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                {canUpdateSettings && mailjetConfig.is_default !== 1 && (
                  <Button
                    size="sm"
                    variant="default"
                    disabled={actionId === mailjetConfig.id}
                    onClick={() => handleSetDefaultProvider(mailjetConfig)}
                    className="h-8 px-3 text-xs gap-1.5 cursor-pointer"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Set as Default
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTestEmailTarget(mailjetConfig)
                    setTestRecipientEmail(adminUser?.email || "")
                  }}
                  className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  Test Email
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                {canUpdateSettings ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={actionId === mailjetConfig.id}
                      onClick={() => handleToggleEmailStatus(mailjetConfig)}
                      className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                    >
                      <Power
                        className={`h-3.5 w-3.5 ${
                          mailjetConfig.status === 1
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      />
                      {mailjetConfig.status === 1 ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEmailModal("mailjet", mailjetConfig)}
                      className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    {canDeleteSettings && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteEmailTarget(mailjetConfig)}
                        className="h-8 px-2.5 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Read-only</span>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* 2. SMTP Server Card */}
        <Card
          className={`border transition-all shadow-xs flex flex-col justify-between ${
            smtpConfig?.is_default === 1
              ? "border-primary ring-1 ring-primary/30"
              : "border-border/80"
          }`}
        >
          <div>
            <CardHeader className="border-b bg-muted/25 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base font-bold">
                        SMTP Mail Server
                      </CardTitle>
                      {smtpConfig?.is_default === 1 && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] gap-1 px-2 py-0.5">
                          <Star className="h-3 w-3 fill-current" />
                          Default Provider
                        </Badge>
                      )}
                      {smtpConfig && (
                        <Badge
                          variant={smtpConfig.status === 1 ? "default" : "secondary"}
                          className={
                            smtpConfig.status === 1
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]"
                              : "text-[10px]"
                          }
                        >
                          {smtpConfig.status === 1 ? "Active" : "Inactive"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              {isEmailLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
              ) : !smtpConfig ? (
                <div className="py-8 text-center space-y-3">
                  <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Server className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      SMTP Server Not Configured
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Add your SMTP Host, Port, Username, and Password to send emails via SMTP.
                    </p>
                  </div>
                  {canUpdateSettings && (
                    <Button
                      size="sm"
                      onClick={() => openEmailModal("smtp", null)}
                      className="gap-1.5 text-xs h-8 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Configure SMTP
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">From Identity</span>
                    <span className="font-semibold text-foreground">
                      {smtpConfig.from_name} &lt;{smtpConfig.from_email}&gt;
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Host & Port</span>
                    <code className="font-mono bg-muted px-2 py-0.5 rounded border text-xs">
                      {smtpConfig.smtp_host}:{smtpConfig.smtp_port} (
                      {(smtpConfig.smtp_encryption || "tls").toUpperCase()})
                    </code>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Username</span>
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono bg-muted px-2 py-0.5 rounded border text-xs">
                        {smtpConfig.smtp_username}
                      </code>
                      {smtpConfig.smtp_username && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopyValue(smtpConfig.smtp_username!, "SMTP Username")
                          }
                          className="h-6 w-6 p-0 cursor-pointer"
                        >
                          {copiedText === smtpConfig.smtp_username ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Password</span>
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border select-none">
                        {smtpConfig.smtp_password_masked || "••••••••••••••••"}
                      </code>
                      <Badge
                        variant="outline"
                        className="text-[10px] gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      >
                        <Lock className="h-2.5 w-2.5" />
                        Encrypted
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                    <span>Last Updated</span>
                    <span>
                      {formatDate(smtpConfig.updated_at || smtpConfig.created_on)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </div>

          {smtpConfig && (
            <div className="px-5 py-3 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                {canUpdateSettings && smtpConfig.is_default !== 1 && (
                  <Button
                    size="sm"
                    variant="default"
                    disabled={actionId === smtpConfig.id}
                    onClick={() => handleSetDefaultProvider(smtpConfig)}
                    className="h-8 px-3 text-xs gap-1.5 cursor-pointer"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Set as Default
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTestEmailTarget(smtpConfig)
                    setTestRecipientEmail(adminUser?.email || "")
                  }}
                  className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  Test Email
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                {canUpdateSettings ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={actionId === smtpConfig.id}
                      onClick={() => handleToggleEmailStatus(smtpConfig)}
                      className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                    >
                      <Power
                        className={`h-3.5 w-3.5 ${
                          smtpConfig.status === 1
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      />
                      {smtpConfig.status === 1 ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEmailModal("smtp", smtpConfig)}
                      className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    {canDeleteSettings && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteEmailTarget(smtpConfig)}
                        className="h-8 px-2.5 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Read-only</span>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Add / Edit Email Provider (Mailjet or SMTP) Dialog */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {provider === "mailjet" ? (
                <Mail className="h-5 w-5 text-primary" />
              ) : (
                <Server className="h-5 w-5 text-primary" />
              )}
              {emailFormMode === "add"
                ? `Configure ${provider === "mailjet" ? "Mailjet API" : "SMTP Server"}`
                : `Edit ${provider === "mailjet" ? "Mailjet API" : "SMTP Server"} Credentials`}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEmailSaveSubmit} className="space-y-4 py-1">
            {emailFormError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{emailFormError}</span>
              </div>
            )}

            {/* Provider Selector when adding */}
            {emailFormMode === "add" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Provider</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProvider("mailjet")}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      provider === "mailjet"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Mailjet API
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider("smtp")}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      provider === "smtp"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Server className="h-3.5 w-3.5" />
                    SMTP Server
                  </button>
                </div>
              </div>
            )}

            {/* Sender From Name & From Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email_from_name" className="text-xs font-semibold">
                  From Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email_from_name"
                  placeholder="Growvidya Admin"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email_from_address" className="text-xs font-semibold">
                  From Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email_from_address"
                  type="email"
                  placeholder="noreply@growvidya.in"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            {provider === "mailjet" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="mailjet_api_key" className="text-xs font-semibold">
                    Mailjet API Key (Public Key) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mailjet_api_key"
                    placeholder="Enter Mailjet API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="off"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mailjet_secret_key" className="text-xs font-semibold">
                    Mailjet Secret Key{" "}
                    {emailFormMode === "add" ? (
                      <span className="text-destructive">*</span>
                    ) : (
                      <span className="text-muted-foreground font-normal">
                        (Leave blank to keep existing secret)
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="mailjet_secret_key"
                      type={showEmailSecret ? "text" : "password"}
                      placeholder={
                        emailFormMode === "edit"
                          ? "•••••••••••••••• (Enter new secret to replace)"
                          : "Enter Mailjet Secret Key"
                      }
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      autoComplete="new-password"
                      className="h-9 text-xs font-mono pr-9"
                      required={emailFormMode === "add"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmailSecret((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      tabIndex={-1}
                    >
                      {showEmailSecret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="smtp_host" className="text-xs font-semibold">
                      SMTP Host <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="smtp_host"
                      placeholder="smtp.gmail.com"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      className="h-9 text-xs font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="smtp_port" className="text-xs font-semibold">
                      SMTP Port <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="smtp_port"
                      type="number"
                      min="1"
                      max="65535"
                      placeholder="587"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      className="h-9 text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="smtp_encryption" className="text-xs font-semibold">
                    SMTP Encryption
                  </Label>
                  <Select
                    value={smtpEncryption}
                    onValueChange={(val) => {
                      if (val) setSmtpEncryption(val as SmtpEncryptionType)
                    }}
                    items={ENCRYPTION_OPTIONS}
                    itemToStringLabel={(val) =>
                      ENCRYPTION_LABELS[val as SmtpEncryptionType] || String(val || "")
                    }
                  >
                    <SelectTrigger id="smtp_encryption" className="w-full h-9 text-xs">
                      <SelectValue placeholder="Select encryption" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENCRYPTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="smtp_username" className="text-xs font-semibold">
                    SMTP Username <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="smtp_username"
                    placeholder="your-email@domain.com"
                    value={smtpUsername}
                    onChange={(e) => setSmtpUsername(e.target.value)}
                    autoComplete="off"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="smtp_password" className="text-xs font-semibold">
                    SMTP Password{" "}
                    {emailFormMode === "add" ? (
                      <span className="text-destructive">*</span>
                    ) : (
                      <span className="text-muted-foreground font-normal">
                        (Leave blank to keep existing password)
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="smtp_password"
                      type={showEmailSecret ? "text" : "password"}
                      placeholder={
                        emailFormMode === "edit"
                          ? "•••••••••••••••• (Enter new password to replace)"
                          : "Enter SMTP Password / App Password"
                      }
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      autoComplete="new-password"
                      className="h-9 text-xs font-mono pr-9"
                      required={emailFormMode === "add"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmailSecret((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      tabIndex={-1}
                    >
                      {showEmailSecret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Default & Status controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Use as Default Provider</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={emailIsDefault === 1 ? "default" : "outline"}
                    onClick={() => {
                      setEmailIsDefault(1)
                      setEmailStatus(1)
                    }}
                    className="h-8 text-xs cursor-pointer gap-1"
                  >
                    <Star className="h-3 w-3" />
                    Yes (Default)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={emailIsDefault === 0 ? "default" : "outline"}
                    onClick={() => setEmailIsDefault(0)}
                    className="h-8 text-xs cursor-pointer"
                  >
                    No
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={emailStatus === 1 ? "default" : "outline"}
                    onClick={() => setEmailStatus(1)}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Active
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={emailStatus === 0 ? "default" : "outline"}
                    disabled={emailIsDefault === 1}
                    onClick={() => setEmailStatus(0)}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Inactive
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEmailModalOpen(false)}
                disabled={isEmailSubmitting}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isEmailSubmitting || !canUpdateSettings}
                className="cursor-pointer gap-1.5"
              >
                {isEmailSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : emailFormMode === "add" ? (
                  "Save Configuration"
                ) : (
                  "Update Configuration"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send Test Email Dialog */}
      <Dialog
        open={Boolean(testEmailTarget)}
        onOpenChange={(open) => {
          if (!open) setTestEmailTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Test Email (
              {testEmailTarget?.provider === "mailjet" ? "Mailjet API" : "SMTP Server"})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Verify your{" "}
              <strong>
                {testEmailTarget?.provider === "mailjet" ? "Mailjet" : "SMTP"}
              </strong>{" "}
              credentials by sending a live test email from{" "}
              <code className="font-mono">{testEmailTarget?.from_email}</code>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendTestEmail} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="test_recipient_email" className="text-xs font-semibold">
                Recipient Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="test_recipient_email"
                type="email"
                placeholder="Enter email address to receive test message"
                value={testRecipientEmail}
                onChange={(e) => setTestRecipientEmail(e.target.value)}
                className="h-9 text-xs font-mono"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTestEmailTarget(null)}
                disabled={isSendingTest}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSendingTest}
                className="cursor-pointer gap-1.5"
              >
                {isSendingTest ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send Test Email
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Email Configuration Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteEmailTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteEmailTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete{" "}
              {deleteEmailTarget?.provider === "mailjet" ? "Mailjet" : "SMTP"}{" "}
              Configuration
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete the stored{" "}
              <strong>
                {deleteEmailTarget?.provider === "mailjet" ? "Mailjet API" : "SMTP Server"}
              </strong>{" "}
              credentials?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteEmailTarget(null)}
              disabled={isEmailDeleting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmEmailDelete}
              disabled={isEmailDeleting || !canDeleteSettings}
              className="cursor-pointer"
            >
              {isEmailDeleting ? "Deleting..." : "Delete Credentials"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
