import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router"
import { useAppSelector } from "@/store/store"
import {
  fetchAttendanceMachineByIdApi,
  updateAttendanceMachineApi,
} from "@/services/attendanceMachineService"
import type { UpdateAttendanceMachinePayload, MachineType } from "@/types/attendanceMachine"
import { getFullImageUrl } from "@/config/api"
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
  ArrowLeft,
  Cpu,
  IndianRupee,
  Layers,
  Wifi,
  Users,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
} from "lucide-react"
import { toast } from "sonner"

const MACHINE_TYPES = [
  { value: "hybrid", label: "Hybrid (Face + Biometric)" },
  { value: "biometric", label: "Biometric (Fingerprint)" },
  { value: "facial", label: "Facial Recognition" },
]

const STATUS_OPTIONS = [
  { value: "1", label: "Active" },
  { value: "0", label: "Inactive" },
]

const STATUS_LABELS: Record<string, string> = {
  "1": "Active",
  "0": "Inactive",
}

const MACHINE_TYPE_LABELS: Record<string, string> = {
  hybrid: "Hybrid (Face + Biometric)",
  biometric: "Biometric (Fingerprint)",
  facial: "Facial Recognition",
  rfid: "RFID Card Terminal",
}

const PUSH_PROTOCOLS = [
  { value: "ADMS / Cloud Push", label: "ADMS / Cloud Push" },
  { value: "HTTP / Webhook Push", label: "HTTP / Webhook Push" },
  { value: "TCP/IP Direct Sync", label: "TCP/IP Direct Sync" },
  { value: "MQTT IoT Stream", label: "MQTT IoT Stream" },
]

const CONNECTIVITY_PRESETS = [
  { value: "LAN, Wi-Fi", label: "LAN, Wi-Fi" },
  { value: "Wi-Fi, LAN, USB", label: "Wi-Fi, LAN, USB" },
  { value: "Wi-Fi, 4G, LAN, USB", label: "Wi-Fi, 4G, LAN, USB" },
  { value: "LAN, USB", label: "LAN, USB (Wired)" },
  { value: "Wi-Fi only", label: "Wi-Fi only" },
]

export default function EditAttendanceMachine() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)

  // Form State
  const [machineName, setMachineName] = useState("")
  const [modelNumber, setModelNumber] = useState("")
  const [brand, setBrand] = useState("")
  const [machineType, setMachineType] = useState<MachineType>("hybrid")
  const [connectivity, setConnectivity] = useState("LAN, Wi-Fi")
  const [userCapacity, setUserCapacity] = useState("1000")
  const [logCapacity, setLogCapacity] = useState("100000")
  const [pushProtocol, setPushProtocol] = useState("ADMS / Cloud Push")
  const [unitPrice, setUnitPrice] = useState("")
  const [amcPrice, setAmcPrice] = useState("")
  const [status, setStatus] = useState<number>(1)
  const [specifications, setSpecifications] = useState("")

  // Load Existing Machine Data (NO mock data)
  useEffect(() => {
    if (!token || !id) return

    const loadData = async () => {
      setIsLoading(true)
      try {
        const machine = await fetchAttendanceMachineByIdApi(token, Number(id))
        setMachineName(machine.machine_name || "")
        setModelNumber(machine.model_number || "")
        setBrand(machine.brand || "")
        setMachineType(machine.machine_type || "hybrid")
        setConnectivity(machine.connectivity || "LAN, Wi-Fi")
        setUserCapacity(machine.user_capacity !== undefined ? String(machine.user_capacity) : "1000")
        setLogCapacity(machine.log_capacity !== undefined ? String(machine.log_capacity) : "100000")
        setPushProtocol(machine.push_protocol || "ADMS / Cloud Push")
        setUnitPrice(machine.unit_price !== undefined ? String(machine.unit_price) : "")
        setAmcPrice(machine.amc_price !== undefined ? String(machine.amc_price) : "")
        setStatus(machine.status)
        setSpecifications(machine.specifications || "")
        if (machine.machine_image) {
          setFilePreview(getFullImageUrl(machine.machine_image))
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load attendance machine."
        toast.error(message)
        navigate("/attendance-machines")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [token, id, navigate])

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit. Please choose a smaller image.")
      return
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, JPEG, WEBP, SVG).")
      return
    }

    setSelectedFile(file)
    setFilePreview(URL.createObjectURL(file))
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Handle Submission (NO mock data)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !id) return

    if (!machineName.trim()) {
      toast.error("Machine Name is required.")
      return
    }

    if (!modelNumber.trim()) {
      toast.error("Model Number / SKU is required.")
      return
    }

    if (!brand.trim()) {
      toast.error("Brand / Manufacturer name is required.")
      return
    }

    if (!unitPrice.trim() || isNaN(Number(unitPrice)) || Number(unitPrice) < 0) {
      toast.error("Please provide a valid unit price.")
      return
    }

    setIsSubmitting(true)
    try {
      const payload: UpdateAttendanceMachinePayload = {
        machine_name: machineName.trim(),
        model_number: modelNumber.trim(),
        brand: brand.trim(),
        machine_type: machineType,
        connectivity: connectivity.trim(),
        user_capacity: userCapacity ? Number(userCapacity) : 1000,
        log_capacity: logCapacity ? Number(logCapacity) : 100000,
        push_protocol: pushProtocol.trim(),
        unit_price: Number(unitPrice),
        amc_price: amcPrice ? Number(amcPrice) : 0,
        status,
        specifications: specifications.trim(),
        ...(selectedFile ? { machine_image: selectedFile } : {}),
      }

      const result = await updateAttendanceMachineApi(token, Number(id), payload)
      toast.success(`Attendance machine "${result.machine_name}" updated successfully!`)
      navigate("/attendance-machines")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update attendance machine."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate("/attendance-machines")}
            className="cursor-pointer size-9 rounded-lg hover:bg-muted"
            title="Back to Attendance Machines"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Cpu className="size-6 text-primary" />
              Edit Attendance Machine
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Update technical specifications, pricing, and hardware configurations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/attendance-machines")}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Update Machine
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Basic Information */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Cpu className="size-4 text-primary" />
              <span>Device Information</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Primary identification, brand, and hardware classification.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Machine Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="machine_name" className="text-xs font-semibold">
                Machine Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="machine_name"
                placeholder="e.g. ZKTeco MB20 Face & Fingerprint Terminal"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                required
              />
            </div>

            {/* Model Number */}
            <div className="space-y-1.5">
              <Label htmlFor="model_number" className="text-xs font-semibold">
                Model Number / SKU <span className="text-destructive">*</span>
              </Label>
              <Input
                id="model_number"
                placeholder="e.g. ZK-MB20-PRO"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                required
              />
            </div>

            {/* Brand */}
            <div className="space-y-1.5">
              <Label htmlFor="brand" className="text-xs font-semibold">
                Brand / Manufacturer <span className="text-destructive">*</span>
              </Label>
              <Input
                id="brand"
                placeholder="e.g. ZKTeco, eSSL, Matrix"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                required
              />
            </div>

            {/* Machine Type (Shadcn UI Select) */}
            <div className="space-y-1.5">
              <Label htmlFor="machine_type" className="text-xs font-semibold">
                Machine Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={machineType}
                onValueChange={(val) => {
                  if (val) setMachineType(val as MachineType)
                }}
                items={MACHINE_TYPES}
                itemToStringLabel={(val) => MACHINE_TYPE_LABELS[String(val)] || String(val || "")}
              >
                <SelectTrigger id="machine_type" className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select Device Type" />
                </SelectTrigger>
                <SelectContent>
                  {MACHINE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} label={t.label}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status (Shadcn UI Select) */}
            <div className="space-y-1.5">
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
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Commercial & Pricing */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <IndianRupee className="size-4 text-primary" />
              <span>Commercials & Pricing</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Hardware selling rate and optional annual maintenance contract pricing.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="unit_price" className="text-xs font-semibold">
                Hardware Unit Price (₹) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="unit_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 14500.00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="pl-8"
                  required
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-xs">
                  ₹
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amc_price" className="text-xs font-semibold">
                Annual Maintenance Contract (AMC) (₹/year)
              </Label>
              <div className="relative">
                <Input
                  id="amc_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 1200.00"
                  value={amcPrice}
                  onChange={(e) => setAmcPrice(e.target.value)}
                  className="pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-xs">
                  ₹
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Hardware Capabilities & Cloud Sync */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Layers className="size-4 text-primary" />
              <span>Hardware Capabilities & Cloud Synchronization</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Storage thresholds, connectivity channels, and realtime push protocols.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="user_capacity" className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="size-3.5 text-muted-foreground" />
                User / Template Capacity
              </Label>
              <Input
                id="user_capacity"
                type="number"
                min="1"
                placeholder="e.g. 1000"
                value={userCapacity}
                onChange={(e) => setUserCapacity(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="log_capacity" className="text-xs font-semibold flex items-center gap-1.5">
                <FileText className="size-3.5 text-muted-foreground" />
                Punch / Log Record Capacity
              </Label>
              <Input
                id="log_capacity"
                type="number"
                min="1"
                placeholder="e.g. 100000"
                value={logCapacity}
                onChange={(e) => setLogCapacity(e.target.value)}
              />
            </div>

            {/* Connectivity */}
            <div className="space-y-1.5">
              <Label htmlFor="connectivity" className="text-xs font-semibold flex items-center gap-1.5">
                <Wifi className="size-3.5 text-muted-foreground" />
                Connectivity
              </Label>
              <Select
                value={connectivity}
                onValueChange={(val) => {
                  if (val) setConnectivity(val)
                }}
                items={CONNECTIVITY_PRESETS}
                itemToStringLabel={(val) => String(val || "")}
              >
                <SelectTrigger id="connectivity" className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select Connectivity" />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTIVITY_PRESETS.map((c) => (
                    <SelectItem key={c.value} value={c.value} label={c.label}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or customize: e.g. Wi-Fi, LAN, USB, 4G"
                value={connectivity}
                onChange={(e) => setConnectivity(e.target.value)}
                className="mt-1.5 text-xs h-8"
              />
            </div>

            {/* Push Protocol */}
            <div className="space-y-1.5">
              <Label htmlFor="push_protocol" className="text-xs font-semibold flex items-center gap-1.5">
                <Layers className="size-3.5 text-muted-foreground" />
                Push Protocol
              </Label>
              <Select
                value={pushProtocol}
                onValueChange={(val) => {
                  if (val) setPushProtocol(val)
                }}
                items={PUSH_PROTOCOLS}
                itemToStringLabel={(val) => String(val || "")}
              >
                <SelectTrigger id="push_protocol" className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select Protocol" />
                </SelectTrigger>
                <SelectContent>
                  {PUSH_PROTOCOLS.map((p) => (
                    <SelectItem key={p.value} value={p.value} label={p.label}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Device Photo Upload */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <ImageIcon className="size-4 text-primary" />
              <span>Device Photo</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Upload a clear product image of the biometric terminal.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="size-36 rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-muted/20 flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden transition-all shrink-0 group"
              >
                {filePreview ? (
                  <div className="relative size-full p-2">
                    <img
                      src={filePreview}
                      alt="Device Preview"
                      className="size-full object-contain"
                    />
                  </div>
                ) : (
                  <>
                    <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                      <Upload className="size-5" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Choose File</span>
                  </>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5 cursor-pointer text-xs"
                  >
                    <Upload className="size-3.5" />
                    {selectedFile ? "Change Image" : "Upload New Photo"}
                  </Button>

                  {selectedFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="text-destructive hover:bg-destructive/10 text-xs gap-1 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </Button>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Accepted formats: JPG, PNG, WEBP, SVG.</p>
                  <p>• Maximum file size: 10MB.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Technical Specifications */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <FileText className="size-4 text-primary" />
              <span>Technical Specifications & Hardware Notes</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Screen size, sensor details, RFID frequency, power supply, and packaging inclusions.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-2">
            <textarea
              id="specifications"
              rows={4}
              placeholder="e.g. 2.8-inch TFT Color Screen, SilkID Fingerprint Sensor, 12V 1.5A Power Supply..."
              value={specifications}
              onChange={(e) => setSpecifications(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </CardContent>
        </Card>

        {/* Bottom Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/attendance-machines")}
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
                Updating...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Update Attendance Machine
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
