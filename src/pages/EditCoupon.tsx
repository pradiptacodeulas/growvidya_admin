import { useState, useEffect, useId } from "react"
import { useParams, useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import { fetchCouponByIdApi, updateCouponApi } from "@/services/couponService"
import type { DiscountType } from "@/types/coupon"
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
  ArrowLeft,
  Ticket,
  Percent,
  IndianRupee,
  Calendar,
  CheckCircle2,
  Loader2,
  Sparkles,
  Layers,
  AlertCircle,
  RefreshCw,
  Calculator,
} from "lucide-react"
import { toast } from "sonner"

export default function EditCoupon() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)
  const formId = useId()

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")
  const [discountType, setDiscountType] = useState<DiscountType>("percentage")
  const [discountValue, setDiscountValue] = useState("")
  const [minOrderAmount, setMinOrderAmount] = useState("")
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [maxUses, setMaxUses] = useState("")
  const [status, setStatus] = useState<1 | 0>(1)

  // Interactive Live Calculator Test Value
  const [sampleOrderAmount, setSampleOrderAmount] = useState<string>("5000")

  // Load Coupon Details
  useEffect(() => {
    if (!id) {
      setLoadError("Invalid coupon ID.")
      setIsLoading(false)
      return
    }

    if (!token) return

    let isMounted = true
    setIsLoading(true)
    setLoadError(null)

    fetchCouponByIdApi(token, id)
      .then((coupon) => {
        if (!isMounted) return
        setCode(coupon.code || "")
        setDescription(coupon.description || "")
        setDiscountType((coupon.discount_type as DiscountType) || "percentage")
        setDiscountValue(coupon.discount_value ? String(coupon.discount_value) : "")
        setMinOrderAmount(coupon.min_order_amount ? String(coupon.min_order_amount) : "")
        setMaxDiscountAmount(coupon.max_discount_amount ? String(coupon.max_discount_amount) : "")
        setStartDate(coupon.start_date ? coupon.start_date.slice(0, 10) : "")
        setEndDate(coupon.end_date ? coupon.end_date.slice(0, 10) : "")
        setMaxUses(coupon.max_uses ? String(coupon.max_uses) : "")
        setStatus(coupon.status === 1 ? 1 : 0)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        const msg = err instanceof Error ? err.message : "Failed to load coupon details."
        setLoadError(msg)
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id, token])

  // Live preview calculations
  const numericDiscountVal = parseFloat(discountValue) || 0
  const numericMinOrder = parseFloat(minOrderAmount) || 0
  const numericMaxCap = maxDiscountAmount ? parseFloat(maxDiscountAmount) : null
  const numericSampleOrder = parseFloat(sampleOrderAmount) || 0

  let simulatedDiscount = 0
  let simulatedEligibilityError = ""

  if (numericSampleOrder > 0) {
    if (numericMinOrder > 0 && numericSampleOrder < numericMinOrder) {
      simulatedEligibilityError = `Order below min ₹${numericMinOrder.toLocaleString("en-IN")}`
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
    if (!token || !id) {
      toast.error("Authentication required.")
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

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.error("End date cannot be earlier than start date.")
      return
    }

    setIsSubmitting(true)

    try {
      await updateCouponApi(token, id, {
        code: cleanCode,
        description: description.trim() || undefined,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        min_order_amount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
        max_discount_amount:
          discountType === "percentage" && maxDiscountAmount
            ? parseFloat(maxDiscountAmount)
            : null,
        start_date: startDate || null,
        end_date: endDate || null,
        max_uses: maxUses ? parseInt(maxUses, 10) : null,
        status,
      })

      toast.success(`Coupon "${cleanCode}" updated successfully!`)
      navigate(`/coupons/${id}`)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to update coupon."
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
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
              <span>Edit Coupon {code ? `(${code})` : ""}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Modify discount rates, redemption caps, and validity parameters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:self-center">
          <Button
            type="submit"
            form={formId}
            disabled={isSubmitting || isLoading || Boolean(loadError)}
            className="cursor-pointer h-9 text-xs gap-1.5 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {loadError && !isLoading && (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-destructive">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <div>
                <h3 className="font-semibold text-base">Unable to load coupon</h3>
                <p className="text-xs text-destructive/80 mt-0.5">{loadError}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="h-8 text-xs font-semibold border-destructive/40 text-destructive hover:bg-destructive/20 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Retry
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/coupons")}
                className="h-8 text-xs font-semibold cursor-pointer"
              >
                Return to Coupons
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <Card className="p-6 border-border/70">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        </div>
      ) : !loadError ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form */}
          <div className="lg:col-span-2">
            <form id={formId} onSubmit={handleSubmit} className="space-y-6">
              {/* Card 1: Core Identification */}
              <Card className="border border-border/80 shadow-xs">
                <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Coupon Identification & Type</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Primary promo code and discount model.
                  </CardDescription>
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
                        onValueChange={(val) => setDiscountType(val as DiscountType)}
                      >
                        <SelectTrigger id="discount-type" className="w-full">
                          <SelectValue placeholder="Select discount type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage Discount (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Flat Discount (₹)</SelectItem>
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

              {/* Card 2: Order Rules & Limits */}
              <Card className="border border-border/80 shadow-xs">
                <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Layers className="h-4 w-4 text-primary" />
                    <span>Order Conditions & Caps</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Set minimum purchase amount and maximum discount ceilings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="min-order-amount" className="text-xs font-semibold">
                      Minimum Order Amount (₹)
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

              {/* Card 3: Validity Period & Usage Limits */}
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
                        Start Date
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
                        Expiry Date
                      </Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="max-uses" className="text-xs font-semibold">
                        Total Usage Limit
                      </Label>
                      <Input
                        id="max-uses"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Unlimited uses"
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/coupons/${id}`)}
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
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Preview & Calculator */}
          <div className="space-y-6">
            <Card className="border border-border/80 shadow-xs sticky top-20">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Ticket className="h-4 w-4 text-primary" />
                  <span>Coupon Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div className="p-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center text-center space-y-2">
                  <span className="font-mono text-xl font-bold tracking-widest px-3 py-1 rounded-lg bg-background border border-border shadow-xs text-primary">
                    {code.trim() ? code.trim().toUpperCase() : "COUPONCODE"}
                  </span>

                  <div className="flex items-center gap-1.5">
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
                        Inactive
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">
                    {description.trim() || "No description specified."}
                  </p>
                </div>

                <div className="space-y-2 text-xs border-t border-border/60 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Min Order Amount:</span>
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
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-muted/30 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Calculator className="h-3.5 w-3.5 text-primary" />
                    <span>Interactive Test Simulator</span>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="sample-order" className="text-[11px] text-muted-foreground">
                      Test Order Subtotal (₹)
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
                        <span>Final Net Total:</span>
                        <span>₹{simulatedFinalPrice.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
