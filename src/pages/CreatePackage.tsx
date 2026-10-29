import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import { useDraftState, clearFormDraft } from "@/hooks/useFormDraft"
import { toast } from "sonner"
import { createPackageApi, fetchPackagesApi } from "@/services/subscriptionService"
import type { BillingCycle, SubscriptionPackage } from "@/types/subscription"
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
  HardDrive,
  Star,
  Infinity as InfinityIcon,
  Calculator,
  Zap,
  Tag,
  X,
} from "lucide-react"

const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  annual: 12,
  trial: 0,
}

const CYCLE_SHORT_SUFFIX: Record<BillingCycle, string> = {
  monthly: "month",
  quarterly: "quarter",
  half_yearly: "6 months",
  annual: "year",
  trial: "trial",
}

function formatCleanPercent(orig: number, sell: number): string {
  if (!(orig > 0) || isNaN(sell) || sell < 0 || orig <= sell) return ""
  const pct = ((orig - sell) / orig) * 100
  return Number(pct.toFixed(2)).toString()
}

const BILLING_CYCLE_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: "monthly", label: "Monthly (1 Month)" },
  { value: "quarterly", label: "Quarterly (3 Months)" },
  { value: "half_yearly", label: "Half-Yearly (6 Months)" },
  { value: "annual", label: "Annually (12 Months)" },
  { value: "trial", label: "Free Trial" },
]

const BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: "Monthly (1 Month)",
  quarterly: "Quarterly (3 Months)",
  half_yearly: "Half-Yearly (6 Months)",
  annual: "Annually (12 Months)",
  trial: "Free Trial",
}

interface PlanFeatureItem {
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

const FORM_DRAFT_KEY = "create_package"

export default function CreatePackage() {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)

  // Core Package State (100% dynamic, zero dummy fallbacks, persisted across route navigations)
  const [planName, setPlanName] = useDraftState(FORM_DRAFT_KEY, "planName", "")
  const [planCode, setPlanCode] = useDraftState(FORM_DRAFT_KEY, "planCode", "")
  const [isCodeManual, setIsCodeManual] = useDraftState(FORM_DRAFT_KEY, "isCodeManual", false)
  const [tierRank, setTierRank] = useDraftState<number | "">(FORM_DRAFT_KEY, "tierRank", 1)
  const [originalPrice, setOriginalPrice] = useDraftState(FORM_DRAFT_KEY, "originalPrice", "")
  const [discountPercent, setDiscountPercent] = useDraftState(FORM_DRAFT_KEY, "discountPercent", "")
  const [price, setPrice] = useDraftState(FORM_DRAFT_KEY, "price", "")
  const [billingCycle, setBillingCycle] = useDraftState<BillingCycle>(FORM_DRAFT_KEY, "billingCycle", "annual")
  const [existingPackages, setExistingPackages] = useState<SubscriptionPackage[]>([])
  const [freeTrialDays, setFreeTrialDays] = useDraftState<number | "">(FORM_DRAFT_KEY, "freeTrialDays", "")
  const [maxStudents, setMaxStudents] = useDraftState<number | "">(FORM_DRAFT_KEY, "maxStudents", "")
  const [includedStorageGb, setIncludedStorageGb] = useDraftState<number | "">(FORM_DRAFT_KEY, "includedStorageGb", "")
  const [isPopular, setIsPopular] = useDraftState<1 | 0>(FORM_DRAFT_KEY, "isPopular", 0)
  const [status, setStatus] = useDraftState<1 | 0>(FORM_DRAFT_KEY, "status", 1)
  const [description, setDescription] = useDraftState(FORM_DRAFT_KEY, "description", "")

  // Custom Features Repeater Items
  const [items, setItems] = useDraftState<PlanFeatureItem[]>(FORM_DRAFT_KEY, "items", [])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCancel = () => {
    clearFormDraft(FORM_DRAFT_KEY)
    navigate("/plans-pricing")
  }

  useEffect(() => {
    if (!token) return
    fetchPackagesApi(token, { limit: 100 })
      .then((res) => setExistingPackages(res?.packages ?? []))
      .catch(() => {})
  }, [token])

  const effectiveBaseSlug = useMemo(() => {
    return slugify(
      planName.replace(/\b(plan|package|monthly|quarterly|half[\s_-]*yearly|annual|yearly|trial)\b/gi, "")
    )
  }, [planName])

  const matchingMonthlyPlan = useMemo(() => {
    if (CYCLE_MONTHS[billingCycle] <= 1) return null
    const parsedRank = Number(tierRank)
    return (
      existingPackages.find((p) => {
        if (p.billing_cycle !== "monthly" || !(Number(p.price) > 0)) return false
        const pkgBaseSlug = slugify(
          p.plan_name.replace(/\b(plan|package|monthly|quarterly|half[\s_-]*yearly|annual|yearly|trial)\b/gi, "")
        )
        if (effectiveBaseSlug && pkgBaseSlug === effectiveBaseSlug) return true
        return parsedRank >= 1 && Number(p.tier_rank) === parsedRank
      }) || null
    )
  }, [existingPackages, effectiveBaseSlug, tierRank, billingCycle])

  const handleOriginalPriceChange = (val: string) => {
    setOriginalPrice(val)
    const origNum = parseFloat(val)
    const sellNum = parseFloat(price)
    if (!isNaN(origNum) && origNum > 0) {
      if (price !== "" && !isNaN(sellNum)) {
        setDiscountPercent(origNum > sellNum ? formatCleanPercent(origNum, sellNum) : "")
      } else if (discountPercent !== "") {
        const pctNum = parseFloat(discountPercent)
        if (!isNaN(pctNum) && pctNum >= 0 && pctNum <= 100) {
          const computed = Math.max(0, Number((origNum * (1 - pctNum / 100)).toFixed(2)))
          setPrice(computed.toString())
        }
      }
    } else {
      setDiscountPercent("")
    }
  }

  const handleDiscountPercentChange = (val: string) => {
    setDiscountPercent(val)
    const origNum = parseFloat(originalPrice)
    const pctNum = parseFloat(val)
    if (!isNaN(origNum) && origNum > 0 && val !== "" && !isNaN(pctNum) && pctNum >= 0 && pctNum <= 100) {
      const computedSell = Math.max(0, Number((origNum * (1 - pctNum / 100)).toFixed(2)))
      setPrice(computedSell.toString())
    }
  }

  const handleSellingPriceChange = (val: string) => {
    setPrice(val)
    const origNum = parseFloat(originalPrice)
    const sellNum = parseFloat(val)
    if (!isNaN(origNum) && origNum > 0 && val !== "" && !isNaN(sellNum) && origNum > sellNum) {
      setDiscountPercent(formatCleanPercent(origNum, sellNum))
    } else {
      setDiscountPercent("")
    }
  }

  const handleNameChange = (val: string) => {
    setPlanName(val)
    if (!isCodeManual) {
      setPlanCode(slugify(`${val}_${billingCycle}`))
    }
  }

  const handleCycleChange = (nextCycle: BillingCycle) => {
    setBillingCycle(nextCycle)
    if (!isCodeManual && planName.trim()) {
      setPlanCode(slugify(`${planName}_${nextCycle}`))
    }
  }

  const handleAddItem = () => {
    setItems((prev) => [...prev, { item_name: "", description: "" }])
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
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error("Authentication token not found. Please log in.")
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
      toast.error("Please enter a valid Net Selling Price (greater than or equal to 0).")
      return
    }

    const parsedOriginal =
      originalPrice.trim() !== "" ? parseFloat(originalPrice) : null
    if (parsedOriginal !== null && (isNaN(parsedOriginal) || parsedOriginal < 0)) {
      toast.error("Please enter a valid Actual / Regular Price.")
      return
    }
    if (parsedOriginal !== null && parsedOriginal > 0 && parsedOriginal < parsedPrice) {
      toast.error("Actual / Regular Price cannot be lower than the Net Selling Price.")
      return
    }

    const parsedTierRank = Number(tierRank) || 1
    if (parsedTierRank < 1) {
      toast.error("Tier Rank must be 1 or greater.")
      return
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.item_name.trim()) {
        toast.error(`Custom Feature #${i + 1} must have an Item Name.`)
        return
      }
    }

    setIsSubmitting(true)

    try {
      const cleanedItems = items.map((it) => ({
        item_name: it.item_name.trim(),
        description: it.description?.trim() || "",
        item_code: slugify(it.item_name).toUpperCase(),
        item_type: "feature" as const,
        status: 1 as const,
      }))

      await createPackageApi(token, {
        plan_name: planName.trim(),
        plan_code: planCode.trim(),
        tier_rank: parsedTierRank,
        price: parsedPrice,
        original_price:
          parsedOriginal !== null && parsedOriginal > parsedPrice ? parsedOriginal : null,
        billing_cycle: billingCycle,
        free_trial_days: freeTrialDays === "" ? 0 : Number(freeTrialDays),
        max_students: Number(maxStudents) || 0,
        included_storage_gb: includedStorageGb === "" ? 0 : Math.max(0, Number(includedStorageGb)),
        is_popular: isPopular,
        status,
        description: description.trim(),
        items: cleanedItems,
      })

      toast.success("Subscription plan created successfully!")
      clearFormDraft(FORM_DRAFT_KEY)
      navigate("/plans-pricing")
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || "Failed to create subscription plan.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
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
            Create Subscription Plan
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure dynamic tier hierarchy, flat Zero-GST pricing, cloud storage, and gated ERP modules.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Core Plan Information Card */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Package className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-semibold">1. Core Plan & Tier Hierarchy</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {isPopular === 1 && (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Most Popular
                  </Badge>
                )}
                <Badge variant={status === 1 ? "default" : "secondary"} className="text-xs">
                  {status === 1 ? "Active Plan" : "Draft / Inactive"}
                </Badge>
              </div>
            </div>
            <CardDescription className="text-xs">
              Flat net pricing (Zero GST). Tier Rank enforces the strict no-downgrade policy across renewals and upgrades.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Unlimited Teachers & Branches Notice */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-800 dark:text-emerald-300">
              <InfinityIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                <strong>Unlimited Teachers & Unlimited Campus Branches</strong> are automatically included on every plan. Only Student Quota, Cloud Storage, and Gated Modules are metered per tier.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Plan Name */}
              <div className="space-y-1.5">
                <Label htmlFor="plan_name" className="text-xs font-semibold">
                  Plan Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="plan_name"
                  placeholder="e.g. Starter Plan, Growth Plan, Enterprise"
                  value={planName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={isSubmitting}
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Plan Code */}
              <div className="space-y-1.5">
                <Label htmlFor="plan_code" className="text-xs font-semibold">
                  Plan Code (Unique Slug) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="plan_code"
                  placeholder="e.g. growth_annual"
                  value={planCode}
                  onChange={(e) => {
                    setIsCodeManual(true)
                    setPlanCode(e.target.value)
                  }}
                  disabled={isSubmitting}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>

              {/* Tier Rank */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="tier_rank" className="text-xs font-semibold">
                    Tier Rank (No-Downgrade Order) <span className="text-destructive">*</span>
                  </Label>
                </div>
                <Input
                  id="tier_rank"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  value={tierRank}
                  onChange={(e) =>
                    setTierRank(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  disabled={isSubmitting}
                  className="h-9 text-xs"
                  required
                />
                <span className="text-[10px] text-muted-foreground">
                  e.g. 1 = Starter, 2 = Growth, 3 = Enterprise. Higher rank = Upgrade.
                </span>
              </div>

              {/* Billing Cycle */}
              <div className="space-y-1.5">
                <Label htmlFor="billing_cycle" className="text-xs font-semibold">
                  Billing Cycle <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={billingCycle}
                  onValueChange={(val) => {
                    if (val) handleCycleChange(val as BillingCycle)
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
              </div>

              {/* Smart 3-Box Pricing & Strikethrough Discount Strip (Full Width) */}
              <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-primary/25 bg-primary/[0.03] p-4 space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      Smart Pricing & Strikethrough Discount (Two-Way Calculator + Editable Fields)
                    </span>
                  </div>
                  {originalPrice.trim() !== "" && (
                    <button
                      type="button"
                      onClick={() => handleOriginalPriceChange("")}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      Clear Discount
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Box 1: Actual / Regular Price */}
                  <div className="space-y-1.5">
                    <Label htmlFor="original_price" className="text-xs font-semibold">
                      Actual / Regular Price (₹ Optional)
                    </Label>
                    <Input
                      id="original_price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 2400 (Strikethrough MRP)"
                      value={originalPrice}
                      onChange={(e) => handleOriginalPriceChange(e.target.value)}
                      disabled={isSubmitting || billingCycle === "trial"}
                      className="h-9 text-xs bg-background"
                    />
                    {matchingMonthlyPlan && CYCLE_MONTHS[billingCycle] > 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          const suggested = Number(
                            (Number(matchingMonthlyPlan.price) * CYCLE_MONTHS[billingCycle]).toFixed(2)
                          )
                          handleOriginalPriceChange(String(suggested))
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                      >
                        <Zap className="h-3 w-3" />
                        Fill ₹{Number(matchingMonthlyPlan.price).toLocaleString("en-IN")} ×{" "}
                        {CYCLE_MONTHS[billingCycle]} = ₹
                        {Number(
                          (Number(matchingMonthlyPlan.price) * CYCLE_MONTHS[billingCycle]).toFixed(2)
                        ).toLocaleString("en-IN")}
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground block">
                        Leave blank if you don&apos;t want a strikethrough price.
                      </span>
                    )}
                  </div>

                  {/* Box 2: Two-Way Discount % */}
                  <div className="space-y-1.5">
                    <Label htmlFor="discount_percent" className="text-xs font-semibold">
                      Discount % (Auto-Calculator)
                    </Label>
                    <div className="relative">
                      <Input
                        id="discount_percent"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder={
                          parseFloat(originalPrice) > 0
                            ? "Type % (e.g. 25)"
                            : "Enter Regular Price first"
                        }
                        value={discountPercent}
                        onChange={(e) => handleDiscountPercentChange(e.target.value)}
                        disabled={isSubmitting || billingCycle === "trial" || !(parseFloat(originalPrice) > 0)}
                        className="h-9 text-xs pr-7 bg-background"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                        %
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Type % to calculate Net Price, or type Net Price directly.
                    </span>
                  </div>

                  {/* Box 3: Final Net Selling Price */}
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="text-xs font-semibold">
                      Final Net Selling Price (₹ — Zero GST) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 1500"
                      value={price}
                      onChange={(e) => handleSellingPriceChange(e.target.value)}
                      disabled={isSubmitting}
                      className="h-9 text-xs font-semibold bg-background"
                      required
                    />
                    <span className="text-[10px] text-muted-foreground block">
                      Exact flat amount charged to schools at checkout.
                    </span>
                  </div>
                </div>

                {/* Live Pricing Card Preview */}
                {(() => {
                  const origNum = parseFloat(originalPrice)
                  const sellNum = parseFloat(price)
                  const hasValidSell = price !== "" && !isNaN(sellNum) && sellNum >= 0
                  const hasValidOrig = originalPrice.trim() !== "" && !isNaN(origNum) && origNum > 0
                  const isInvalidOrig = hasValidOrig && hasValidSell && origNum < sellNum
                  const hasDiscount = hasValidOrig && hasValidSell && origNum > sellNum
                  const savedAmt = hasDiscount ? Number((origNum - sellNum).toFixed(2)) : 0
                  const savedPct = hasDiscount ? Math.round(((origNum - sellNum) / origNum) * 100) : 0

                  if (isInvalidOrig) {
                    return (
                      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive font-medium">
                        Actual / Regular Price (₹{origNum.toLocaleString("en-IN")}) cannot be lower than Final Net Selling Price (₹{sellNum.toLocaleString("en-IN")}).
                      </div>
                    )
                  }

                  if (!hasValidSell) return null

                  return (
                    <div className="flex items-center justify-between flex-wrap gap-2 rounded-lg border border-border/70 bg-background px-3.5 py-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                          Card Preview:
                        </span>
                        {hasDiscount && (
                          <span className="text-sm font-semibold text-muted-foreground line-through">
                            ₹{origNum.toLocaleString("en-IN")}
                          </span>
                        )}
                        <span className="text-base font-extrabold text-foreground">
                          {billingCycle === "trial" || sellNum === 0
                            ? "Free"
                            : `₹${sellNum.toLocaleString("en-IN")}`}
                        </span>
                        {billingCycle !== "trial" && sellNum > 0 && (
                          <span className="text-xs text-muted-foreground">
                            / {CYCLE_SHORT_SUFFIX[billingCycle]}
                          </span>
                        )}
                        {hasDiscount && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-bold gap-1">
                            <Tag className="h-3 w-3" />
                            {savedPct}% OFF • Save ₹{savedAmt.toLocaleString("en-IN")}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {hasDiscount
                          ? "Strikethrough & discount badge active on pricing cards"
                          : "Standard price display (no discount badge)"}
                      </span>
                    </div>
                  )
                })()}
              </div>

              {/* Max Students Capacity */}
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
                    setMaxStudents(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
                  }
                  disabled={isSubmitting}
                  className="h-9 text-xs"
                />
                <span className="text-[10px] text-muted-foreground">
                  Enter 0 for Unlimited students.
                </span>
              </div>

              {/* Included Base Cloud Storage (GB — Optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="included_storage_gb" className="text-xs font-semibold">
                  Included Cloud Storage (GB — Optional)
                </Label>
                <div className="relative">
                  <Input
                    id="included_storage_gb"
                    type="number"
                    min="0"
                    placeholder="0 (Optional)"
                    value={includedStorageGb}
                    onChange={(e) =>
                      setIncludedStorageGb(
                        e.target.value === "" ? "" : Math.max(0, Number(e.target.value))
                      )
                    }
                    disabled={isSubmitting}
                    className="h-9 text-xs pr-8"
                  />
                  <HardDrive className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Optional base cloud storage bundled with this plan (leave blank or 0 if none).
                </span>
              </div>

              {/* Free Trial Days */}
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
                  Used when Billing Cycle is Free Trial (e.g. 14 or 30 days).
                </span>
              </div>
            </div>

            {/* Toggles Row: Plan Status & Most Popular */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground">Plan Active Status</div>
                  <div className="text-[11px] text-muted-foreground">
                    Active plans are visible to schools for onboarding, renewal, and upgrades.
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

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    Highlight as "Most Popular"
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Displays a recommended badge on public pricing & school upgrade cards.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPopular(isPopular === 1 ? 0 : 1)}
                  disabled={isSubmitting}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    isPopular === 1 ? "bg-amber-500" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isPopular === 1 ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Plan Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold">
                Plan Description
              </Label>
              <textarea
                id="description"
                rows={2}
                placeholder="Brief summary of institutions this tier is designed for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 text-foreground dark:bg-input/30"
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: Custom Features Repeater Card */}
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
                      2. Plan Highlights & Features
                    </CardTitle>
                    <Badge variant="secondary" className="text-[11px] font-mono">
                      {items.length} {items.length === 1 ? "feature" : "features"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Add custom feature bullet points displayed on plan comparison cards.
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
                Add Feature
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-border/70 text-center bg-muted/10 space-y-2">
                <Sparkles className="h-8 w-8 text-muted-foreground/40" />
                <div className="text-xs font-semibold text-foreground">
                  No additional feature highlights added yet
                </div>
                <p className="text-[11px] text-muted-foreground max-w-sm">
                  Gated modules above are automatically listed on pricing cards. Add extra highlights (e.g. Priority Support, Parent Mobile App) here.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-8 text-xs font-semibold gap-1.5 cursor-pointer mt-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add First Feature
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
                          Feature Name <span className="text-destructive">*</span>
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
                          <TableCell className="pl-4 text-center text-muted-foreground font-mono font-medium text-xs">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="min-w-[240px]">
                            <Input
                              placeholder="e.g. Student Attendance & Parent App"
                              value={item.item_name}
                              onChange={(e) => handleUpdateItem(idx, "item_name", e.target.value)}
                              disabled={isSubmitting}
                              className="h-8 text-xs"
                              required
                            />
                          </TableCell>
                          <TableCell className="min-w-[320px]">
                            <Input
                              placeholder="e.g. Real-time attendance & homework updates on iOS & Android"
                              value={item.description}
                              onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
                              disabled={isSubmitting}
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell className="text-center pr-4">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(idx)}
                              disabled={isSubmitting}
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Delete feature row"
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
                    Add Another Feature
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
            onClick={handleCancel}
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
                Creating Plan...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Create Plan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
