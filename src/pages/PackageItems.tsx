import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router"
import { useAppSelector } from "@/store/store"
import { toast } from "sonner"
import {
  fetchPackageByIdApi,
  fetchPackageItemsApi,
  addItemToPackageApi,
  deleteItemApi,
  toggleItemStatusApi,
} from "@/services/subscriptionService"
import type {
  SubscriptionPackage,
  SubscriptionItem,
} from "@/types/subscription"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  TableRow,
  TableHead,
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
  ArrowLeft,
  Layers,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  X,
} from "lucide-react"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "_")
    .replace(/^-+|-+$/g, "")
}

export default function PackageItems() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)

  const [pkg, setPkg] = useState<SubscriptionPackage | null>(null)
  const [items, setItems] = useState<SubscriptionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Add Feature Inline Form State
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [itemName, setItemName] = useState("")
  const [itemCode, setItemCode] = useState("")
  const [itemDescription, setItemDescription] = useState("")
  const [isSavingNewItem, setIsSavingNewItem] = useState(false)

  // Status toggling & Deleting trackers
  const [togglingItemId, setTogglingItemId] = useState<number | null>(null)
  const [itemToDelete, setItemToDelete] = useState<SubscriptionItem | null>(null)
  const [isDeletingItem, setIsDeletingItem] = useState(false)

  const loadData = async () => {
    if (!token || !id) return
    setIsLoading(true)
    try {
      const packageId = Number(id)
      const [packageData, itemsData] = await Promise.all([
        fetchPackageByIdApi(token, packageId),
        fetchPackageItemsApi(token, packageId),
      ])
      setPkg(packageData)
      setItems(itemsData || [])
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || "Failed to load package features.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id, token])

  const handleNameChange = (val: string) => {
    setItemName(val)
    if (!itemCode || itemCode === slugify(itemName).toUpperCase()) {
      setItemCode(slugify(val).toUpperCase())
    }
  }

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !pkg) return

    if (!itemName.trim()) {
      toast.error("Feature name is required.")
      return
    }

    setIsSavingNewItem(true)

    try {
      const created = await addItemToPackageApi(token, pkg.id, {
        item_name: itemName.trim(),
        item_code: itemCode.trim() || slugify(itemName).toUpperCase(),
        description: itemDescription.trim() || null,
        status: 1,
      })

      setItems((prev) => [...prev, created])
      setIsAddingItem(false)
      setItemName("")
      setItemCode("")
      setItemDescription("")
      toast.success(`Feature "${created.item_name}" added successfully.`)
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || "Failed to add feature.")
    } finally {
      setIsSavingNewItem(false)
    }
  }

  const handleToggleStatus = async (item: SubscriptionItem) => {
    if (!token || !item.id) return
    const newStatus = item.status === 1 ? 0 : 1
    setTogglingItemId(item.id)

    try {
      await toggleItemStatusApi(token, item.id, newStatus)
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: newStatus } : it))
      )
      toast.success(
        `"${item.item_name}" ${newStatus === 1 ? "activated" : "deactivated"}.`
      )
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || "Failed to update feature status.")
    } finally {
      setTogglingItemId(null)
    }
  }

  const handleDeleteItem = async () => {
    if (!token || !itemToDelete || !itemToDelete.id) return
    setIsDeletingItem(true)

    try {
      await deleteItemApi(token, itemToDelete.id)
      setItems((prev) => prev.filter((it) => it.id !== itemToDelete.id))
      toast.success(`"${itemToDelete.item_name}" removed successfully.`)
      setItemToDelete(null)
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || "Failed to delete feature.")
    } finally {
      setIsDeletingItem(false)
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/plans-pricing")}
            className="gap-2 h-9 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Plans
          </Button>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {pkg ? `${pkg.plan_name} — Included Features` : "Included Features"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage the dynamic list of features and modules bundled in this plan.
            </p>
          </div>
        </div>

        {/* Add Feature Button */}
        {!isAddingItem && !isLoading && (
          <Button
            size="sm"
            onClick={() => setIsAddingItem(true)}
            className="gap-2 h-9 text-xs font-semibold cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Add Feature
          </Button>
        )}
      </div>

      {/* Package Summary Card */}
      {isLoading ? (
        <Card className="p-5">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </Card>
      ) : pkg ? (
        <Card className="border-border/70 shadow-xs bg-muted/15">
          <CardContent className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-muted-foreground block text-[11px]">Plan Code</span>
                <span className="font-mono font-semibold text-foreground text-xs">{pkg.plan_code}</span>
              </div>
              <div className="h-8 w-px bg-border/60 hidden sm:block" />
              <div>
                <span className="text-muted-foreground block text-[11px]">Billing Cycle</span>
                <Badge variant="secondary" className="capitalize text-[11px] font-medium">
                  {pkg.billing_cycle}
                </Badge>
              </div>
              <div className="h-8 w-px bg-border/60 hidden sm:block" />
              <div>
                <span className="text-muted-foreground block text-[11px]">Base Price</span>
                <span className="font-bold text-foreground text-xs">
                  {Number(pkg.price) === 0 ? "Free" : `₹${Number(pkg.price).toLocaleString("en-IN")}`}
                </span>
              </div>
              <div className="h-8 w-px bg-border/60 hidden sm:block" />
              <div>
                <span className="text-muted-foreground block text-[11px]">Student Capacity</span>
                <span className="font-medium text-foreground text-xs">
                  {pkg.max_students === 0 ? "Unlimited" : `${pkg.max_students} students`}
                </span>
              </div>
              <div className="h-8 w-px bg-border/60 hidden sm:block" />
              <div>
                <span className="text-muted-foreground block text-[11px]">Free Trial</span>
                <span className="font-medium text-foreground text-xs">
                  {pkg.free_trial_days && pkg.free_trial_days > 0 ? `${pkg.free_trial_days} days` : "No trial"}
                </span>
              </div>
            </div>

            <Badge variant={pkg.status === 1 ? "default" : "secondary"} className="text-xs">
              {pkg.status === 1 ? "Active Plan" : "Inactive Plan"}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      {/* Add New Feature Form Card */}
      {isAddingItem && (
        <Card className="border-primary/40 bg-primary/5 shadow-sm animate-in fade-in duration-200">
          <CardHeader className="p-5 pb-3 border-b border-primary/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-primary">
                  New Feature Configuration
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Attach an included module or capability to {pkg?.plan_name}.
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAddingItem(false)}
              disabled={isSavingNewItem}
              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="p-5">
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="item_name" className="text-xs font-semibold">
                    Feature Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="item_name"
                    placeholder="e.g. Attendance & Leave"
                    value={itemName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    disabled={isSavingNewItem}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item_code" className="text-xs font-semibold">
                    Feature Code
                  </Label>
                  <Input
                    id="item_code"
                    placeholder="e.g. ATTENDANCE_LEAVE"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                    disabled={isSavingNewItem}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="item_description" className="text-xs font-semibold">
                    Description (Optional)
                  </Label>
                  <Input
                    id="item_description"
                    placeholder="Brief description of this feature..."
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    disabled={isSavingNewItem}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingItem(false)}
                  disabled={isSavingNewItem}
                  className="h-8 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingNewItem}
                  className="h-8 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSavingNewItem ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Feature"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Items Table Card */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="p-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Configured Features ({items.length})
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Dynamic features and capabilities bundled into this subscription plan.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-dashed border-border/70 text-center bg-muted/10 space-y-2">
              <Layers className="h-10 w-10 text-muted-foreground/40" />
              <div className="text-sm font-semibold text-foreground">No features configured</div>
              <p className="text-xs text-muted-foreground max-w-sm">
                This plan does not have any attached features yet. You can add included modules such as Student Information, Fee Management, etc.
              </p>
              {!isAddingItem && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsAddingItem(true)}
                  className="h-8 text-xs font-semibold gap-1.5 cursor-pointer mt-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add First Feature
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table className="text-xs">
                <TableHeader className="bg-muted/40 text-muted-foreground">
                  <TableRow>
                    <TableHead className="pl-4 min-w-[240px]">Feature Name</TableHead>
                    <TableHead className="min-w-[160px]">Code</TableHead>
                    <TableHead className="min-w-[260px]">Description</TableHead>
                    <TableHead className="text-center w-24">Status</TableHead>
                    <TableHead className="text-center w-14 pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isToggling = togglingItemId === item.id

                    return (
                      <TableRow key={item.id || item.item_name}>
                        <TableCell className="pl-4 font-semibold text-foreground min-w-[240px]">
                          {item.item_name}
                        </TableCell>

                        <TableCell className="min-w-[160px] font-mono text-[11px] text-muted-foreground">
                          {item.item_code || "—"}
                        </TableCell>

                        <TableCell className="min-w-[260px] text-muted-foreground">
                          {item.description || "—"}
                        </TableCell>

                        {/* Status Toggle Button */}
                        <TableCell className="text-center w-24">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            disabled={isToggling}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                              item.status === 1 ? "bg-emerald-500" : "bg-muted-foreground/30"
                            }`}
                            title={item.status === 1 ? "Click to deactivate" : "Click to activate"}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-md ring-0 transition duration-200 ease-in-out ${
                                item.status === 1 ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </TableCell>

                        {/* Delete Action */}
                        <TableCell className="text-center pr-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setItemToDelete(item)}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Delete feature"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Item Confirmation Dialog */}
      <Dialog
        open={Boolean(itemToDelete)}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive">
              Delete Feature
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to remove &ldquo;{itemToDelete?.item_name}&rdquo; from {pkg?.plan_name}? This change will take effect immediately in the database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItemToDelete(null)}
              disabled={isDeletingItem}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteItem}
              disabled={isDeletingItem}
              className="h-8 text-xs cursor-pointer gap-1.5"
            >
              {isDeletingItem ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Feature"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
