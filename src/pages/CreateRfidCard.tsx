import { useState, useRef } from "react"
import { useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import { createRfidCardApi } from "@/services/rfidCardService"
import type { CreateRfidCardPayload, RfidCardType } from "@/types/rfidCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Radio,
  IndianRupee,
  Layers,
  Package,
  Scan,
  Tag,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
} from "lucide-react"
import { toast } from "sonner"

const CARD_TYPES: { value: RfidCardType; label: string }[] = [
  { value: "pvc_card", label: "PVC Smart Card" },
  { value: "keyfob", label: "Keyfob / Keyring Tag" },
  { value: "wristband", label: "Silicone Wristband" },
  { value: "sticker", label: "Adhesive RFID Sticker / Disc" },
]

const CARD_TYPE_LABELS: Record<string, string> = {
  pvc_card: "PVC Smart Card",
  keyfob: "Keyfob / Keyring Tag",
  wristband: "Silicone Wristband",
  sticker: "Adhesive RFID Sticker / Disc",
}

const STATUS_OPTIONS = [
  { value: "1", label: "Active" },
  { value: "0", label: "Inactive" },
]

const STATUS_LABELS: Record<string, string> = {
  "1": "Active",
  "0": "Inactive",
}

const FREQUENCY_PRESETS = [
  { value: "13.56 MHz", label: "13.56 MHz (High Frequency / Mifare / NFC)" },
  { value: "125 KHz", label: "125 KHz (Low Frequency / EM-Proximity)" },
  { value: "860-960 MHz", label: "860 - 960 MHz (UHF Long Range)" },
  { value: "13.56 MHz + 125 KHz", label: "Dual Frequency (13.56 MHz + 125 KHz)" },
]

const READ_RANGE_PRESETS = [
  { value: "Up to 5 cm", label: "Up to 5 cm (Standard Proximity)" },
  { value: "2 - 10 cm", label: "2 - 10 cm (Enhanced Range)" },
  { value: "Up to 1 meter", label: "Up to 1 meter (Mid Range)" },
  { value: "3 - 10 meters", label: "3 - 10 meters (UHF Parking/Gate)" },
]

export default function CreateRfidCard() {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)

  // Form State
  const [cardName, setCardName] = useState("")
  const [cardCode, setCardCode] = useState("")
  const [cardType, setCardType] = useState<RfidCardType>("pvc_card")
  const [frequency, setFrequency] = useState("13.56 MHz")
  const [readRange, setReadRange] = useState("Up to 5 cm")
  const [unitPrice, setUnitPrice] = useState("")
  const [minOrderQty, setMinOrderQty] = useState("50")
  const [status, setStatus] = useState<number>(1)
  const [description, setDescription] = useState("")

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
    if (!token) {
      toast.error("Authentication required. Please sign in.")
      return
    }

    if (!cardName.trim()) {
      toast.error("Card Name is required.")
      return
    }

    if (!cardCode.trim()) {
      toast.error("Card Code / SKU is required.")
      return
    }

    if (!unitPrice.trim() || isNaN(Number(unitPrice)) || Number(unitPrice) < 0) {
      toast.error("Please provide a valid unit price.")
      return
    }

    setIsSubmitting(true)
    try {
      const payload: CreateRfidCardPayload = {
        card_name: cardName.trim(),
        card_code: cardCode.trim(),
        card_type: cardType,
        frequency: frequency.trim(),
        read_range: readRange.trim(),
        unit_price: Number(unitPrice),
        min_order_qty: minOrderQty ? Number(minOrderQty) : 1,
        status,
        description: description.trim(),
        ...(selectedFile ? { card_image: selectedFile } : {}),
      }

      const result = await createRfidCardApi(token, payload)
      toast.success(`RFID card "${result.card_name}" created successfully!`)
      navigate("/rfid-cards")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create RFID card."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Radio className="size-6 text-primary" />
            Add New RFID Card & Tag
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Register smart ID cards, proximity tags, keyfobs, and wristbands for school orders.
          </p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Identification & Classification */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Tag className="size-4 text-primary" />
              <span>Card Identification & Type</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Model name, unique SKU identifier, and physical form factor.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="card_name" className="text-xs font-semibold">
                Card / Tag Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="card_name"
                placeholder="e.g. Mifare Classic 1K PVC Card"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Public display name seen by school administrators during order placement.
              </p>
            </div>

            {/* Card Code / SKU */}
            <div className="space-y-1.5">
              <Label htmlFor="card_code" className="text-xs font-semibold">
                Card Code / SKU <span className="text-destructive">*</span>
              </Label>
              <Input
                id="card_code"
                placeholder="e.g. RFID-MF-1K"
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Unique inventory SKU identifier.
              </p>
            </div>

            {/* Card Type (Shadcn UI Select) */}
            <div className="space-y-1.5">
              <Label htmlFor="card_type" className="text-xs font-semibold">
                Form Factor / Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={cardType}
                onValueChange={(val) => {
                  if (val) setCardType(val as RfidCardType)
                }}
                items={CARD_TYPES}
                itemToStringLabel={(val) => CARD_TYPE_LABELS[String(val)] || String(val || "")}
              >
                <SelectTrigger id="card_type" className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select Form Factor" />
                </SelectTrigger>
                <SelectContent>
                  {CARD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} label={t.label}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Initial Status (Shadcn UI Select) */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="status" className="text-xs font-semibold">
                Initial Status
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
                Active cards are instantly selectable for institutional identity badge issuance.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Commercials & Quantities */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <IndianRupee className="size-4 text-primary" />
              <span>Commercials & Batch Limits</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Selling price per unit and minimum order batch size.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Unit Price */}
            <div className="space-y-1.5">
              <Label htmlFor="unit_price" className="text-xs font-semibold">
                Unit Selling Price (₹) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="unit_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 35.00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="pl-8"
                  required
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-xs">
                  ₹
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Base price per card or tag charged to schools.
              </p>
            </div>

            {/* Minimum Order Qty */}
            <div className="space-y-1.5">
              <Label htmlFor="min_order_qty" className="text-xs font-semibold flex items-center gap-1.5">
                <Package className="size-3.5 text-muted-foreground" />
                Minimum Order Quantity (MOQ)
              </Label>
              <Input
                id="min_order_qty"
                type="number"
                min="1"
                placeholder="e.g. 50"
                value={minOrderQty}
                onChange={(e) => setMinOrderQty(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Minimum batch quantity schools must order per purchase request.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Frequency & Scanning Performance */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Layers className="size-4 text-primary" />
              <span>Radio Frequency & Scanning Range</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Operating chip frequency and maximum detection distance from readers.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Frequency (Shadcn UI Select Preset + Custom Input) */}
            <div className="space-y-1.5">
              <Label htmlFor="frequency" className="text-xs font-semibold flex items-center gap-1.5">
                <Radio className="size-3.5 text-muted-foreground" />
                Operating Frequency
              </Label>
              <Select
                value={frequency}
                onValueChange={(val) => {
                  if (val) setFrequency(val)
                }}
                items={FREQUENCY_PRESETS}
                itemToStringLabel={(val) => String(val || "")}
              >
                <SelectTrigger id="frequency" className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select Frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_PRESETS.map((f) => (
                    <SelectItem key={f.value} value={f.value} label={f.label}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or customize: e.g. 13.56 MHz, ISO14443A"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="mt-1.5 text-xs h-8"
              />
            </div>

            {/* Read Range (Shadcn UI Select Preset + Custom Input) */}
            <div className="space-y-1.5">
              <Label htmlFor="read_range" className="text-xs font-semibold flex items-center gap-1.5">
                <Scan className="size-3.5 text-muted-foreground" />
                Read Range
              </Label>
              <Select
                value={readRange}
                onValueChange={(val) => {
                  if (val) setReadRange(val)
                }}
                items={READ_RANGE_PRESETS}
                itemToStringLabel={(val) => String(val || "")}
              >
                <SelectTrigger id="read_range" className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select Read Range" />
                </SelectTrigger>
                <SelectContent>
                  {READ_RANGE_PRESETS.map((r) => (
                    <SelectItem key={r.value} value={r.value} label={r.label}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or customize: e.g. Up to 5 cm"
                value={readRange}
                onChange={(e) => setReadRange(e.target.value)}
                className="mt-1.5 text-xs h-8"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Product Image Upload */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <ImageIcon className="size-4 text-primary" />
              <span>Card / Tag Photo</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Upload a clear visual mockup or photo of the card or keyfob.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Preview Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="size-36 rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-muted/20 flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden transition-all shrink-0 group"
              >
                {filePreview ? (
                  <div className="relative size-full p-2">
                    <img
                      src={filePreview}
                      alt="Card Preview"
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

              {/* Upload Controls */}
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
                    {selectedFile ? "Change Image" : "Upload Product Photo"}
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
                  <p>• Recommended transparent background or white backdrop.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Description & Notes */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <FileText className="size-4 text-primary" />
              <span>Description & Application Notes</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Material composition, printable surface, chip specification, and school use cases.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-2">
            <textarea
              id="description"
              rows={4}
              placeholder="e.g. High frequency ISO14443A card, ideal for student/staff smart attendance, library tracking, and cashless canteen with printable PVC surface."
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
            onClick={() => navigate("/rfid-cards")}
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
                Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Create RFID Card
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
