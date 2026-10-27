import { useState, useEffect } from "react"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
import {
  fetchRazorpayCredentialsApi,
  saveRazorpayCredentialsApi,
  updateRazorpayCredentialsApi,
  deleteRazorpayCredentialsApi,
} from "@/services/settingsService"
import type { RazorpayCredentials } from "@/types/settings"
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
  ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"

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

export default function PaymentGatewaySettings() {
  const token = useAppSelector((state) => state.auth.token)
  const { can } = usePermission()

  // Permissions
  const canUpdateSettings =
    can("payment_gateway.update") ||
    can("payment_gateway", ["can_edit", "can_manage", "can_add"])
  const canDeleteSettings =
    can("payment_gateway", "can_delete") || canUpdateSettings

  // State
  const [credentials, setCredentials] = useState<RazorpayCredentials | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Add / Edit Modal state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"add" | "edit">("add")
  const [keyId, setKeyId] = useState("")
  const [keySecret, setKeySecret] = useState("")
  const [status, setStatus] = useState<number>(1)
  const [showTypedSecret, setShowTypedSecret] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete modal state
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

  useEffect(() => {
    loadCredentials(true)
  }, [token])

  const handleCopyKeyId = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKeyId(true)
    toast.success("Key ID copied to clipboard!")
    setTimeout(() => setCopiedKeyId(false), 2000)
  }

  const openAddModal = () => {
    if (!canUpdateSettings) {
      toast.error("You do not have permission to add payment gateway credentials.")
      return
    }
    setFormMode("add")
    setKeyId("")
    setKeySecret("")
    setStatus(1)
    setShowTypedSecret(false)
    setFormError(null)
    setIsFormOpen(true)
  }

  const openEditModal = () => {
    if (!canUpdateSettings) {
      toast.error("You do not have permission to edit payment gateway credentials.")
      return
    }
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
    if (!canUpdateSettings) {
      toast.error("Access denied. You do not have update permission.")
      return
    }
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
    if (!canUpdateSettings) {
      toast.error("Access denied. You do not have permission to update gateway status.")
      return
    }
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
    if (!canDeleteSettings) {
      toast.error("Access denied. You do not have permission to delete credentials.")
      return
    }
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

  const detectedMode = keyId.trim().startsWith("rzp_live_")
    ? "live"
    : keyId.trim().startsWith("rzp_test_")
      ? "test"
      : null

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
      {/* Read-Only Notice when user lacks update permission */}
      {!canUpdateSettings && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-medium">
          <ShieldAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Read-only access:</strong> You have permission to view Payment Gateway configuration. Updating or modifying Razorpay credentials requires update permission.
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
            <span className="text-foreground font-semibold">Payment Gateway</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Razorpay Payment Gateway
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure dynamic Razorpay payment credentials for school subscriptions and online transactions.
              </p>
            </div>
          </div>
        </div>

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

          {canUpdateSettings && !isLoading && !credentials && (
            <Button
              size="sm"
              onClick={openAddModal}
              className="gap-1.5 h-9 text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Add Razorpay Credentials
            </Button>
          )}

          {canUpdateSettings && !isLoading && credentials && (
            <Button
              size="sm"
              onClick={openEditModal}
              className="gap-1.5 h-9 text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Credentials
            </Button>
          )}
        </div>
      </div>

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

      {/* Razorpay Credentials Table */}
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
                Razorpay authentication, order creation, and payment verification dynamically use these credentials without requiring server restart.
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
                      {canUpdateSettings && (
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
                      onClick={() => canUpdateSettings && handleToggleStatus()}
                      disabled={!canUpdateSettings}
                      title={canUpdateSettings ? "Click to toggle status" : "Update permission required to change status"}
                      className={canUpdateSettings ? "cursor-pointer" : "cursor-not-allowed opacity-80"}
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
                      {canUpdateSettings ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={openEditModal}
                            className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
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
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Read-only</span>
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
                The secret key is encrypted at rest with AES-256 and never exposed in API responses or logs.
              </span>
            </div>
            {canUpdateSettings && (
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
                ? "Enter your Razorpay Key ID and Key Secret. The secret key is encrypted in the database and never exposed in plain text."
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
                Stored encrypted with AES-256 at rest and never returned in API responses.
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
                disabled={isSubmitting || !canUpdateSettings}
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
              disabled={isDeleting || !canDeleteSettings}
              className="cursor-pointer"
            >
              {isDeleting ? "Deleting..." : "Delete Credentials"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
