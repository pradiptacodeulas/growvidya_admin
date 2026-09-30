import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import { fetchAttendanceMachineByIdApi } from "@/services/attendanceMachineService"
import { getFullImageUrl } from "@/config/api"
import type { AttendanceMachine } from "@/types/attendanceMachine"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Cpu,
  IndianRupee,
  Layers,
  Wifi,
  Users,
  Pencil,
  FileText,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Calendar,
} from "lucide-react"
import { toast } from "sonner"

export default function AttendanceMachineDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)

  const [machine, setMachine] = useState<AttendanceMachine | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMachine = async (showLoading = true) => {
    if (!token || !id) return
    if (showLoading) setIsLoading(true)
    else setIsRefreshing(true)
    setError(null)

    try {
      const data = await fetchAttendanceMachineByIdApi(token, Number(id))
      setMachine(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load attendance machine."
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadMachine(true)
  }, [token, id])

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-72 w-full md:col-span-1 rounded-xl" />
          <Skeleton className="h-72 w-full md:col-span-2 rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !machine) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <Card className="border-destructive/40 p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-3 rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                Unable to Load Machine Details
              </h2>
              <p className="text-sm text-muted-foreground max-w-md">
                {error || "The requested attendance machine device record was not found."}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => navigate("/attendance-machines")}
                className="cursor-pointer"
              >
                Back to Machines
              </Button>
              <Button
                onClick={() => loadMachine(true)}
                className="gap-2 cursor-pointer"
              >
                <RefreshCw className="size-4" />
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const imageUrl = getFullImageUrl(machine.machine_image)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {machine.machine_name}
            </h1>
            <Badge
              variant="secondary"
              className={`text-xs font-semibold px-2 py-0.5 ${
                machine.status === 1
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {machine.status === 1 ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <XCircle className="size-3" />
                  Inactive
                </span>
              )}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-mono">
            Model: {machine.model_number || "—"} • Brand: {machine.brand || "—"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMachine(false)}
            disabled={isRefreshing}
            className="gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/attendance-machines/${machine.id}/edit`)}
            className="gap-1.5 cursor-pointer"
          >
            <Pencil className="size-3.5" />
            Edit Device
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Image & Commercials */}
        <div className="space-y-6">
          {/* Device Image Preview */}
          <Card className="overflow-hidden border-border/80 shadow-xs">
            <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Cpu className="size-3.5 text-primary" />
                Device Image
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex items-center justify-center bg-muted/10 min-h-[220px]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={machine.machine_name}
                  className="max-h-52 w-full object-contain p-2 hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 p-6 text-center">
                  <Cpu className="size-16 stroke-1 text-muted-foreground/40" />
                  <span className="text-xs">No device photo uploaded</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing & Commercials */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <IndianRupee className="size-3.5 text-primary" />
                Commercials & Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-0.5">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">
                  Unit Hardware Price
                </span>
                <p className="text-2xl font-bold tracking-tight text-primary">
                  ₹{Number(machine.unit_price || 0).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-0.5">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">
                  Annual Maintenance (AMC)
                </span>
                <p className="text-lg font-semibold text-foreground">
                  {machine.amc_price
                    ? `₹${Number(machine.amc_price).toLocaleString("en-IN")}/year`
                    : "Included / None"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Device Specifications & Hardware Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Hardware & Classification */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" />
                Hardware Classification & Capacity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1">
                <span className="text-muted-foreground text-[11px] uppercase">Device Type</span>
                <p className="font-semibold text-foreground text-sm uppercase">
                  {machine.machine_type}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1">
                <span className="text-muted-foreground text-[11px] uppercase">Model SKU</span>
                <p className="font-semibold font-mono text-foreground text-sm">
                  {machine.model_number || "—"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1">
                <span className="text-muted-foreground text-[11px] uppercase">Manufacturer / Brand</span>
                <p className="font-semibold text-foreground text-sm">
                  {machine.brand || "—"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1">
                <span className="text-muted-foreground text-[11px] uppercase">Current Operational Status</span>
                <p className="font-semibold text-foreground text-sm">
                  {machine.status === 1 ? "Active (Catalog Visible)" : "Inactive"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1">
                <span className="text-muted-foreground text-[11px] uppercase flex items-center gap-1">
                  <Users className="size-3 text-muted-foreground" />
                  User Capacity
                </span>
                <p className="font-semibold text-foreground text-sm">
                  {machine.user_capacity
                    ? `${Number(machine.user_capacity).toLocaleString()} users`
                    : "1,000 users"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1">
                <span className="text-muted-foreground text-[11px] uppercase flex items-center gap-1">
                  <FileText className="size-3 text-muted-foreground" />
                  Log Capacity
                </span>
                <p className="font-semibold text-foreground text-sm">
                  {machine.log_capacity
                    ? `${Number(machine.log_capacity).toLocaleString()} records`
                    : "100,000 records"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1">
                <span className="text-muted-foreground text-[11px] uppercase flex items-center gap-1">
                  <Wifi className="size-3 text-muted-foreground" />
                  Network & Connectivity
                </span>
                <p className="font-semibold text-foreground text-sm">
                  {machine.connectivity || "LAN, Wi-Fi"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1">
                <span className="text-muted-foreground text-[11px] uppercase flex items-center gap-1">
                  <Layers className="size-3 text-muted-foreground" />
                  Data Push Protocol
                </span>
                <p className="font-semibold text-foreground text-sm">
                  {machine.push_protocol || "ADMS / Cloud Push"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Technical Specifications & Configuration Notes */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" />
                Specifications & Engineering Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {machine.specifications ? (
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans">
                  {machine.specifications}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No additional technical specifications or configuration notes provided.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Audit Timestamps */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              Registered: {machine.created_at || "—"}
            </span>
            <span>Last Updated: {machine.updated_at || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
