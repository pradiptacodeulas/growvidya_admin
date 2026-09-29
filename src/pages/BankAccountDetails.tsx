import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router"
import { useAppSelector } from "@/store/store"
import {
  fetchBankAccountByIdApi,
  setDefaultBankAccountApi,
  toggleBankAccountStatusApi,
  deleteBankAccountApi,
} from "@/services/bankAccountService"
import { getFullImageUrl } from "@/config/api"
import type { BankAccount } from "@/types/bankAccount"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  ArrowLeft,
  ChevronRight,
  Landmark,
  Copy,
  Check,
  Star,
  Pencil,
  Trash2,
  QrCode,
  FileText,
  AlertCircle,
  RefreshCw,
  Clock,
} from "lucide-react"
import { toast } from "sonner"

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr.replace(" ", "T"))
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

export default function BankAccountDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)

  const [account, setAccount] = useState<BankAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadAccount = async (showLoading = true) => {
    if (!token || !id) return
    if (showLoading) setIsLoading(true)
    else setIsRefreshing(true)
    setError(null)

    try {
      const data = await fetchBankAccountByIdApi(token, id)
      setAccount(data)
    } catch (err: any) {
      setError(err.message || "Failed to load bank account details.")
      toast.error(err.message || "Failed to load bank account.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadAccount(true)
  }, [token, id])

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success("Copied to clipboard!")
    setTimeout(() => {
      setCopiedKey(null)
    }, 2000)
  }

  const handleSetDefault = async () => {
    if (!token || !account) return
    try {
      const updated = await setDefaultBankAccountApi(token, account.id)
      setAccount(updated)
      toast.success(`"${updated.account_title}" is now marked as the primary default account!`)
    } catch (err: any) {
      toast.error(err.message || "Failed to set default account.")
    }
  }

  const handleToggleStatus = async () => {
    if (!token || !account) return
    const nextStatus = account.status ? 0 : 1
    try {
      const updated = await toggleBankAccountStatusApi(token, account.id, nextStatus)
      setAccount(updated)
      toast.success(`Account marked as ${nextStatus === 1 ? "Active" : "Inactive"}.`)
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.")
    }
  }

  const handleDelete = async () => {
    if (!token || !account) return
    setIsDeleting(true)
    try {
      await deleteBankAccountApi(token, account.id)
      toast.success("Bank account deleted successfully.")
      navigate("/bank-accounts")
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account.")
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (error || !account) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate("/bank-accounts")}
            className="h-9 w-9 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Bank Account Details</h1>
        </div>

        <Card className="border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <p className="text-base font-semibold text-destructive">
            {error || "Bank account record not found."}
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/bank-accounts")}
            className="cursor-pointer"
          >
            Back to Bank Accounts
          </Button>
        </Card>
      </div>
    )
  }

  const isDefault = Boolean(account.is_default)
  const isActive = Boolean(account.status)
  const qrUrl = getFullImageUrl(account.qr_code_image)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumbs & Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/bank-accounts" className="hover:text-foreground transition-colors font-medium">
          Bank Accounts
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-semibold truncate max-w-[200px] sm:max-w-none">
          {account.account_title}
        </span>
      </div>

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
        <div className="flex items-start sm:items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate("/bank-accounts")}
            className="h-9 w-9 cursor-pointer shrink-0 mt-0.5 sm:mt-0"
            title="Back to list"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {account.account_title}
              </h1>
              {isDefault && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-xs font-semibold">
                  <Star className="h-3 w-3 fill-amber-500" />
                  Primary Default
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`text-xs font-medium ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    : "text-muted-foreground"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span>{account.bank_name}</span>
              <span>•</span>
              <span>{account.account_type || "Current Account"}</span>
              {account.branch_name && (
                <>
                  <span>•</span>
                  <span>{account.branch_name}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAccount(false)}
            disabled={isRefreshing}
            className="h-9 text-xs cursor-pointer gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          {!isDefault && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetDefault}
              className="h-9 text-xs cursor-pointer gap-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-amber-500/30"
            >
              <Star className="h-3.5 w-3.5" />
              <span>Set as Default</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            className="h-9 text-xs cursor-pointer gap-1.5"
          >
            {isActive ? "Deactivate" : "Activate"}
          </Button>

          <Button
            size="sm"
            onClick={() => navigate(`/bank-accounts/${account.id}/edit`)}
            className="h-9 text-xs cursor-pointer gap-1.5 shadow-sm"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit Account</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDeleteOpen(true)}
            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
            title="Delete Account"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Grid: Core Details + Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Bank Account & Beneficiary Credentials (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Landmark className="h-4 w-4 text-primary" />
                <span>Bank Account Credentials</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Official banking coordinates for remittance verification and electronic clearance.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Bank Name</span>
                  <p className="text-base font-bold text-foreground">{account.bank_name}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Account Type</span>
                  <div>
                    <Badge variant="outline" className="font-semibold text-xs">
                      {account.account_type || "Current"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Account Number</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-foreground tracking-wider bg-muted/60 px-2.5 py-1 rounded-md border border-border">
                      {account.account_number}
                    </span>
                    <button
                      onClick={() => handleCopy("detail_acc", account.account_number)}
                      title="Copy account number"
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      {copiedKey === "detail_acc" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">IFSC Code</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-foreground tracking-wider bg-muted/60 px-2.5 py-1 rounded-md border border-border">
                      {account.ifsc_code}
                    </span>
                    <button
                      onClick={() => handleCopy("detail_ifsc", account.ifsc_code)}
                      title="Copy IFSC code"
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      {copiedKey === "detail_ifsc" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <span className="text-xs text-muted-foreground font-medium">Beneficiary / Legal Entity Name</span>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{account.beneficiary_name}</p>
                    <button
                      onClick={() => handleCopy("detail_bene", account.beneficiary_name)}
                      title="Copy Beneficiary Name"
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {copiedKey === "detail_bene" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Branch Location</span>
                  <p className="text-xs font-medium text-foreground">{account.branch_name || "—"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">SWIFT / BIC Code</span>
                  <p className="text-xs font-mono font-medium text-foreground">{account.swift_code || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transfer Remarks & Instructions Card */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                <span>School Transfer Instructions & Remarks</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Visible instructions provided to schools when paying via NEFT, RTGS, IMPS, or offline deposit.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {account.instructions ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4" />
                    <span>Important Remittance Guidance</span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {account.instructions}
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No specific instructions or remarks provided for this account.</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate(`/bank-accounts/${account.id}/edit`)}
                    className="text-xs mt-1"
                  >
                    Add Instructions
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: UPI & Digital Payment + Metadata (1 Col) */}
        <div className="space-y-6">
          {/* UPI & Digital Payment */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <QrCode className="h-4 w-4 text-primary" />
                <span>UPI & Digital Payment</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">UPI VPA Handle</span>
                {account.upi_id ? (
                  <div className="flex items-center justify-between p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 truncate">
                      {account.upi_id}
                    </span>
                    <button
                      onClick={() => handleCopy("detail_upi", account.upi_id!)}
                      title="Copy UPI ID"
                      className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {copiedKey === "detail_upi" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No UPI VPA configured.</p>
                )}
              </div>

              {/* QR Code Section */}
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground font-medium">Payment QR Code</span>
                {qrUrl ? (
                  <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl border border-border">
                    <img
                      src={qrUrl}
                      alt="UPI QR Code"
                      className="w-36 h-36 object-contain rounded-lg shadow-xs bg-white p-2"
                    />
                    <p className="text-[11px] text-muted-foreground mt-2">Scan to pay via any UPI app</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 bg-muted/20 rounded-xl border border-dashed border-border text-center text-muted-foreground">
                    <QrCode className="h-10 w-10 opacity-40 mb-1" />
                    <p className="text-xs">No QR code uploaded</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Audit & Metadata */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>Account Audit Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">System ID:</span>
                <span className="font-mono font-bold text-foreground">#{account.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Primary Default:</span>
                <span className="font-semibold text-foreground">{isDefault ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current Status:</span>
                <span className="font-semibold text-foreground">{isActive ? "Active" : "Inactive"}</span>
              </div>
              <div className="h-px bg-border/60" />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Created:</span>
                <span className="text-foreground">{formatDate(account.created_at)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="text-foreground">{formatDate(account.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              <span>Delete Bank Account?</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground">{account.account_title}</strong> (
              {account.account_number})? This action cannot be reversed.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
