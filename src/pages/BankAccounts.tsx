import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import {
  fetchBankAccountsApi,
  deleteBankAccountApi,
  toggleBankAccountStatusApi,
  setDefaultBankAccountApi,
} from "@/services/bankAccountService"
import type { BankAccount } from "@/types/bankAccount"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Landmark,
  Plus,
  Search,
  RefreshCw,
  Copy,
  Check,
  Star,
  Pencil,
  Trash2,
  Eye,
  X,
} from "lucide-react"
import { toast } from "sonner"

export default function BankAccounts() {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")

  // Modal state for Delete confirmation
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Fetch accounts list
  const loadAccounts = async (showLoadingState = true) => {
    if (!token) return
    if (showLoadingState) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const data = await fetchBankAccountsApi(token, {
        search: debouncedSearch,
        status: statusFilter,
      })
      setAccounts(data)
    } catch (err: any) {
      toast.error(err.message || "Failed to load bank accounts.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadAccounts(true)
  }, [token, debouncedSearch, statusFilter])

  // Quick Copy Helper
  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success("Copied to clipboard!")
    setTimeout(() => {
      setCopiedKey(null)
    }, 2000)
  }

  // Open Delete Dialog
  const openDeleteDialog = (account: BankAccount) => {
    setSelectedAccount(account)
    setIsDeleteOpen(true)
  }

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!token || !selectedAccount) return
    setIsSubmitting(true)
    try {
      await deleteBankAccountApi(token, selectedAccount.id)
      toast.success("Bank account deleted successfully.")
      setIsDeleteOpen(false)
      loadAccounts(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to delete bank account.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle Status
  const handleToggleStatus = async (account: BankAccount) => {
    if (!token) return
    const nextStatus = account.status ? 0 : 1
    try {
      await toggleBankAccountStatusApi(token, account.id, nextStatus)
      toast.success(`Account marked as ${nextStatus === 1 ? "Active" : "Inactive"}.`)
      loadAccounts(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status.")
    }
  }

  // Set Default Primary
  const handleSetDefault = async (account: BankAccount) => {
    if (!token) return
    if (account.is_default) return
    try {
      await setDefaultBankAccountApi(token, account.id)
      toast.success(`"${account.account_title}" is now the primary default account!`)
      loadAccounts(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to set default account.")
    }
  }


  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Bank Account Master
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Manage company collection bank accounts, UPI identifiers, and remittance instructions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAccounts(false)}
            disabled={isRefreshing || isLoading}
            className="h-9 gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate("/bank-accounts/create")}
            className="h-9 gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Bank Account</span>
          </Button>
        </div>
      </div>


      {/* Filters Bar */}
      <Card className="border border-border/70 shadow-xs bg-card/60 backdrop-blur-xs">
        <CardContent className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by title, bank, IFSC, UPI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-muted-foreground font-medium hidden md:inline">Status:</span>
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  statusFilter === "active"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  statusFilter === "inactive"
                    ? "bg-muted text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="font-semibold text-xs py-3 w-[240px]">Account & Bank</TableHead>
                <TableHead className="font-semibold text-xs py-3">Beneficiary Name</TableHead>
                <TableHead className="font-semibold text-xs py-3">Account No. & Type</TableHead>
                <TableHead className="font-semibold text-xs py-3">IFSC & Branch</TableHead>
                <TableHead className="font-semibold text-xs py-3">UPI / SWIFT</TableHead>
                <TableHead className="font-semibold text-xs py-3 text-center">Status</TableHead>
                <TableHead className="font-semibold text-xs py-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Landmark className="h-8 w-8 text-muted-foreground/60" />
                      <p className="text-sm font-medium text-foreground">No bank accounts found</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {searchQuery
                          ? "Try adjusting your search query or filter."
                          : "Get started by adding your first official company collection bank account."}
                      </p>
                      {!searchQuery && (
                        <Button
                          size="sm"
                          onClick={() => navigate("/bank-accounts/create")}
                          className="mt-2 text-xs h-8 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add Bank Account
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => {
                  const isDefault = Boolean(account.is_default)
                  const isActive = Boolean(account.status)

                  return (
                    <TableRow
                      key={account.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Account Title & Bank */}
                      <TableCell className="py-3">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                              isDefault
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Landmark className="h-4 w-4" />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                onClick={() => navigate(`/bank-accounts/${account.id}`)}
                                className="font-semibold text-xs sm:text-sm text-foreground hover:text-primary cursor-pointer transition-colors"
                              >
                                {account.account_title}
                              </span>
                              {isDefault && (
                                <Badge
                                  variant="outline"
                                  className="h-4 px-1.5 text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1"
                                >
                                  <Star className="h-2.5 w-2.5 fill-amber-500" />
                                  Default
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                              {account.bank_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Beneficiary Name */}
                      <TableCell className="py-3 text-xs font-medium text-foreground">
                        {account.beneficiary_name}
                      </TableCell>

                      {/* Account Number & Type */}
                      <TableCell className="py-3">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold bg-muted/50 px-2 py-0.5 rounded border border-border/60">
                            <span>{account.account_number}</span>
                            <button
                              onClick={() => handleCopy(`acc_${account.id}`, account.account_number)}
                              title="Copy account number"
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              {copiedKey === `acc_${account.id}` ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground">
                              {account.account_type || "Current"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* IFSC & Branch */}
                      <TableCell className="py-3">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
                            <span>{account.ifsc_code}</span>
                            <button
                              onClick={() => handleCopy(`ifsc_${account.id}`, account.ifsc_code)}
                              title="Copy IFSC code"
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              {copiedKey === `ifsc_${account.id}` ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          {account.branch_name && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                              {account.branch_name}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* UPI / SWIFT */}
                      <TableCell className="py-3">
                        <div className="space-y-1 text-xs">
                          {account.upi_id ? (
                            <div className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                              <span className="truncate max-w-[130px]">{account.upi_id}</span>
                              <button
                                onClick={() => handleCopy(`upi_${account.id}`, account.upi_id!)}
                                title="Copy UPI ID"
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                {copiedKey === `upi_${account.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                          {account.swift_code && (
                            <p className="text-[10px] text-muted-foreground font-mono">
                              SWIFT: {account.swift_code}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(account)}
                          className="cursor-pointer focus:outline-none transition-transform active:scale-95"
                          title="Click to toggle active/inactive status"
                        >
                          {isActive ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30 text-[11px] font-medium">
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground hover:bg-muted text-[11px] font-medium"
                            >
                              Inactive
                            </Badge>
                          )}
                        </button>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSetDefault(account)}
                              title="Make Primary Default"
                              className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 cursor-pointer"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/bank-accounts/${account.id}`)}
                            title="View Full Details"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/bank-accounts/${account.id}/edit`)}
                            title="Edit Bank Account"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(account)}
                            title="Delete Bank Account"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              <span>Delete Bank Account?</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{selectedAccount?.account_title}</strong> (
              {selectedAccount?.account_number})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubmit}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {isSubmitting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
