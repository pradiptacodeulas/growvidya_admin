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
  ItemType,
  BillingType,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Zap,
  X,
} from "lucide-react"

const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: "included", label: "Included (Free)" },
  { value: "addon", label: "Paid Add-on" },
  { value: "usage_based", label: "Usage Based" },
]

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  included: "Included (Free)",
  addon: "Paid Add-on",
  usage_based: "Usage Based",
}

const UNITS = [
  { value: "notifications", label: "Notifications" },
  { value: "messages", label: "Messages (SMS/Email)" },
  { value: "gb", label: "Gigabytes (GB)" },
  { value: "license", label: "Licenses" },
  { value: "flat", label: "Flat" },
]

const UNIT_LABELS: Record<string, string> = {
  notifications: "Notifications",
  messages: "Messages (SMS/Email)",
  gb: "Gigabytes (GB)",
  license: "Licenses",
  flat: "Flat",
}

const BILLING_TYPES: { value: BillingType; label: string }[] = [
  { value: "recurring", label: "Recurring" },
  { value: "one_time", label: "One-Time" },
  { value: "per_unit", label: "Per Unit" },
]

const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  recurring: "Recurring",
  one_time: "One-Time",
  per_unit: "Per Unit",
}

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

  // Add Item Inline Form State
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [itemName, setItemName] = useState("")
  const [itemCode, setItemCode] = useState("")
  const [itemType, setItemType] = useState<ItemType>("included")
  const [itemPrice, setItemPrice] = useState("0")
  const [itemQuota, setItemQuota] = useState("")
  const [itemUnit, setItemUnit] = useState("notifications")
  const [itemBillingType, setItemBillingType] = useState<BillingType>("recurring")
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
      toast.error(error.message || "Failed to load package features and add-ons.")
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
      toast.error("Item name is required.")
      return
    }

    const price = itemType === "included" ? 0 : parseFloat(itemPrice) || 0
    setIsSavingNewItem(true)

    try {
      const created = await addItemToPackageApi(token, pkg.id, {
        item_name: itemName.trim(),
        item_code: itemCode.trim() || slugify(itemName).toUpperCase(),
        item_type: itemType,
        price,
        quota_limit: itemQuota ? Number(itemQuota) : null,
        unit: itemUnit,
        billing_type: itemBillingType,
        description: itemDescription.trim() || null,
        status: 1,
      })

      setItems((prev) => [...prev, created])
      setIsAddingItem(false)
      setItemName("")
      setItemCode("")
      setItemPrice("0")
      setItemQuota("")
      setItemDescription("")
      toast.success(`Feature "${created.item_name}" added successfully.`)
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || "Failed to add feature or add-on.")
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
      toast.error(error.message || "Failed to update item status.")
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
      toast.error(error.message || "Failed to delete item.")
    } finally {
      setIsDeletingItem(false)
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Single Back Button & Header */}
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
              {pkg ? `${pkg.plan_name} — Features & Add-ons` : "Features & Add-ons"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage bundled features (free) and optional paid add-ons for this package.
            </p>
          </div>
        </div>

        {/* Single Add Feature Button */}
        {!isAddingItem && !isLoading && (
          <Button
            size="sm"
            onClick={() => setIsAddingItem(true)}
            className="gap-2 h-9 text-xs font-semibold cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Add Feature / Add-on
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
                  New Feature / Add-on Configuration
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Attach an included quota or optional paid add-on to {pkg?.plan_name}.
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
                    Item Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="item_name"
                    placeholder="e.g. Cloud Storage 50GB"
                    value={itemName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    disabled={isSavingNewItem}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item_code" className="text-xs font-semibold">
                    Item Code
                  </Label>
                  <Input
                    id="item_code"
                    placeholder="e.g. STORAGE_50GB"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                    disabled={isSavingNewItem}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item_type" className="text-xs font-semibold">
                    Item Type
                  </Label>
                  <Select
                    items={ITEM_TYPE_LABELS}
                    itemToStringLabel={(val) => ITEM_TYPE_LABELS[val as ItemType] || String(val || "")}
                    value={itemType}
                    onValueChange={(val) => {
                      if (val) {
                        const typeVal = val as ItemType
                        setItemType(typeVal)
                        if (typeVal === "included") setItemPrice("0")
                      }
                    }}
                    disabled={isSavingNewItem}
                  >
                    <SelectTrigger id="item_type" className="h-9 text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item_price" className="text-xs font-semibold">
                    Price (₹ INR)
                  </Label>
                  <Input
                    id="item_price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={itemType === "included" ? 0 : itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    disabled={isSavingNewItem || itemType === "included"}
                    className={`h-9 text-xs ${itemType === "included" ? "opacity-60 bg-muted/40" : ""}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item_quota" className="text-xs font-semibold">
                    Quota Limit
                  </Label>
                  <Input
                    id="item_quota"
                    type="number"
                    min="0"
                    placeholder="Blank for unlimited"
                    value={itemQuota}
                    onChange={(e) => setItemQuota(e.target.value)}
                    disabled={isSavingNewItem}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item_unit" className="text-xs font-semibold">
                    Unit
                  </Label>
                  <Select
                    items={UNIT_LABELS}
                    itemToStringLabel={(val) => UNIT_LABELS[val as string] || String(val || "")}
                    value={itemUnit}
                    onValueChange={(val) => {
                      if (val) setItemUnit(val as string)
                    }}
                    disabled={isSavingNewItem}
                  >
                    <SelectTrigger id="item_unit" className="h-9 text-xs">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item_billing_type" className="text-xs font-semibold">
                    Billing Type
                  </Label>
                  <Select
                    items={BILLING_TYPE_LABELS}
                    itemToStringLabel={(val) => BILLING_TYPE_LABELS[val as BillingType] || String(val || "")}
                    value={itemBillingType}
                    onValueChange={(val) => {
                      if (val) setItemBillingType(val as BillingType)
                    }}
                    disabled={isSavingNewItem}
                  >
                    <SelectTrigger id="item_billing_type" className="h-9 text-xs">
                      <SelectValue placeholder="Select billing type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_TYPES.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="item_description" className="text-xs font-semibold">
                    Description (Optional)
                  </Label>
                  <Input
                    id="item_description"
                    placeholder="Brief description of this feature or add-on..."
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
                      Saving to Database...
                    </>
                  ) : (
                    "Save Item"
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
                Configured Features & Add-ons ({items.length})
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Included services, notification capacities, and paid add-ons available for this plan.
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
              <div className="text-sm font-semibold text-foreground">No features or add-ons configured</div>
              <p className="text-xs text-muted-foreground max-w-sm">
                This package does not have any attached child items. You can add bundled notification quotas or paid add-ons.
              </p>
              {!isAddingItem && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsAddingItem(true)}
                  className="h-8 text-xs font-semibold gap-1.5 cursor-pointer mt-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add First Feature / Add-on
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table className="text-xs">
                <TableHeader className="bg-muted/40 text-muted-foreground">
                  <TableRow>
                    <TableHead className="pl-4 min-w-[200px]">Item / Feature Name</TableHead>
                    <TableHead className="min-w-[140px]">Code</TableHead>
                    <TableHead className="min-w-[150px]">Type</TableHead>
                    <TableHead className="min-w-[120px]">Price (₹)</TableHead>
                    <TableHead className="min-w-[130px]">Quota Limit</TableHead>
                    <TableHead className="min-w-[130px]">Unit</TableHead>
                    <TableHead className="min-w-[130px]">Billing</TableHead>
                    <TableHead className="text-center w-24">Status</TableHead>
                    <TableHead className="text-center w-14 pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isToggling = togglingItemId === item.id

                    return (
                      <TableRow key={item.id || item.item_name}>
                        <TableCell className="pl-4 font-semibold text-foreground min-w-[200px]">
                          <div>{item.item_name}</div>
                          {item.description && (
                            <div className="text-[11px] text-muted-foreground font-normal line-clamp-1">
                              {item.description}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="min-w-[140px] font-mono text-[11px] text-muted-foreground">
                          {item.item_code || "—"}
                        </TableCell>

                        <TableCell className="min-w-[150px]">
                          {item.item_type === "included" ? (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                              Included (Free)
                            </Badge>
                          ) : item.item_type === "addon" ? (
                            <Badge variant="secondary" className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border border-amber-500/30">
                              <Zap className="h-3 w-3" /> Paid Add-on
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Usage Based
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="min-w-[120px] font-semibold text-foreground">
                          {item.item_type === "included" || Number(item.price) === 0
                            ? "Free"
                            : `₹${Number(item.price).toLocaleString("en-IN")}`}
                        </TableCell>

                        <TableCell className="min-w-[130px] text-foreground">
                          {item.quota_limit
                            ? Number(item.quota_limit).toLocaleString("en-IN")
                            : "Unlimited"}
                        </TableCell>

                        <TableCell className="min-w-[130px] capitalize text-muted-foreground">
                          {item.unit || "—"}
                        </TableCell>

                        <TableCell className="min-w-[130px] capitalize text-muted-foreground">
                          {item.billing_type?.replace("_", " ") || "—"}
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
                            title="Delete item"
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
              Delete Feature / Add-on
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
                "Delete Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
