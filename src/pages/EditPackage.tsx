import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router"
import { useAppSelector } from "@/store/store"
import { toast } from "sonner"
import {
  fetchPackageByIdApi,
  updatePackageApi,
} from "@/services/subscriptionService"
import type {
  SubscriptionItem,
  BillingCycle,
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
  ArrowLeft,
  Package,
  Layers,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
} from "lucide-react"

const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  annual: "Annual (Yearly)",
  monthly: "Monthly",
  quarterly: "Quarterly (3 Months)",
  half_yearly: "Half Yearly (6 Months)",
  trial: "Free Trial",
}

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  included: "Included (Free)",
  addon: "Paid Add-on",
  usage_based: "Usage Based",
}

const UNIT_LABELS: Record<string, string> = {
  notifications: "Notifications",
  messages: "Messages",
  gb: "Gigabytes (GB)",
  license: "Licenses",
  flat: "Flat",
}

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

export default function EditPackage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)

  // Loading & Data state
  const [isLoading, setIsLoading] = useState(true)
  const [planName, setPlanName] = useState("")
  const [planCode, setPlanCode] = useState("")
  const [price, setPrice] = useState("")
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual")
  const [maxStudents, setMaxStudents] = useState<number | "">("")
  const [maxTeachers, setMaxTeachers] = useState<number | "">("")
  const [status, setStatus] = useState<1 | 0>(1)
  const [description, setDescription] = useState("")

  // Repeater Items State
  const [items, setItems] = useState<SubscriptionItem[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load package by ID from API
  useEffect(() => {
    if (!token || !id) return
    setIsLoading(true)

    fetchPackageByIdApi(token, Number(id))
      .then((pkg) => {
        setPlanName(pkg.plan_name || "")
        setPlanCode(pkg.plan_code || "")
        setPrice(String(pkg.price ?? 0))
        setBillingCycle(pkg.billing_cycle || "annual")
        setMaxStudents(pkg.max_students !== undefined && pkg.max_students !== null ? pkg.max_students : "")
        setMaxTeachers(pkg.max_teachers !== undefined && pkg.max_teachers !== null ? pkg.max_teachers : "")
        setStatus(pkg.status ?? 1)
        setDescription(pkg.description || "")
        setItems(
          pkg.items && Array.isArray(pkg.items)
            ? pkg.items.map((it) => ({ ...it }))
            : []
        )
      })
      .catch((err: Error) => {
        toast.error(err.message || "Failed to fetch package details.")
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [token, id])

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        item_name: "",
        item_code: "",
        item_type: "included",
        price: 0,
        quota_limit: null,
        unit: "notifications",
        billing_type: "recurring",
        status: 1,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleUpdateItem = <K extends keyof SubscriptionItem>(
    index: number,
    field: K,
    value: SubscriptionItem[K]
  ) => {
    setItems((prev) => {
      const updated = [...prev]
      const current = { ...updated[index] }

      current[field] = value

      if (field === "item_type" && value === "included") {
        current.price = 0
      }

      if (field === "item_name" && typeof value === "string") {
        if (!current.item_code || current.item_code === slugify(current.item_name).toUpperCase()) {
          current.item_code = slugify(value).toUpperCase()
        }
      }

      updated[index] = current
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token || !id) {
      toast.error("Authentication token or package ID missing.")
      return
    }

    if (!planName.trim()) {
      toast.error("Plan Name is required.")
      return
    }

    if (!planCode.trim()) {
      toast.error("Plan Code is required.")
      return
    }

    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Please enter a valid price (greater than or equal to 0).")
      return
    }

    // Validate repeater items
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.item_name.trim()) {
        toast.error(`Item #${i + 1} must have a name.`)
        return
      }
      if (it.item_type !== "included") {
        const itemPrice = parseFloat(String(it.price))
        if (isNaN(itemPrice) || itemPrice < 0) {
          toast.error(`Item "${it.item_name}" must have a valid price.`)
          return
        }
      }
    }

    setIsSubmitting(true)

    try {
      const cleanedItems = items.map((it, idx) => ({
        ...it,
        item_name: it.item_name.trim(),
        item_code: it.item_code?.trim() || slugify(it.item_name).toUpperCase(),
        price: it.item_type === "included" ? 0 : parseFloat(String(it.price)) || 0,
        quota_limit: it.quota_limit ? Number(it.quota_limit) : null,
        display_order: idx + 1,
      }))

      await updatePackageApi(token, Number(id), {
        plan_name: planName.trim(),
        plan_code: planCode.trim(),
        price: parsedPrice,
        billing_cycle: billingCycle,
        max_students: Number(maxStudents) || 0,
        max_teachers: Number(maxTeachers) || 0,
        status,
        description: description.trim(),
        items: cleanedItems,
      })

      toast.success("Package updated successfully!")
      navigate("/plans-pricing")
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || "Failed to update subscription package.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header with Single Back Button */}
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
            Edit Subscription Package
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Modify package configuration, capacity limits, and synchronize child features or add-ons.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-24 w-full" />
          </Card>
          <Card className="p-6 space-y-4">
            <Skeleton className="h-8 w-60" />
            <Skeleton className="h-32 w-full" />
          </Card>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: Core Plan Information Card */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Package className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-semibold">1. Core Plan Information</CardTitle>
                </div>
                <Badge variant={status === 1 ? "default" : "secondary"} className="text-xs">
                  {status === 1 ? "Active Plan" : "Draft / Inactive"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Basic identification, pricing, and student/teacher capacity limits for schools.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Plan Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="plan_name" className="text-xs font-semibold">
                    Plan Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="plan_name"
                    placeholder="Plan name"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    disabled={isSubmitting}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                {/* Plan Code */}
                <div className="space-y-1.5">
                  <Label htmlFor="plan_code" className="text-xs font-semibold">
                    Plan Code (Unique Identifier) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="plan_code"
                    placeholder="Plan code"
                    value={planCode}
                    onChange={(e) => setPlanCode(e.target.value)}
                    disabled={isSubmitting}
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>

                {/* Base Price */}
                <div className="space-y-1.5">
                  <Label htmlFor="price" className="text-xs font-semibold">
                    Base Price (₹ INR) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={isSubmitting}
                    className="h-9 text-xs"
                    required
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Enter 0 for Free Trial or complimentary plans.
                  </span>
                </div>

                {/* Billing Cycle */}
                <div className="space-y-1.5">
                  <Label htmlFor="billing_cycle" className="text-xs font-semibold">
                    Billing Cycle <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={billingCycle}
                    onValueChange={(val) => setBillingCycle(val as BillingCycle)}
                    items={BILLING_CYCLE_LABELS}
                    itemToStringLabel={(val) => BILLING_CYCLE_LABELS[val as BillingCycle] || String(val)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="billing_cycle" className="w-full h-9 text-xs">
                      <SelectValue placeholder="Select billing cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(BILLING_CYCLE_LABELS) as BillingCycle[]).map((cycle) => (
                        <SelectItem
                          key={cycle}
                          value={cycle}
                          label={BILLING_CYCLE_LABELS[cycle]}
                          className="text-xs cursor-pointer"
                        >
                          {BILLING_CYCLE_LABELS[cycle]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Student Capacity */}
                <div className="space-y-1.5">
                  <Label htmlFor="max_students" className="text-xs font-semibold">
                    Max Students Capacity
                  </Label>
                  <Input
                    id="max_students"
                    type="number"
                    min="0"
                    placeholder="0 (Unlimited)"
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(e.target.value === "" ? "" : Number(e.target.value))}
                    disabled={isSubmitting}
                    className="h-9 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Set to 0 for unlimited students.
                  </span>
                </div>

                {/* Teacher Capacity */}
                <div className="space-y-1.5">
                  <Label htmlFor="max_teachers" className="text-xs font-semibold">
                    Max Teachers Capacity
                  </Label>
                  <Input
                    id="max_teachers"
                    type="number"
                    min="0"
                    placeholder="0 (Unlimited)"
                    value={maxTeachers}
                    onChange={(e) => setMaxTeachers(e.target.value === "" ? "" : Number(e.target.value))}
                    disabled={isSubmitting}
                    className="h-9 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Set to 0 for unlimited teachers.
                  </span>
                </div>
              </div>

              {/* Plan Status Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">Package Status</div>
                  <div className="text-[11px] text-muted-foreground">
                    Active packages can be subscribed by schools and appear on public pricing.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStatus(status === 1 ? 0 : 1)}
                  disabled={isSubmitting}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    status === 1 ? "bg-emerald-500" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                      status === 1 ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold">
                  Plan Description
                </Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Plan description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 text-foreground dark:bg-input/30"
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: Items & Add-ons Repeater Table Card */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">2. Features & Add-ons Repeater</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Attached bundled features (free in plan) and optional paid add-ons. ({items.length} items)
                    </CardDescription>
                  </div>
                </div>

                {items.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    disabled={isSubmitting}
                    className="h-8 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Feature / Item
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-border/70 text-center bg-muted/10 space-y-2">
                  <Layers className="h-8 w-8 text-muted-foreground/50" />
                  <div className="text-xs font-semibold text-foreground">No features or add-ons attached</div>
                  <p className="text-[11px] text-muted-foreground max-w-sm">
                    Add included notification quotas, cloud storage packs, or optional paid add-ons to this package.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    className="h-8 text-xs font-semibold gap-1.5 cursor-pointer mt-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add First Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-xl border border-border/60">
                    <Table className="text-xs">
                      <TableHeader className="bg-muted/40 text-muted-foreground">
                        <TableRow>
                          <TableHead className="pl-4 min-w-[200px]">Item / Feature Name *</TableHead>
                          <TableHead className="min-w-[140px]">Code</TableHead>
                          <TableHead className="min-w-[160px]">Type</TableHead>
                          <TableHead className="min-w-[120px]">Price (₹)</TableHead>
                          <TableHead className="min-w-[130px]">Quota Limit</TableHead>
                          <TableHead className="min-w-[150px]">Unit</TableHead>
                          <TableHead className="min-w-[150px]">Billing</TableHead>
                          <TableHead className="text-center w-14 pr-4">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => (
                          <TableRow key={idx}>
                            {/* Name */}
                            <TableCell className="pl-4 min-w-[200px]">
                              <Input
                                placeholder="Item / feature name"
                                value={item.item_name}
                                onChange={(e) => handleUpdateItem(idx, "item_name", e.target.value)}
                                disabled={isSubmitting}
                                className="h-8 text-xs"
                                required
                              />
                            </TableCell>

                            {/* Code */}
                            <TableCell className="min-w-[140px]">
                              <Input
                                placeholder="Item code"
                                value={item.item_code || ""}
                                onChange={(e) => handleUpdateItem(idx, "item_code", e.target.value.toUpperCase())}
                                disabled={isSubmitting}
                                className="h-8 text-xs font-mono text-[11px]"
                              />
                            </TableCell>

                            {/* Type */}
                            <TableCell className="min-w-[160px]">
                              <Select
                                value={item.item_type}
                                onValueChange={(val) => handleUpdateItem(idx, "item_type", val as ItemType)}
                                items={ITEM_TYPE_LABELS}
                                itemToStringLabel={(val) => ITEM_TYPE_LABELS[val as ItemType] || String(val)}
                                disabled={isSubmitting}
                              >
                                <SelectTrigger className="h-8 text-xs w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(ITEM_TYPE_LABELS) as ItemType[]).map((t) => (
                                    <SelectItem
                                      key={t}
                                      value={t}
                                      label={ITEM_TYPE_LABELS[t]}
                                      className="text-xs cursor-pointer"
                                    >
                                      {ITEM_TYPE_LABELS[t]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* Price */}
                            <TableCell className="min-w-[120px]">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={item.item_type === "included" ? 0 : item.price}
                                onChange={(e) => handleUpdateItem(idx, "price", parseFloat(e.target.value) || 0)}
                                disabled={isSubmitting || item.item_type === "included"}
                                className={`h-8 text-xs ${item.item_type === "included" ? "opacity-60 bg-muted/40" : ""}`}
                              />
                            </TableCell>

                            {/* Quota Limit */}
                            <TableCell className="min-w-[130px]">
                              <Input
                                type="number"
                                min="0"
                                placeholder="Unlimited"
                                value={item.quota_limit ?? ""}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    idx,
                                    "quota_limit",
                                    e.target.value === "" ? null : Number(e.target.value)
                                  )
                                }
                                disabled={isSubmitting}
                                className="h-8 text-xs"
                              />
                            </TableCell>

                            {/* Unit */}
                            <TableCell className="min-w-[150px]">
                              <Select
                                value={item.unit || "notifications"}
                                onValueChange={(val) => handleUpdateItem(idx, "unit", val)}
                                items={UNIT_LABELS}
                                itemToStringLabel={(val) => UNIT_LABELS[val] || String(val)}
                                disabled={isSubmitting}
                              >
                                <SelectTrigger className="h-8 text-xs w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.keys(UNIT_LABELS).map((u) => (
                                    <SelectItem
                                      key={u}
                                      value={u}
                                      label={UNIT_LABELS[u]}
                                      className="text-xs cursor-pointer"
                                    >
                                      {UNIT_LABELS[u]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* Billing Type */}
                            <TableCell className="min-w-[150px]">
                              <Select
                                value={item.billing_type || "recurring"}
                                onValueChange={(val) => handleUpdateItem(idx, "billing_type", val as BillingType)}
                                items={BILLING_TYPE_LABELS}
                                itemToStringLabel={(val) => BILLING_TYPE_LABELS[val as BillingType] || String(val)}
                                disabled={isSubmitting}
                              >
                                <SelectTrigger className="h-8 text-xs w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(BILLING_TYPE_LABELS) as BillingType[]).map((b) => (
                                    <SelectItem
                                      key={b}
                                      value={b}
                                      label={BILLING_TYPE_LABELS[b]}
                                      className="text-xs cursor-pointer"
                                    >
                                      {BILLING_TYPE_LABELS[b]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* Action */}
                            <TableCell className="text-center pr-4">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(idx)}
                                disabled={isSubmitting}
                                className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                                title="Delete item row"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Submission Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/70">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/plans-pricing")}
              disabled={isSubmitting}
              className="h-9 text-xs font-semibold px-4 cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-9 text-xs font-semibold px-6 gap-1.5 cursor-pointer shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
