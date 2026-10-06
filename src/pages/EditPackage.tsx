import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router"
import { useAppSelector } from "@/store/store"
import { toast } from "sonner"
import {
  fetchPackageByIdApi,
  updatePackageApi,
} from "@/services/subscriptionService"
import type { BillingCycle } from "@/types/subscription"
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
  Clock,
  Sparkles,
} from "lucide-react"

// Only two billing cycles allowed
const BILLING_CYCLE_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annually" },
]

const BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: "Monthly",
  annual: "Annually",
}

interface PlanFeatureItem {
  id?: number
  item_name: string
  description: string
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
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")
  const [freeTrialDays, setFreeTrialDays] = useState<number | "">("")
  const [maxStudents, setMaxStudents] = useState<number | "">("")
  const [status, setStatus] = useState<1 | 0>(1)
  const [description, setDescription] = useState("")

  // Repeater Items State
  const [items, setItems] = useState<PlanFeatureItem[]>([])

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
        setBillingCycle(pkg.billing_cycle === "monthly" ? "monthly" : "annual")
        setFreeTrialDays(
          pkg.free_trial_days !== undefined && pkg.free_trial_days !== null
            ? pkg.free_trial_days
            : ""
        )
        setMaxStudents(
          pkg.max_students !== undefined && pkg.max_students !== null
            ? pkg.max_students
            : ""
        )
        setStatus(pkg.status ?? 1)
        setDescription(pkg.description || "")
        setItems(
          pkg.items && Array.isArray(pkg.items)
            ? pkg.items.map((it) => ({
                id: it.id,
                item_name: it.item_name || "",
                description: it.description || "",
              }))
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
        description: "",
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleUpdateItem = (
    index: number,
    field: keyof PlanFeatureItem,
    value: string
  ) => {
    setItems((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        [field]: value,
      }
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token || !id) {
      toast.error("Authentication token or plan ID missing.")
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
        toast.error(`Feature / Add-on #${i + 1} must have an Item Name.`)
        return
      }
    }

    setIsSubmitting(true)

    try {
      const cleanedItems = items.map((it) => ({
        id: it.id,
        item_name: it.item_name.trim(),
        description: it.description?.trim() || "",
        item_code: slugify(it.item_name).toUpperCase(),
        status: 1 as const,
      }))

      await updatePackageApi(token, Number(id), {
        plan_name: planName.trim(),
        plan_code: planCode.trim(),
        price: parsedPrice,
        billing_cycle: billingCycle,
        free_trial_days: freeTrialDays === "" ? 0 : Number(freeTrialDays),
        max_students: Number(maxStudents) || 0,
        status,
        description: description.trim(),
        items: cleanedItems,
      })

      toast.success("Subscription plan updated successfully!")
      navigate("/plans-pricing")
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || "Failed to update subscription plan.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header with Back Button */}
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
            Edit Plan
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Modify subscription plan configuration, billing cycle, free trial days, and features.
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
                Basic identification, pricing, billing cycle, and dynamic trial settings for schools.
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
                    placeholder="e.g. Starter Plan, Growth Plan"
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
                    placeholder="e.g. starter_monthly, growth_annual"
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
                    Enter 0 for complimentary plans.
                  </span>
                </div>

                {/* Billing Cycle - Exactly 2 options: Monthly and Annually */}
                <div className="space-y-1.5">
                  <Label htmlFor="billing_cycle" className="text-xs font-semibold">
                    Billing Cycle <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={billingCycle}
                    onValueChange={(val) => {
                      if (val) setBillingCycle(val as BillingCycle)
                    }}
                    items={BILLING_CYCLE_LABELS}
                    itemToStringLabel={(val) => BILLING_CYCLE_LABELS[val as string] || String(val || "")}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="billing_cycle" className="w-full h-9 text-xs">
                      <SelectValue placeholder="Select billing cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_CYCLE_OPTIONS.map((cycle) => (
                        <SelectItem
                          key={cycle.value}
                          value={cycle.value}
                          label={cycle.label}
                          className="text-xs cursor-pointer"
                        >
                          {cycle.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-muted-foreground">
                    Select either Monthly or Annually billing schedule.
                  </span>
                </div>

                {/* Free Trial Days - Dynamic Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="free_trial_days" className="text-xs font-semibold">
                      Free Trial Days
                    </Label>
                    <Badge variant="outline" className="text-[10px] py-0 h-4 border-primary/30 text-primary">
                      Dynamic
                    </Badge>
                  </div>
                  <div className="relative">
                    <Input
                      id="free_trial_days"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={freeTrialDays}
                      onChange={(e) =>
                        setFreeTrialDays(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
                      }
                      disabled={isSubmitting}
                      className="h-9 text-xs pr-8"
                    />
                    <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Number of free trial days (e.g., 0 for no trial, 7, 14, 30 days).
                  </span>
                </div>

                {/* Student Capacity Limit */}
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
                    onChange={(e) =>
                      setMaxStudents(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    disabled={isSubmitting}
                    className="h-9 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Enter 0 for unlimited students capacity.
                  </span>
                </div>
              </div>

              {/* Plan Status Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">Plan Status</div>
                  <div className="text-[11px] text-muted-foreground">
                    Active plans can be selected and subscribed by schools during registration.
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

              {/* Plan Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold">
                  Plan Description
                </Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Brief description of who this plan is tailored for (optional)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 text-foreground dark:bg-input/30"
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: Features & Add-ons Repeater Card */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold">
                        2. Features & Add-ons Repeater
                      </CardTitle>
                      <Badge variant="secondary" className="text-[11px] font-mono">
                        {items.length} {items.length === 1 ? "item" : "items"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                      Dynamically add features, capabilities, or included modules with Item Name and Description.
                    </CardDescription>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  disabled={isSubmitting}
                  className="h-8 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-border/70 text-center bg-muted/10 space-y-2">
                  <Sparkles className="h-8 w-8 text-muted-foreground/40" />
                  <div className="text-xs font-semibold text-foreground">
                    No features or add-ons added yet
                  </div>
                  <p className="text-[11px] text-muted-foreground max-w-sm">
                    Click the button below to add included features, services, or add-ons to this plan.
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
                          <TableHead className="w-12 pl-4 text-center font-semibold">#</TableHead>
                          <TableHead className="min-w-[240px] font-semibold">
                            Item Name <span className="text-destructive">*</span>
                          </TableHead>
                          <TableHead className="min-w-[320px] font-semibold">
                            Description
                          </TableHead>
                          <TableHead className="text-center w-16 pr-4 font-semibold">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => (
                          <TableRow key={idx}>
                            {/* Index */}
                            <TableCell className="pl-4 text-center text-muted-foreground font-mono font-medium text-xs">
                              {idx + 1}
                            </TableCell>

                            {/* Item Name */}
                            <TableCell className="min-w-[240px]">
                              <Input
                                placeholder="e.g. Student Attendance & Leave Management"
                                value={item.item_name}
                                onChange={(e) => handleUpdateItem(idx, "item_name", e.target.value)}
                                disabled={isSubmitting}
                                className="h-8 text-xs"
                                required
                              />
                            </TableCell>

                            {/* Description */}
                            <TableCell className="min-w-[320px]">
                              <Input
                                placeholder="e.g. Daily digital attendance, RFID tap sync, and instant SMS parent alerts"
                                value={item.description}
                                onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
                                disabled={isSubmitting}
                                className="h-8 text-xs"
                              />
                            </TableCell>

                            {/* Delete Action */}
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

                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAddItem}
                      disabled={isSubmitting}
                      className="h-7 text-xs font-medium gap-1 text-primary hover:text-primary cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      Add Another Item
                    </Button>
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
