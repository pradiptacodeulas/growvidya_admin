import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
import {
  fetchRazorpayCredentialsApi,
  saveRazorpayCredentialsApi,
  updateRazorpayCredentialsApi,
  deleteRazorpayCredentialsApi,
  fetchEmailCredentialsApi,
  saveEmailCredentialsApi,
  updateEmailCredentialsApi,
  setDefaultEmailProviderApi,
  toggleEmailCredentialStatusApi,
  deleteEmailCredentialsApi,
  sendTestEmailApi,
} from "@/services/settingsService"
import type {
  RazorpayCredentials,
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
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
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
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Lock,
  CreditCard,
  Clock,
  Wallet,
  Settings as SettingsIcon,
  ChevronRight,
  Mail,
  Server,
  Star,
  Send,
  Loader2,
  Power,
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

export default function Settings() {
  const location = useLocation()
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)
  const adminUser = useAppSelector((state) => state.auth.user)
  const { can } = usePermission()
  const canAddSettings = can("settings", "can_add")
  const canEditSettings = can("settings", "can_edit")
  const canDeleteSettings = can("settings", "can_delete")
  const canManageSettings = can("settings", "can_manage") || canEditSettings

  const isEmailRoute =
    location.pathname.startsWith("/settings/email") ||
    location.pathname.startsWith("/settings/smtp")

  const [activeSettingsMenu, setActiveSettingsMenu] = useState<
    "payment_gateway" | "email_settings"
  >(isEmailRoute ? "email_settings" : "payment_gateway")

  useEffect(() => {
    setActiveSettingsMenu(isEmailRoute ? "email_settings" : "payment_gateway")
  }, [isEmailRoute])

  const handleSwitchTab = (tab: "payment_gateway" | "email_settings") => {
    setActiveSettingsMenu(tab)
    navigate(tab === "email_settings" ? "/settings/email" : "/settings/payment-gateway")
  }

  // ==========================================
  // 1. RAZORPAY STATE & HANDLERS
  // ==========================================
  const [credentials, setCredentials] = useState<RazorpayCredentials | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"add" | "edit">("add")
  const [keyId, setKeyId] = useState("")
  const [keySecret, setKeySecret] = useState("")
  const [status, setStatus] = useState<number>(1)
  const [showTypedSecret, setShowTypedSecret] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedKeyId, setCopiedKeyId] = useState(false)

  const loadCredentials = async (showSkeleton = true) => {
    if (!token) return
    if (showSkeleton) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const data = await fetchRazorpayCredentialsApi(token)
      setCredentials(data)
    } catch (err: any) {
      toast.error(err.message || "Failed to load Razorpay settings.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // ==========================================
  // 2. EMAIL (MAILJET & SMTP) STATE & HANDLERS
  // ==========================================
  const [emailCredentials, setEmailCredentials] = useState<EmailCredential[]>([])
  const [isEmailLoading, setIsEmailLoading] = useState(true)
  const [isEmailRefreshing, setIsEmailRefreshing] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  // Email Add/Edit Modal State
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

  // Email Delete Modal State
  const [deleteEmailTarget, setDeleteEmailTarget] = useState<EmailCredential | null>(null)
  const [isEmailDeleting, setIsEmailDeleting] = useState(false)

  // Send Test Email Modal State
  const [testEmailTarget, setTestEmailTarget] = useState<EmailCredential | null>(null)
  const [testRecipientEmail, setTestRecipientEmail] = useState("")
  const [isSendingTest, setIsSendingTest] = useState(false)

  const loadEmailCredentials = async (showSkeleton = true) => {
    if (!token) return
    if (showSkeleton) setIsEmailLoading(true)
    else setIsEmailRefreshing(true)

    try {
      const data = await fetchEmailCredentialsApi(token)
      setEmailCredentials(data || [])
    } catch (err: any) {
      toast.error(err.message || "Failed to load email settings.")
    } finally {
      setIsEmailLoading(false)
      setIsEmailRefreshing(false)
    }
  }

  useEffect(() => {
    loadCredentials(true)
    loadEmailCredentials(true)
  }, [token])

  const handleCopyKeyId = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKeyId(true)
    toast.success("Key ID copied to clipboard!")
    setTimeout(() => setCopiedKeyId(false), 2000)
  }

  const handleCopyValue = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    toast.success(`${label} copied to clipboard!`)
    setTimeout(() => setCopiedText(null), 2000)
  }

  // Razorpay Modal Actions
  const openAddModal = () => {
    setFormMode("add")
    setKeyId("")
    setKeySecret("")
    setStatus(1)
    setShowTypedSecret(false)
    setFormError(null)
    setIsFormOpen(true)
  }

  const openEditModal = () => {
    if (!credentials) return
    setFormMode("edit")
    setKeyId(credentials.key_id || "")
    setKeySecret("")
    setStatus(credentials.status ?? 1)
    setShowTypedSecret(false)
    setFormError(null)
    setIsFormOpen(true)
  }

  const validateForm = (): boolean => {
    const trimmedKeyId = keyId.trim()
    const trimmedSecret = keySecret.trim()

    if (!trimmedKeyId) {
      setFormError("Razorpay Key ID is required.")
      return false
    }

    if (!/^rzp_(test|live)_[A-Za-z0-9]{8,64}$/.test(trimmedKeyId)) {
      setFormError(
        'Invalid Key ID format. Must start with "rzp_test_" or "rzp_live_" followed by alphanumeric characters.'
      )
      return false
    }

    if (formMode === "add" && !trimmedSecret) {
      setFormError("Razorpay Key Secret is required.")
      return false
    }

    if (trimmedSecret) {
      if (trimmedSecret.length < 8 || trimmedSecret.length > 128 || /\s/.test(trimmedSecret)) {
        setFormError("Key Secret must be between 8 and 128 characters without spaces.")
        return false
      }
      if (trimmedSecret === trimmedKeyId) {
        setFormError("Key Secret cannot be identical to Key ID.")
        return false
      }
    }

    setFormError(null)
    return true
  }

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const payload: {
        key_id: string
        key_secret?: string
        status: number
      } = {
        key_id: keyId.trim(),
        status,
      }

      if (keySecret.trim() !== "") {
        payload.key_secret = keySecret.trim()
      }

      let saved: RazorpayCredentials
      if (formMode === "add" || !credentials) {
        saved = await saveRazorpayCredentialsApi(token, payload)
        toast.success("Razorpay credentials added successfully.")
      } else {
        saved = await updateRazorpayCredentialsApi(token, credentials.id, payload)
        toast.success("Razorpay credentials updated successfully.")
      }

      setCredentials(saved)
      setKeySecret("")
      setIsFormOpen(false)
    } catch (err: any) {
      const msg = err.message || "Failed to save Razorpay credentials."
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!token || !credentials) return
    const nextStatus = credentials.status === 1 ? 0 : 1
    try {
      const updated = await updateRazorpayCredentialsApi(token, credentials.id, {
        key_id: credentials.key_id,
        status: nextStatus,
      })
      setCredentials(updated)
      toast.success(
        `Razorpay gateway marked as ${nextStatus === 1 ? "Active" : "Inactive"}.`
      )
    } catch (err: any) {
      toast.error(err.message || "Failed to update credential status.")
    }
  }

  const handleDeleteConfirm = async () => {
    if (!token || !credentials) return
    setIsDeleting(true)
    try {
      await deleteRazorpayCredentialsApi(token, credentials.id)
      setCredentials(null)
      setIsDeleteOpen(false)
      toast.success("Razorpay credentials deleted successfully.")
    } catch (err: any) {
      toast.error(err.message || "Failed to delete Razorpay credentials.")
    } finally {
      setIsDeleting(false)
    }
  }

  // Email (Mailjet & SMTP) Modal & Action Handlers
  const mailjetConfig = emailCredentials.find((c) => c.provider === "mailjet") || null
  const smtpConfig = emailCredentials.find((c) => c.provider === "smtp") || null
  const defaultEmailConfig =
    emailCredentials.find((c) => c.is_default === 1 && c.status === 1) || null

  const openEmailModal = (targetProvider: EmailProviderType, existing?: EmailCredential | null) => {
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
      await loadEmailCredentials(false)
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
    setActionId(cred.id)
    try {
      await setDefaultEmailProviderApi(token, cred.id)
      toast.success(
        `${cred.provider === "mailjet" ? "Mailjet" : "SMTP"} is now set as the Default email provider.`
      )
      await loadEmailCredentials(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to set default email provider.")
    } finally {
      setActionId(null)
    }
  }

  const handleToggleEmailStatus = async (cred: EmailCredential) => {
    if (!token || actionId === cred.id) return
    const nextStatus: 0 | 1 = cred.status === 1 ? 0 : 1
    setActionId(cred.id)
    try {
      await toggleEmailCredentialStatusApi(token, cred.id, nextStatus)
      toast.success(
        `${cred.provider === "mailjet" ? "Mailjet" : "SMTP"} marked as ${
          nextStatus === 1 ? "Active" : "Inactive"
        }.`
      )
      await loadEmailCredentials(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to update provider status.")
    } finally {
      setActionId(null)
    }
  }

  const handleConfirmEmailDelete = async () => {
    if (!token || !deleteEmailTarget) return
    setIsEmailDeleting(true)
    try {
      await deleteEmailCredentialsApi(token, deleteEmailTarget.id)
      toast.success(
        `${deleteEmailTarget.provider === "mailjet" ? "Mailjet" : "SMTP"} configuration deleted.`
      )
      setDeleteEmailTarget(null)
      await loadEmailCredentials(false)
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

  const detectedMode = keyId.trim().startsWith("rzp_live_")
    ? "live"
    : keyId.trim().startsWith("rzp_test_")
      ? "test"
      : null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Page Header with Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
            <SettingsIcon className="h-3.5 w-3.5" />
            <span>Settings</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-semibold">
              {activeSettingsMenu === "payment_gateway"
                ? "Payment Gateway"
                : "Email & SMTP"}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              {activeSettingsMenu === "payment_gateway" ? (
                <Wallet className="h-6 w-6" />
              ) : (
                <Mail className="h-6 w-6" />
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {activeSettingsMenu === "payment_gateway"
                  ? "Razorpay Payment Gateway"
                  : "Email Delivery Settings (Mailjet & SMTP)"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeSettingsMenu === "payment_gateway"
                  ? "Configure dynamic Razorpay payment credentials for school subscriptions."
                  : "Configure Mailjet API and SMTP servers dynamically, and select one as the active Default mailer."}
              </p>
            </div>
          </div>
        </div>

        {activeSettingsMenu === "payment_gateway" ? (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadCredentials(false)}
              disabled={isLoading || isRefreshing}
              className="gap-2 h-9 text-xs font-semibold cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            {!isLoading && !credentials && canAddSettings ? (
              <Button
                size="sm"
                onClick={openAddModal}
                className="gap-1.5 h-9 text-xs font-semibold cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Add Razorpay Credentials
              </Button>
            ) : !isLoading && credentials && canEditSettings ? (
              <Button
                size="sm"
                onClick={openEditModal}
                className="gap-1.5 h-9 text-xs font-semibold cursor-pointer shadow-xs"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Credentials
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadEmailCredentials(false)}
              disabled={isEmailLoading || isEmailRefreshing}
              className="gap-2 h-9 text-xs font-semibold cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isEmailRefreshing ? "animate-spin" : ""}`}
              />
              {isEmailRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            {canAddSettings && !mailjetConfig && (
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
            {canAddSettings && !smtpConfig && (
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
        )}
      </div>

      {/* Settings Navigation Menu Bar */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => handleSwitchTab("payment_gateway")}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeSettingsMenu === "payment_gateway"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          <span>Payment Gateway (Razorpay)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab("email_settings")}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeSettingsMenu === "email_settings"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>Email & SMTP (Mailjet / SMTP)</span>
        </button>
      </div>

      {activeSettingsMenu === "payment_gateway" ? (
        <>
          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border border-border/80 shadow-xs">
              <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Gateway Status</p>
                  <div className="text-lg font-bold tracking-tight">
                    {isLoading ? (
                      <Skeleton className="h-6 w-24" />
                    ) : !credentials ? (
                      <span className="text-amber-600 dark:text-amber-400">Not Configured</span>
                    ) : credentials.status === 1 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Active & Enabled</span>
                    ) : (
                      <span className="text-muted-foreground">Inactive</span>
                    )}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <CreditCard className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs">
              <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Environment Mode</p>
                  <div className="text-lg font-bold tracking-tight">
                    {isLoading ? (
                      <Skeleton className="h-6 w-24" />
                    ) : !credentials ? (
                      <span className="text-muted-foreground">—</span>
                    ) : credentials.mode === "live" ? (
                      <span className="text-blue-600 dark:text-blue-400">Live Mode</span>
                    ) : (
                      <span className="text-purple-600 dark:text-purple-400">Test Mode</span>
                    )}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <KeyRound className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 shadow-xs">
              <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Secret Key Security</p>
                  <div className="text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    {isLoading ? (
                      <Skeleton className="h-6 w-28" />
                    ) : credentials?.has_key_secret ? (
                      "AES-256 Encrypted"
                    ) : (
                      <span className="text-muted-foreground">No Secret Stored</span>
                    )}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Razorpay Credentials Table & Module Card */}
          <Card className="border border-border/80 shadow-xs overflow-hidden">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <span>Razorpay Credentials Configuration</span>
                    {!isLoading && credentials && (
                      <Badge
                        variant={credentials.status === 1 ? "default" : "secondary"}
                        className={
                          credentials.status === 1
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            : ""
                        }
                      >
                        {credentials.status === 1 ? "Active" : "Inactive"}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs sm:text-sm">
                    All Razorpay authentication, order creation, and payment verification requests dynamically use these database credentials without requiring a server restart.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-semibold text-xs py-3">Gateway</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Environment</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Key ID</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Key Secret</TableHead>
                    <TableHead className="font-semibold text-xs py-3 text-center">Status</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Last Updated</TableHead>
                    <TableHead className="font-semibold text-xs py-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-44" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ) : !credentials ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 py-4">
                          <div className="h-11 w-11 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                            <KeyRound className="h-5 w-5" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            No Razorpay Credentials Configured
                          </p>
                          <p className="text-xs text-muted-foreground max-w-md">
                            Online Razorpay payment processing is disabled until valid credentials are saved.
                          </p>
                          {canAddSettings && (
                            <Button
                              size="sm"
                              onClick={openAddModal}
                              className="mt-2 gap-1.5 text-xs h-8 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Razorpay Credentials
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow className="hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3.5 font-semibold text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <span>Razorpay</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <Badge
                          variant="outline"
                          className={
                            credentials.mode === "live"
                              ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs"
                              : "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs"
                          }
                        >
                          {credentials.mode === "live" ? "Live Mode" : "Test Mode"}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs sm:text-sm font-semibold bg-muted px-2.5 py-1 rounded border">
                            {credentials.key_id}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyKeyId(credentials.key_id)}
                            className="h-7 w-7 p-0 cursor-pointer"
                            title="Copy Key ID"
                          >
                            {copiedKeyId ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs sm:text-sm text-muted-foreground bg-muted/60 px-2.5 py-1 rounded border select-none">
                            {credentials.key_secret_masked || "••••••••••••••••"}
                          </code>
                          <Badge
                            variant="outline"
                            className="text-[10px] gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          >
                            <Lock className="h-2.5 w-2.5" />
                            Hidden
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => canEditSettings && handleToggleStatus()}
                          disabled={!canEditSettings}
                          title={canEditSettings ? "Click to toggle status" : undefined}
                          className={canEditSettings ? "cursor-pointer" : "cursor-default"}
                        >
                          <Badge
                            variant={credentials.status === 1 ? "default" : "secondary"}
                            className={
                              credentials.status === 1
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                                : "hover:bg-muted"
                            }
                          >
                            {credentials.status === 1 ? "Active" : "Inactive"}
                          </Badge>
                        </button>
                      </TableCell>

                      <TableCell className="py-3.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{formatDate(credentials.updated_at || credentials.created_on)}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEditSettings && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={openEditModal}
                              className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          )}
                          {canDeleteSettings && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsDeleteOpen(true)}
                              className="h-8 px-2.5 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {credentials && (
              <CardContent className="border-t bg-muted/15 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    The secret key is encrypted at rest and never exposed in API responses or frontend code.
                  </span>
                </div>
                {canEditSettings && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleStatus}
                    className="h-7 text-xs cursor-pointer self-start sm:self-auto"
                  >
                    {credentials.status === 1 ? "Disable Gateway" : "Enable Gateway"}
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        </>
      ) : (
        /* ==========================================
           EMAIL & SMTP SETTINGS (MAILJET & SMTP)
           ========================================== */
        <div className="space-y-6">
          {/* Summary Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    Credential Encryption
                  </p>
                  <div className="text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    {isEmailLoading ? (
                      <Skeleton className="h-6 w-28" />
                    ) : emailCredentials.length > 0 ? (
                      "AES-256 Encrypted"
                    ) : (
                      <span className="text-muted-foreground">No Credentials</span>
                    )}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-5" />
                </div>
              </CardContent>
            </Card>
          </div>

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
                        <CardDescription className="text-xs mt-0.5">
                          High-deliverability transactional email delivery via Mailjet v3.1 REST API.
                        </CardDescription>
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
                      {canAddSettings && (
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
                    {canManageSettings && mailjetConfig.is_default !== 1 && (
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
                    {canManageSettings && (
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
                    )}
                    {canEditSettings && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEmailModal("mailjet", mailjetConfig)}
                        className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
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
                        <CardDescription className="text-xs mt-0.5">
                          Standard SMTP relay (Gmail, Zoho, Hostinger, Amazon SES, or custom SMTP).
                        </CardDescription>
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
                      {canAddSettings && (
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
                    {canManageSettings && smtpConfig.is_default !== 1 && (
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
                    {canManageSettings && (
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
                    )}
                    {canEditSettings && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEmailModal("smtp", smtpConfig)}
                        className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
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
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Add / Edit Razorpay Credentials Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              {formMode === "add"
                ? "Add Razorpay Credentials"
                : "Edit Razorpay Credentials"}
            </DialogTitle>
            <DialogDescription>
              {formMode === "add"
                ? "Enter your Razorpay Key ID and Key Secret. The secret key will be encrypted in the database and never exposed in plain text."
                : "Update your Razorpay Key ID or enter a new Key Secret. Leave Key Secret blank to keep the existing secret."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSubmit} className="space-y-4 py-2">
            {formError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="razorpay_key_id" className="text-xs font-semibold">
                  Key ID <span className="text-destructive">*</span>
                </Label>
                {detectedMode && (
                  <Badge
                    variant="outline"
                    className={
                      detectedMode === "live"
                        ? "text-[10px] h-5 border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                        : "text-[10px] h-5 border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-400"
                    }
                  >
                    {detectedMode === "live" ? "Live Key" : "Test Key"}
                  </Badge>
                )}
              </div>
              <Input
                id="razorpay_key_id"
                type="text"
                placeholder="rzp_test_xxxxxxxxxxxxxx"
                value={keyId}
                onChange={(e) => {
                  setKeyId(e.target.value)
                  if (formError) setFormError(null)
                }}
                autoComplete="off"
                className="font-mono text-sm"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Must start with <code className="font-mono">rzp_test_</code> or <code className="font-mono">rzp_live_</code>.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="razorpay_key_secret" className="text-xs font-semibold">
                Key Secret{" "}
                {formMode === "add" ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-muted-foreground font-normal">
                    (Leave blank to keep existing secret)
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="razorpay_key_secret"
                  type={showTypedSecret ? "text" : "password"}
                  placeholder={
                    formMode === "edit"
                      ? "•••••••••••••••• (Enter new secret to replace)"
                      : "Enter Razorpay Key Secret"
                  }
                  value={keySecret}
                  onChange={(e) => {
                    setKeySecret(e.target.value)
                    if (formError) setFormError(null)
                  }}
                  autoComplete="new-password"
                  className="font-mono text-sm pr-9"
                  required={formMode === "add"}
                />
                <button
                  type="button"
                  onClick={() => setShowTypedSecret((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  tabIndex={-1}
                  title={showTypedSecret ? "Hide input" : "Show input"}
                >
                  {showTypedSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3 shrink-0" />
                Stored encrypted at rest and never returned in API responses.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="razorpay_status" className="text-xs font-semibold">
                Gateway Status
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={status === 1 ? "default" : "outline"}
                  onClick={() => setStatus(1)}
                  className="h-8 text-xs cursor-pointer"
                >
                  Active (Enabled)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={status === 0 ? "default" : "outline"}
                  onClick={() => setStatus(0)}
                  className="h-8 text-xs cursor-pointer"
                >
                  Inactive (Disabled)
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                {isSubmitting
                  ? "Saving..."
                  : formMode === "add"
                    ? "Save Credentials"
                    : "Update Credentials"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Razorpay Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Razorpay Credentials
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the stored Razorpay credentials? Online subscription payments via Razorpay will immediately stop working until new credentials are added.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              {isDeleting ? "Deleting..." : "Delete Credentials"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <DialogDescription className="text-xs">
              {provider === "mailjet"
                ? "Enter your Mailjet API Key, Secret Key, and verified sender details. The Secret Key is encrypted with AES-256-GCM."
                : "Enter your SMTP server host, port, encryption, and login credentials. Your SMTP password is encrypted with AES-256-GCM."}
            </DialogDescription>
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
                disabled={isEmailSubmitting}
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
              disabled={isEmailDeleting}
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
