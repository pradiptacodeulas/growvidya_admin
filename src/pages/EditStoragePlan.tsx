import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router"
import { useAppSelector } from "@/store/store"
import {
  fetchStoragePlanByIdApi,
  fetchCapacityUnitsApi,
  updateStoragePlanApi,
} from "@/services/storagePlanService"
import type { CapacityUnit, UpdateStoragePlanPayload } from "@/types/storagePlan"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  HardDrive,
  IndianRupee,
  FileText,
  Loader2,
  CheckCircle2,
  Database,
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

export default function EditStoragePlan() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const token = useAppSelector((state) => state.auth.token)

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Units state
  const [units, setUnits] = useState<CapacityUnit[]>([])
  const [isLoadingUnits, setIsLoadingUnits] = useState(true)

  // Form State
  const [planName, setPlanName] = useState("")
  const [storageCapacity, setStorageCapacity] = useState("")
  const [capacityUnitId, setCapacityUnitId] = useState<string>("")
  const [monthlyPrice, setMonthlyPrice] = useState("")
  const [annualPrice, setAnnualPrice] = useState("")
  const [status, setStatus] = useState<number>(1)
  const [description, setDescription] = useState("")

  // Fetch Units and Storage Plan Details (strictly NO fallback mock data)
  useEffect(() => {
    async function loadData() {
      if (!token || !id) return
      setIsLoading(true)
      setIsLoadingUnits(true)

      try {
        const [unitsData, planData] = await Promise.all([
          fetchCapacityUnitsApi(token),
          fetchStoragePlanByIdApi(token, Number(id)),
        ])

        setUnits(unitsData || [])
        setIsLoadingUnits(false)

        if (planData) {
          setPlanName(planData.plan_name || "")
          setStorageCapacity(String(planData.storage_capacity ?? ""))
          setCapacityUnitId(String(planData.capacity_unit_id ?? ""))
          setMonthlyPrice(String(planData.monthly_price ?? ""))
          setAnnualPrice(String(planData.annual_price ?? ""))
          setStatus(Number(planData.status))
          setDescription(planData.description || "")
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load storage plan details."
        toast.error(message)
        navigate("/storage-plans")
      } finally {
        setIsLoading(false)
        setIsLoadingUnits(false)
      }
    }

    loadData()
  }, [token, id, navigate])

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !id) return

    if (!planName.trim()) {
      toast.error("Please provide a plan name.")
      return
    }

    const cap = parseInt(storageCapacity, 10)
    if (isNaN(cap) || cap <= 0) {
      toast.error("Please enter a valid positive storage capacity.")
      return
    }

    if (!capacityUnitId) {
      toast.error("Please select a capacity unit.")
      return
    }

    const mPrice = parseFloat(monthlyPrice)
    if (isNaN(mPrice) || mPrice < 0) {
      toast.error("Please provide a valid monthly price.")
      return
    }

    const aPrice = parseFloat(annualPrice)
    if (isNaN(aPrice) || aPrice < 0) {
      toast.error("Please provide a valid annual price.")
      return
    }

    setIsSubmitting(true)
    try {
      const payload: UpdateStoragePlanPayload = {
        plan_name: planName.trim(),
        storage_capacity: cap,
        capacity_unit_id: Number(capacityUnitId),
        monthly_price: mPrice,
        annual_price: aPrice,
        status,
        description: description.trim(),
      }

      const result = await updateStoragePlanApi(token, Number(id), payload)
      toast.success(`Storage plan "${result.plan_name}" updated successfully!`)
      navigate("/storage-plans")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update storage plan."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const unitOptions = units.map((u) => ({
    value: String(u.id),
    label: `${u.unit_code} (${u.unit_name})`,
  }))

  const unitLabels = units.reduce<Record<string, string>>((acc, u) => {
    acc[String(u.id)] = `${u.unit_code} (${u.unit_name})`
    return acc
  }, {})

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card className="p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header - No back arrow, No top action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HardDrive className="size-6 text-primary" />
            Edit Storage Plan
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Update cloud capacity, monthly/annual fees, and active status for this plan.
          </p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Storage Capacity Details */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Database className="size-4 text-primary" />
              <span>Plan Information & Capacity</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Plan title, cloud volume size, and capacity unit.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Plan Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="plan_name" className="text-xs font-semibold">
                Plan Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="plan_name"
                placeholder="e.g. 100 GB Standard Cloud Storage"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Public display name shown in subscription plans and invoice summaries.
              </p>
            </div>

            {/* Storage Capacity */}
            <div className="space-y-1.5">
              <Label htmlFor="storage_capacity" className="text-xs font-semibold">
                Storage Capacity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="storage_capacity"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 100"
                value={storageCapacity}
                onChange={(e) => setStorageCapacity(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Numeric quantity of storage allocated to this plan.
              </p>
            </div>

            {/* Capacity Unit (Shadcn Select) */}
            <div className="space-y-1.5">
              <Label htmlFor="capacity_unit_id" className="text-xs font-semibold">
                Capacity Unit <span className="text-destructive">*</span>
              </Label>
              <Select
                value={capacityUnitId}
                onValueChange={(val) => {
                  if (val) setCapacityUnitId(val)
                }}
                disabled={isLoadingUnits}
                items={unitOptions}
                itemToStringLabel={(val) => unitLabels[String(val)] || String(val || "")}
              >
                <SelectTrigger id="capacity_unit_id" className="w-full h-9 text-xs">
                  <SelectValue placeholder={isLoadingUnits ? "Loading units..." : "Select Unit"} />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Standard unit of measurement (MB, GB, TB).
              </p>
            </div>

            {/* Status (Shadcn Select) */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="status" className="text-xs font-semibold">
                Status
              </Label>
              <Select
                value={String(status)}
                onValueChange={(val) => {
                  if (val !== undefined && val !== null) setStatus(Number(val))
                }}
                items={STATUS_OPTIONS}
                itemToStringLabel={(val) => STATUS_LABELS[String(val)] || String(val || "")}
              >
                <SelectTrigger id="status" className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Active plans are immediately visible to schools subscribing to add-on storage.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Commercials & Pricing */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <IndianRupee className="size-4 text-primary" />
              <span>Subscription Pricing</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Billing fees for monthly and annual billing cycles.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Monthly Price */}
            <div className="space-y-1.5">
              <Label htmlFor="monthly_price" className="text-xs font-semibold">
                Monthly Price (INR) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">
                  ₹
                </span>
                <Input
                  id="monthly_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                  className="pl-7"
                  required
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Recurring charge per month for this storage tier.
              </p>
            </div>

            {/* Annual Price */}
            <div className="space-y-1.5">
              <Label htmlFor="annual_price" className="text-xs font-semibold">
                Annual Price (INR) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">
                  ₹
                </span>
                <Input
                  id="annual_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={annualPrice}
                  onChange={(e) => setAnnualPrice(e.target.value)}
                  className="pl-7"
                  required
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Yearly discounted billing charge for this tier.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Description */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <FileText className="size-4 text-primary" />
              <span>Description & Inclusions</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Explain intended usage, data retention, or school size suitability.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-2">
            <textarea
              id="description"
              rows={4}
              placeholder="e.g. Additional high-speed cloud storage for student documents, CCTV backups, and educational media files with 99.9% uptime SLA."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </CardContent>
        </Card>

        {/* Bottom Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/storage-plans")}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="gap-2 cursor-pointer shadow-xs min-w-36"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
