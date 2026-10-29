import { useState, useId } from "react"
import { useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import { useDraftState, clearFormDraft } from "@/hooks/useFormDraft"
import { createCouponApi } from "@/services/couponService"
import type { DiscountType, CouponScope } from "@/types/coupon"
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
import {
  ArrowLeft,
  Ticket,
  Percent,
  IndianRupee,
  Calendar,
  CheckCircle2,
  Loader2,
  Sparkles,
  Layers,
  Calculator,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

const STATUS_OPTIONS = [
  { value: "1", label: "Active" },
  { value: "0", label: "Inactive" },
]

const STATUS_LABELS: Record<string, string> = {
  "1": "Active",
  "0": "Inactive",
}

const DISCOUNT_TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage Discount (%)" },
  { value: "fixed", label: "Fixed Flat Discount (₹)" },
]

const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percentage: "Percentage Discount (%)",
  fixed: "Fixed Flat Discount (₹)",
}

const SCOPE_OPTIONS: { value: CouponScope; label: string }[] = [
  {
    value: "plan_only",
    label: "Software Plan Only (Protects Hardware & SMS Costs) — Recommended",
  },
  {
    value: "software_and_storage",
    label: "Software Plan + Cloud Storage Add-ons",
  },
  {
    value: "all",
    label: "Entire Order Cart (Software + Hardware + Credits)",
  },
]

const SCOPE_LABELS: Record<CouponScope, string> = {
  plan_only: "Software Plan Only (Recommended)",
  software_and_storage: "Software Plan + Cloud Storage",
  all: "Entire Order Cart",
}

const FORM_DRAFT_KEY = "create_coupon"

export default function CreateCoupon() {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)
  const isSubmittingId = useId()

  const [code, setCode] = useDraftState(FORM_DRAFT_KEY, "code", "")
  const [description, setDescription] = useDraftState(FORM_DRAFT_KEY, "description", "")
  const [discountType, setDiscountType] = useDraftState<DiscountType>(FORM_DRAFT_KEY, "discountType", "percentage")
  const [discountValue, setDiscountValue] = useDraftState(FORM_DRAFT_KEY, "discountValue", "")
  const [applicableScope, setApplicableScope] = useDraftState<CouponScope>(FORM_DRAFT_KEY, "applicableScope", "plan_only")
  const [minOrderAmount, setMinOrderAmount] = useDraftState(FORM_DRAFT_KEY, "minOrderAmount", "")
  const [maxDiscountAmount, setMaxDiscountAmount] = useDraftState(FORM_DRAFT_KEY, "maxDiscountAmount", "")
  const [startDate, setStartDate] = useDraftState(FORM_DRAFT_KEY, "startDate", "")
  const [endDate, setEndDate] = useDraftState(FORM_DRAFT_KEY, "endDate", "")
  const [maxUses, setMaxUses] = useDraftState(FORM_DRAFT_KEY, "maxUses", "")
  const [maxUsesPerUser, setMaxUsesPerUser] = useDraftState(FORM_DRAFT_KEY, "maxUsesPerUser", "1")
  const [status, setStatus] = useDraftState<1 | 0>(FORM_DRAFT_KEY, "status", 1)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sampleOrderAmount, setSampleOrderAmount] = useDraftState<string>(FORM_DRAFT_KEY, "sampleOrderAmount", "5000")

  const handleCancel = () => {
    clearFormDraft(FORM_DRAFT_KEY)
    navigate("/coupons")
  }

  const numericDiscountVal = parseFloat(discountValue) || 0
  const numericMinOrder = parseFloat(minOrderAmount) || 0
  const numericMaxCap = maxDiscountAmount ? parseFloat(maxDiscountAmount) : null
  const numericSampleOrder = parseFloat(sampleOrderAmount) || 0

  let simulatedDiscount = 0
  let simulatedEligibilityError = ""

  if (numericSampleOrder > 0) {
    if (numericMinOrder > 0 && numericSampleOrder < numericMinOrder) {
      simulatedEligibilityError = `Eligible subtotal below min ₹${numericMinOrder.toLocaleString("en-IN")}`
    } else {
      if (discountType === "percentage") {
        simulatedDiscount = (numericSampleOrder * numericDiscountVal) / 100
        if (numericMaxCap && simulatedDiscount > numericMaxCap) {
          simulatedDiscount = numericMaxCap
        }
      } else {
        simulatedDiscount = numericDiscountVal
      }
      if (simulatedDiscount > numericSampleOrder) {
        simulatedDiscount = numericSampleOrder
      }
    }
  }

  const simulatedFinalPrice = Math.max(0, numericSampleOrder - simulatedDiscount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast.error("Authentication required. Please log in.")
      return
    }

    const cleanCode = code.trim().toUpperCase()
    if (!cleanCode) {
      toast.error("Coupon code is required.")
      return
    }

    if (!discountValue || isNaN(Number(discountValue)) || Number(discountValue) <= 0) {
      toast.error("Please enter a valid positive discount value.")
      return
    }

    if (discountType === "percentage" && Number(discountValue) > 100) {
      toast.error("Percentage discount cannot exceed 100%.")
      return
    }

    const parsedPerUser = parseInt(maxUsesPerUser, 10)
    if (!maxUsesPerUser || isNaN(parsedPerUser) || parsedPerUser < 1) {
      toast.error("Please enter a valid positive integer (>= 1) for Usage Limit Per User.")
      return
    }

    const parsedMaxUses = maxUses ? parseInt(maxUses, 10) : null
    if (parsedMaxUses !== null && (isNaN(parsedMaxUses) || parsedMaxUses < 1)) {
      toast.error("Total usage limit must be a positive integer.")
      return
    }

    if (parsedMaxUses !== null && parsedPerUser > parsedMaxUses) {
      toast.error("Usage Limit Per User cannot exceed Total Usage Limit.")
      return
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.error("End date cannot be earlier than start date.")
      return
    }

    setIsSubmitting(true)

    try {
      await createCouponApi(token, {
        code: cleanCode,
        description: description.trim() || undefined,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        applicable_scope: applicableScope,
        min_order_amount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
        max_discount_amount:
          discountType === "percentage" && maxDiscountAmount
            ? parseFloat(maxDiscountAmount)
            : null,
        start_date: startDate || null,
        end_date: endDate || null,
        max_uses: parsedMaxUses,
        max_uses_per_user: parsedPerUser,
        status,
      })

      toast.success(`Coupon "${cleanCode}" created successfully!`)
      clearFormDraft(FORM_DRAFT_KEY)
      navigate("/coupons")
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to create coupon."
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate("/coupons")}
            className="h-9 w-9 cursor-pointer shrink-0"
            title="Back to Coupons"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Ticket className="h-6 w-6 text-primary" />
              <span>Create Promotional Coupon</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:self-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="cursor-pointer h-9 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={isSubmittingId}
            disabled={isSubmitting}
            className="cursor-pointer h-9 text-xs gap-1.5 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Coupon...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Create Coupon</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form id={isSubmittingId} onSubmit={handleSubmit} className="space-y-6">
            {/* Card 1: Core Code & Discount Rules */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Coupon Code & Discount Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="coupon-code" className="text-xs font-semibold">
                      Coupon Code <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="coupon-code"
                        placeholder="e.g. GROWVIDYA20"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        required
                        className="font-mono uppercase tracking-wider text-sm pl-9"
                      />
                      <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="discount-type" className="text-xs font-semibold">
                      Discount Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={discountType}
                      onValueChange={(val) => {
                        if (val) setDiscountType(val as DiscountType)
                      }}
                      items={DISCOUNT_TYPE_OPTIONS}
                      itemToStringLabel={(val) =>
                        DISCOUNT_TYPE_LABELS[val as DiscountType] || String(val || "")
                      }
                    >
                      <SelectTrigger id="discount-type" className="w-full">
                        <SelectValue placeholder="Select discount type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISCOUNT_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="discount-value" className="text-xs font-semibold">
                      {discountType === "percentage" ? "Discount Rate (%)" : "Flat Amount (₹)"}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="discount-value"
                        type="number"
                        min="0"
                        max={discountType === "percentage" ? 100 : undefined}
                        step={discountType === "percentage" ? "0.1" : "1"}
                        placeholder={discountType === "percentage" ? "e.g. 20" : "e.g. 500"}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        required
                        className="pl-9"
                      />
                      {discountType === "percentage" ? (
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      ) : (
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Applicable Discount Scope (Cost Protection) */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="applicable-scope" className="text-xs font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Applicable Discount Scope (Margin Protection)
                    </Label>
                    <Select
                      value={applicableScope}
                      onValueChange={(val) => {
                        if (val) setApplicableScope(val as CouponScope)
                      }}
                      items={SCOPE_OPTIONS}
                      itemToStringLabel={(val) =>
                        SCOPE_LABELS[val as CouponScope] || String(val || "")
                      }
                    >
                      <SelectTrigger id="applicable-scope" className="w-full">
                        <SelectValue placeholder="Select applicable scope" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCOPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      "Software Plan Only" prevents promotional SaaS coupons from discounting physical RFID cards, biometric machines, or prepaid SMS credits below cost.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold">
                    Description / Marketing Note (Optional)
                  </Label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="e.g. 20% discount on all Annual SaaS packages for early school onboarding."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed dark:bg-input/30"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Order Thresholds & Caps */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Order Limits & Safeguards</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="min-order-amount" className="text-xs font-semibold">
                    Minimum Eligible Amount (₹)
                  </Label>
                  <div className="relative">
                    <Input
                      id="min-order-amount"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0 (No minimum)"
                      value={minOrderAmount}
                      onChange={(e) => setMinOrderAmount(e.target.value)}
                      className="pl-9"
                    />
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="max-discount-amount" className="text-xs font-semibold">
                    Maximum Discount Cap (₹)
                  </Label>
                  <div className="relative">
                    <Input
                      id="max-discount-amount"
                      type="number"
                      min="0"
                      step="1"
                      placeholder={
                        discountType === "fixed" ? "N/A for fixed discount" : "No upper cap"
                      }
                      value={maxDiscountAmount}
                      onChange={(e) => setMaxDiscountAmount(e.target.value)}
                      disabled={discountType === "fixed"}
                      className="pl-9"
                    />
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Validity Schedule & Limits */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Validity Period & Usage Limits</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="start-date" className="text-xs font-semibold">
                      Start Date (IST)
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="end-date" className="text-xs font-semibold">
                      Expiry Date (IST)
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="max-uses" className="text-xs font-semibold">
                      Total Usage Limit (All Schools)
                    </Label>
                    <Input
                      id="max-uses"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Unlimited total uses"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="max-uses-per-user" className="text-xs font-semibold">
                      Usage Limit Per School <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="max-uses-per-user"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 1"
                      value={maxUsesPerUser}
                      onChange={(e) => setMaxUsesPerUser(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="status-select" className="text-xs font-semibold">
                      Initial Status
                    </Label>
                    <Select
                      value={String(status)}
                      onValueChange={(val) => {
                        if (val !== null && val !== undefined) {
                          setStatus(Number(val) as 1 | 0)
                        }
                      }}
                      items={STATUS_OPTIONS}
                      itemToStringLabel={(val) => STATUS_LABELS[String(val)] || String(val || "")}
                    >
                      <SelectTrigger id="status-select" className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer gap-1.5 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating Coupon...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Create Coupon</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Coupon Preview & Interactive Calculator */}
        <div className="space-y-6">
          <Card className="border border-border/80 shadow-xs sticky top-20">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Ticket className="h-4 w-4 text-primary" />
                <span>Live Coupon Preview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="p-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center text-center space-y-2">
                <span className="font-mono text-xl font-bold tracking-widest px-3 py-1 rounded-lg bg-background border border-border shadow-xs text-primary">
                  {code.trim() ? code.trim().toUpperCase() : "COUPONCODE"}
                </span>

                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  <Badge variant="secondary" className="font-bold text-xs gap-1 py-0.5 px-2">
                    {discountType === "percentage" ? (
                      <Percent className="h-3 w-3 text-primary" />
                    ) : (
                      <IndianRupee className="h-3 w-3 text-primary" />
                    )}
                    {numericDiscountVal > 0
                      ? discountType === "percentage"
                        ? `${numericDiscountVal}% OFF`
                        : `₹${numericDiscountVal.toLocaleString("en-IN")} FLAT OFF`
                      : "0 OFF"}
                  </Badge>
                  {status === 1 ? (
                    <Badge variant="default" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Draft
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">
                  {description.trim() || "No description specified yet."}
                </p>
              </div>

              <div className="space-y-2 text-xs border-t border-border/60 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Applies To:</span>
                  <span className="font-semibold text-primary">
                    {SCOPE_LABELS[applicableScope]}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Min Eligible Amount:</span>
                  <span className="font-semibold text-foreground">
                    {numericMinOrder > 0 ? `₹${numericMinOrder.toLocaleString("en-IN")}` : "None"}
                  </span>
                </div>
                {discountType === "percentage" && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Discount Ceiling Cap:</span>
                    <span className="font-semibold text-foreground">
                      {numericMaxCap ? `₹${numericMaxCap.toLocaleString("en-IN")}` : "No limit"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Validity:</span>
                  <span className="font-semibold text-foreground">
                    {startDate || endDate
                      ? `${startDate || "Open"} to ${endDate || "Ongoing"}`
                      : "Always Valid"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Usage Limit:</span>
                  <span className="font-semibold text-foreground">
                    {maxUses ? `${maxUses} total redemptions` : "Unlimited"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Limit Per School:</span>
                  <span className="font-semibold text-primary">
                    {parseInt(maxUsesPerUser, 10) || 1}{" "}
                    {(parseInt(maxUsesPerUser, 10) || 1) === 1 ? "time" : "times"} / school
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-border bg-muted/30 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Calculator className="h-3.5 w-3.5 text-primary" />
                  <span>Interactive Zero-GST Simulator</span>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sample-order" className="text-[11px] text-muted-foreground">
                    Test Eligible Subtotal (₹)
                  </Label>
                  <Input
                    id="sample-order"
                    type="number"
                    min="0"
                    step="100"
                    value={sampleOrderAmount}
                    onChange={(e) => setSampleOrderAmount(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                {simulatedEligibilityError ? (
                  <div className="p-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
                    {simulatedEligibilityError}
                  </div>
                ) : (
                  <div className="space-y-1.5 text-xs pt-1 border-t border-border/50">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Original Price:</span>
                      <span>₹{numericSampleOrder.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>Discount Saved:</span>
                      <span>-₹{simulatedDiscount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/40">
                      <span>Final Net Total (Zero GST):</span>
                      <span>₹{simulatedFinalPrice.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
