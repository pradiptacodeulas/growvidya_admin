import { useState, useEffect } from "react"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
import {
  fetchEmailCredentialsApi,
  saveEmailCredentialsApi,
  updateEmailCredentialsApi,
  setDefaultEmailProviderApi,
  setActiveEmailProviderApi,
  toggleEmailCredentialStatusApi,
  deleteEmailCredentialsApi,
  sendTestEmailApi,
} from "@/services/settingsService"
import type {
  EmailCredential,
  EmailProviderType,
  SmtpEncryptionType,
  SaveEmailCredentialPayload,
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
  Globe,
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

const ZOHO_HOST_OPTIONS: { value: string; label: string }[] = [
  { value: "smtp.zoho.in", label: "smtp.zoho.in (India — Standard)" },
  { value: "smtppro.zoho.in", label: "smtppro.zoho.in (India — Custom Domain / Workplace)" },
  { value: "smtp.zoho.com", label: "smtp.zoho.com (Global / US — Standard)" },
  { value: "smtppro.zoho.com", label: "smtppro.zoho.com (Global / US — Custom Domain / Workplace)" },
  { value: "smtp.zoho.eu", label: "smtp.zoho.eu (Europe)" },
  { value: "smtp.zoho.com.au", label: "smtp.zoho.com.au (Australia)" },
]

const ZOHO_HOST_LABELS: Record<string, string> = Object.fromEntries(
  ZOHO_HOST_OPTIONS.map((o) => [o.value, o.label])
)

const PROVIDER_LABELS: Record<EmailProviderType, string> = {
  mailjet: "Mailjet",
  zoho: "Zoho Mail",
  smtp: "SMTP",
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
    can("email_settings", "can_delete")

  // Email credentials state
  const [emailCredentials, setEmailCredentials] = useState<EmailCredential[]>([])
  const [isEmailLoading, setIsEmailLoading] = useState(true)
  const [isEmailRefreshing, setIsEmailRefreshing] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)
  const [switchingProvider, setSwitchingProvider] = useState<EmailProviderType | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)

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
  const [smtpPort, setSmtpPort] = useState("")
  const [smtpUsername, setSmtpUsername] = useState("")
  const [smtpPassword, setSmtpPassword] = useState("")
  const [smtpEncryption, setSmtpEncryption] = useState<SmtpEncryptionType>("tls")
  const [emailStatus, setEmailStatus] = useState<1 | 2>(1)
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
      const creds = await fetchEmailCredentialsApi(token)
      setEmailCredentials(creds || [])
    } catch (err: any) {
      toast.error(err.message || "Failed to load email delivery settings.")
    } finally {
      setIsEmailLoading(false)
      setIsEmailRefreshing(false)
    }
  }

  useEffect(() => {
    loadAllSettings(true)
  }, [token])

  const handleCopyValue = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    toast.success(`${label} copied to clipboard!`)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const mailjetConfig = emailCredentials.find((c) => c.provider === "mailjet") || null
  const zohoConfig = emailCredentials.find((c) => c.provider === "zoho") || null
  const smtpConfig = emailCredentials.find((c) => c.provider === "smtp") || null
  const defaultEmailConfig =
    emailCredentials.find((c) => c.is_default === 1 && c.status === 1) || null
  const activeProvider: EmailProviderType | null = defaultEmailConfig?.provider || null

  const openEmailModal = (targetProvider: EmailProviderType, existing?: EmailCredential | null, forceDefault = false) => {
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
      setApiSecret(existing.api_secret || "")
      setSmtpHost(existing.smtp_host || (targetProvider === "zoho" ? "smtp.zoho.in" : ""))
      setSmtpPort(existing.smtp_port ? String(existing.smtp_port) : targetProvider === "zoho" ? "465" : "587")
      setSmtpUsername(existing.smtp_username || "")
      setSmtpPassword(existing.smtp_password || "")
      setSmtpEncryption(existing.smtp_encryption || (targetProvider === "zoho" ? "ssl" : "tls"))
      setEmailStatus(existing.status)
      setEmailIsDefault(forceDefault ? 1 : existing.is_default)
    } else {
      setEmailFormMode("add")
      setEditingEmailId(null)
      setFromName("")
      setFromEmail("")
      setApiKey("")
      setApiSecret("")
      setSmtpHost(targetProvider === "zoho" ? "smtp.zoho.in" : "")
      setSmtpPort(targetProvider === "zoho" ? "465" : "587")
      setSmtpUsername("")
      setSmtpPassword("")
      setSmtpEncryption(targetProvider === "zoho" ? "ssl" : "tls")
      setEmailStatus(1)
      setEmailIsDefault(forceDefault || !defaultEmailConfig ? 1 : 0)
    }

    setIsEmailModalOpen(true)
  }

  const handleSelectActiveProviderSwitch = async (targetProvider: EmailProviderType) => {
    if (!token || switchingProvider || activeProvider === targetProvider) return
    if (!canUpdateSettings) {
      toast.error("Access denied. Update permission required.")
      return
    }

    const existing = emailCredentials.find((c) => c.provider === targetProvider) || null
    if (!existing) {
      toast.info(`Please configure ${PROVIDER_LABELS[targetProvider]} credentials to activate it for OTP delivery.`)
      openEmailModal(targetProvider, null, true)
      return
    }

    setSwitchingProvider(targetProvider)
    try {
      await setActiveEmailProviderApi(token, targetProvider)
      toast.success(
        `${PROVIDER_LABELS[targetProvider]} is now active for all Sign-In OTP, Forgot Password OTP & system email delivery.`
      )
      await loadAllSettings(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to switch active OTP delivery provider.")
    } finally {
      setSwitchingProvider(null)
    }
  }

  const handleProviderSelectInModal = (nextProvider: EmailProviderType) => {
    setProvider(nextProvider)
    setEmailFormError(null)
    if (nextProvider === "zoho") {
      setSmtpHost((prev) => (prev && prev.includes("zoho") ? prev : "smtp.zoho.in"))
      setSmtpPort("465")
      setSmtpEncryption("ssl")
    } else if (nextProvider === "smtp") {
      if (smtpHost.includes("zoho")) setSmtpHost("")
      setSmtpPort("587")
      setSmtpEncryption("tls")
    }
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
    } else if (provider === "zoho") {
      const resolvedHost = smtpHost.trim() || "smtp.zoho.in"
      const parsedPort = Number(smtpPort || 465)
      const resolvedUser = smtpUsername.trim() || fromEmail.trim()
      if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        setEmailFormError("Zoho SMTP Port must be between 1 and 65535.")
        return
      }
      if (!resolvedUser) {
        setEmailFormError("Zoho Mail Email / Username is required.")
        return
      }
      if (emailFormMode === "add" && !smtpPassword.trim()) {
        setEmailFormError("Zoho Mail App Password is required.")
        return
      }
      payload.smtp_host = resolvedHost
      payload.smtp_port = parsedPort
      payload.smtp_username = resolvedUser
      payload.smtp_encryption = smtpEncryption
      if (smtpPassword.trim() !== "") {
        payload.smtp_password = smtpPassword.trim()
      }
    } else {
      if (!smtpHost.trim()) {
        setEmailFormError("SMTP Host is required.")
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
      const label = PROVIDER_LABELS[provider]
      if (emailFormMode === "edit" && editingEmailId) {
        await updateEmailCredentialsApi(token, editingEmailId, payload)
        toast.success(`${label} configuration updated successfully.`)
      } else {
        await saveEmailCredentialsApi(token, payload)
        toast.success(`${label} configuration saved successfully.`)
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
        `${PROVIDER_LABELS[cred.provider]} is now set as the active OTP & email provider.`
      )
      await loadAllSettings(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to set active email provider.")
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
    const nextStatus: 1 | 2 = cred.status === 1 ? 2 : 1
    setActionId(cred.id)
    try {
      await toggleEmailCredentialStatusApi(token, cred.id, nextStatus)
      toast.success(
        `${PROVIDER_LABELS[cred.provider]} marked as ${
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
        `${PROVIDER_LABELS[deleteEmailTarget.provider]} configuration deleted.`
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
          PROVIDER_LABELS[testEmailTarget.provider]
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
            <strong>Read-only access:</strong> You have permission to view Email & Communication settings. Modifying providers or switching the active OTP provider requires update permission.
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
            <span className="text-foreground font-semibold">Email Delivery</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Email &amp; OTP Delivery Configuration
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure Mailjet API, Zoho Mail, and Custom SMTP servers. Select one active provider for all OTPs and emails.
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

          {canUpdateSettings && !zohoConfig && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEmailModal("zoho", null)}
              className="gap-1.5 h-9 text-xs font-semibold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Configure Zoho Mail
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

      {/* Summary Metrics Row & 3-Option Active OTP Delivery Switch */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Active OTP &amp; Email Provider
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
                ) : defaultEmailConfig.provider === "zoho" ? (
                  <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    Zoho Mail
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
                Active Sender Identity
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

        {/* 3-Option Active OTP Delivery Switch (Mailjet | Zoho Mail | SMTP) */}
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  OTP Delivery Channel Switch
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Select one provider for Sign-In, Forgot Password &amp; Action OTPs
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-muted/60 border border-border/60">
              {(["mailjet", "zoho", "smtp"] as EmailProviderType[]).map((item) => {
                const isSelected = activeProvider === item
                const isConfigured = Boolean(
                  emailCredentials.find((c) => c.provider === item)
                )
                const isBusy = switchingProvider === item
                return (
                  <Button
                    key={item}
                    type="button"
                    size="sm"
                    disabled={!canUpdateSettings || Boolean(switchingProvider)}
                    variant={isSelected ? "default" : "ghost"}
                    onClick={() => handleSelectActiveProviderSwitch(item)}
                    className={`h-8 px-2 text-xs font-semibold cursor-pointer transition-all ${
                      isSelected
                        ? "shadow-xs"
                        : isConfigured
                          ? "text-foreground hover:bg-background/80"
                          : "text-muted-foreground opacity-75 hover:opacity-100"
                    }`}
                  >
                    {isBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      PROVIDER_LABELS[item]
                    )}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Three Provider Cards: Mailjet, Zoho Mail & SMTP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                          Active OTP Sender
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
                          {mailjetConfig.status === 1 ? "Enabled" : "Disabled"}
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
                      Add your Mailjet API Key and Secret Key to send OTP and transactional emails via Mailjet.
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
                    <span className="font-mono font-semibold text-foreground truncate max-w-[180px]">
                      {mailjetConfig.from_email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">API Key</span>
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono bg-muted px-2 py-0.5 rounded border text-xs truncate max-w-[140px]">
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
            <div className="px-4 py-3 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                {canUpdateSettings && mailjetConfig.is_default !== 1 && (
                  <Button
                    size="sm"
                    variant="default"
                    disabled={actionId === mailjetConfig.id}
                    onClick={() => handleSetDefaultProvider(mailjetConfig)}
                    className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Use for OTP
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTestEmailTarget(mailjetConfig)
                    setTestRecipientEmail(adminUser?.email || "")
                  }}
                  className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  Test
                </Button>
              </div>

              <div className="flex items-center gap-1">
                {canUpdateSettings ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={actionId === mailjetConfig.id}
                      onClick={() => handleToggleEmailStatus(mailjetConfig)}
                      className="h-8 px-2 text-xs gap-1 cursor-pointer"
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
                      className="h-8 px-2 text-xs gap-1 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    {canDeleteSettings && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteEmailTarget(mailjetConfig)}
                        className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
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

        {/* 2. Zoho Mail Card */}
        <Card
          className={`border transition-all shadow-xs flex flex-col justify-between ${
            zohoConfig?.is_default === 1
              ? "border-primary ring-1 ring-primary/30"
              : "border-border/80"
          }`}
        >
          <div>
            <CardHeader className="border-b bg-muted/25 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base font-bold">
                        Zoho Mail
                      </CardTitle>
                      {zohoConfig?.is_default === 1 && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] gap-1 px-2 py-0.5">
                          <Star className="h-3 w-3 fill-current" />
                          Active OTP Sender
                        </Badge>
                      )}
                      {zohoConfig && (
                        <Badge
                          variant={zohoConfig.status === 1 ? "default" : "secondary"}
                          className={
                            zohoConfig.status === 1
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]"
                              : "text-[10px]"
                          }
                        >
                          {zohoConfig.status === 1 ? "Enabled" : "Disabled"}
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
              ) : !zohoConfig ? (
                <div className="py-8 text-center space-y-3">
                  <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Zoho Mail Not Configured
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Connect your Zoho Mail / Workplace account and App Password to send OTPs via Zoho Mail.
                    </p>
                  </div>
                  {canUpdateSettings && (
                    <Button
                      size="sm"
                      onClick={() => openEmailModal("zoho", null)}
                      className="gap-1.5 text-xs h-8 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Configure Zoho Mail
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">From Identity</span>
                    <span className="font-semibold text-foreground truncate max-w-[190px]">
                      {zohoConfig.from_name} &lt;{zohoConfig.from_email}&gt;
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Zoho Server</span>
                    <code className="font-mono bg-muted px-2 py-0.5 rounded border text-xs">
                      {zohoConfig.smtp_host}:{zohoConfig.smtp_port} (
                      {(zohoConfig.smtp_encryption || "ssl").toUpperCase()})
                    </code>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Zoho Account</span>
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono bg-muted px-2 py-0.5 rounded border text-xs truncate max-w-[145px]">
                        {zohoConfig.smtp_username}
                      </code>
                      {zohoConfig.smtp_username && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopyValue(zohoConfig.smtp_username!, "Zoho Email")
                          }
                          className="h-6 w-6 p-0 cursor-pointer"
                        >
                          {copiedText === zohoConfig.smtp_username ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">App Password</span>
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border select-none">
                        {zohoConfig.smtp_password_masked || "••••••••••••••••"}
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
                      {formatDate(zohoConfig.updated_at || zohoConfig.created_on)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </div>

          {zohoConfig && (
            <div className="px-4 py-3 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                {canUpdateSettings && zohoConfig.is_default !== 1 && (
                  <Button
                    size="sm"
                    variant="default"
                    disabled={actionId === zohoConfig.id}
                    onClick={() => handleSetDefaultProvider(zohoConfig)}
                    className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Use for OTP
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTestEmailTarget(zohoConfig)
                    setTestRecipientEmail(adminUser?.email || "")
                  }}
                  className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  Test
                </Button>
              </div>

              <div className="flex items-center gap-1">
                {canUpdateSettings ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={actionId === zohoConfig.id}
                      onClick={() => handleToggleEmailStatus(zohoConfig)}
                      className="h-8 px-2 text-xs gap-1 cursor-pointer"
                    >
                      <Power
                        className={`h-3.5 w-3.5 ${
                          zohoConfig.status === 1
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      />
                      {zohoConfig.status === 1 ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEmailModal("zoho", zohoConfig)}
                      className="h-8 px-2 text-xs gap-1 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    {canDeleteSettings && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteEmailTarget(zohoConfig)}
                        className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
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

        {/* 3. SMTP Server Card */}
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
                          Active OTP Sender
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
                          {smtpConfig.status === 1 ? "Enabled" : "Disabled"}
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
                      Add your custom SMTP Host, Port, Username, and Password to send OTPs via SMTP.
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
                    <span className="font-semibold text-foreground truncate max-w-[190px]">
                      {smtpConfig.from_name} &lt;{smtpConfig.from_email}&gt;
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Host &amp; Port</span>
                    <code className="font-mono bg-muted px-2 py-0.5 rounded border text-xs">
                      {smtpConfig.smtp_host}:{smtpConfig.smtp_port} (
                      {(smtpConfig.smtp_encryption || "tls").toUpperCase()})
                    </code>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Username</span>
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono bg-muted px-2 py-0.5 rounded border text-xs truncate max-w-[145px]">
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
            <div className="px-4 py-3 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                {canUpdateSettings && smtpConfig.is_default !== 1 && (
                  <Button
                    size="sm"
                    variant="default"
                    disabled={actionId === smtpConfig.id}
                    onClick={() => handleSetDefaultProvider(smtpConfig)}
                    className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Use for OTP
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTestEmailTarget(smtpConfig)
                    setTestRecipientEmail(adminUser?.email || "")
                  }}
                  className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  Test
                </Button>
              </div>

              <div className="flex items-center gap-1">
                {canUpdateSettings ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={actionId === smtpConfig.id}
                      onClick={() => handleToggleEmailStatus(smtpConfig)}
                      className="h-8 px-2 text-xs gap-1 cursor-pointer"
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
                      className="h-8 px-2 text-xs gap-1 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    {canDeleteSettings && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteEmailTarget(smtpConfig)}
                        className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
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

      {/* Add / Edit Email Provider (Mailjet, Zoho Mail, or SMTP) Dialog */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {provider === "mailjet" ? (
                <Mail className="h-5 w-5 text-primary" />
              ) : provider === "zoho" ? (
                <Globe className="h-5 w-5 text-primary" />
              ) : (
                <Server className="h-5 w-5 text-primary" />
              )}
              {emailFormMode === "add"
                ? `Configure ${PROVIDER_LABELS[provider]}`
                : `Edit ${PROVIDER_LABELS[provider]} Credentials`}
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
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleProviderSelectInModal("mailjet")}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      provider === "mailjet"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Mailjet
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProviderSelectInModal("zoho")}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      provider === "zoho"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Zoho Mail
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProviderSelectInModal("smtp")}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      provider === "smtp"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Server className="h-3.5 w-3.5" />
                    SMTP
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
                  placeholder="Enter sender display name"
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
                  placeholder="Enter sender email address"
                  value={fromEmail}
                  onChange={(e) => {
                    const val = e.target.value
                    setFromEmail(val)
                    if (provider === "zoho" && (!smtpUsername || smtpUsername === fromEmail)) {
                      setSmtpUsername(val)
                    }
                  }}
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
            ) : provider === "zoho" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="zoho_host" className="text-xs font-semibold">
                      Zoho SMTP Region Host <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={smtpHost || "smtp.zoho.in"}
                      onValueChange={(val) => {
                        if (val) setSmtpHost(val)
                      }}
                      items={ZOHO_HOST_OPTIONS}
                      itemToStringLabel={(val) =>
                        ZOHO_HOST_LABELS[String(val || "")] || String(val || "")
                      }
                    >
                      <SelectTrigger id="zoho_host" className="w-full h-9 text-xs font-mono">
                        <SelectValue placeholder="Select Zoho region host" />
                      </SelectTrigger>
                      <SelectContent>
                        {ZOHO_HOST_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="zoho_port" className="text-xs font-semibold">
                      Port &amp; Security <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={`${smtpPort || "465"}:${smtpEncryption || "ssl"}`}
                      onValueChange={(val) => {
                        if (!val) return
                        const [p, enc] = String(val).split(":")
                        setSmtpPort(p)
                        setSmtpEncryption((enc as SmtpEncryptionType) || "ssl")
                      }}
                      items={[
                        { value: "465:ssl", label: "465 (SSL)" },
                        { value: "587:tls", label: "587 (TLS)" },
                      ]}
                    >
                      <SelectTrigger id="zoho_port" className="w-full h-9 text-xs font-mono">
                        <SelectValue placeholder="Select port" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="465:ssl" label="465 (SSL)">
                          465 (SSL - Recommended)
                        </SelectItem>
                        <SelectItem value="587:tls" label="587 (TLS)">
                          587 (STARTTLS)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="zoho_username" className="text-xs font-semibold">
                    Zoho Mail Account / Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="zoho_username"
                    placeholder="Enter Zoho account email address"
                    value={smtpUsername}
                    onChange={(e) => setSmtpUsername(e.target.value)}
                    autoComplete="off"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="zoho_password" className="text-xs font-semibold">
                    Zoho Mail App Password{" "}
                    {emailFormMode === "add" ? (
                      <span className="text-destructive">*</span>
                    ) : (
                      <span className="text-muted-foreground font-normal">
                        (Leave blank to keep existing App Password)
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="zoho_password"
                      type={showEmailSecret ? "text" : "password"}
                      placeholder={
                        emailFormMode === "edit"
                          ? "•••••••••••••••• (Enter new App Password to replace)"
                          : "Enter Zoho Mail App Password"
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
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="smtp_host" className="text-xs font-semibold">
                      SMTP Host <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="smtp_host"
                      placeholder="Enter SMTP host"
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
                      placeholder="Enter port"
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
                    placeholder="Enter SMTP username"
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
                <Label className="text-xs font-semibold">Active OTP &amp; Email Provider</Label>
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
                    Yes (Use for OTP)
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
                    Enabled
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={emailStatus === 2 ? "default" : "outline"}
                    disabled={emailIsDefault === 1}
                    onClick={() => setEmailStatus(2)}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Disabled
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
              {testEmailTarget ? PROVIDER_LABELS[testEmailTarget.provider] : ""})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Verify your{" "}
              <strong>
                {testEmailTarget ? PROVIDER_LABELS[testEmailTarget.provider] : ""}
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
              {deleteEmailTarget ? PROVIDER_LABELS[deleteEmailTarget.provider] : ""}{" "}
              Configuration
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete the stored{" "}
              <strong>
                {deleteEmailTarget ? PROVIDER_LABELS[deleteEmailTarget.provider] : ""}
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
