import { useState, useRef } from "react"
import { useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import { createBankAccountApi } from "@/services/bankAccountService"
import type { CreateBankAccountPayload } from "@/types/bankAccount"
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
  ArrowLeft,
  Landmark,
  Building2,
  QrCode,
  FileText,
  Loader2,
  CheckCircle2,
  Upload,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

const ACCOUNT_TYPES = [
  { value: "Current", label: "Current Account" },
  { value: "Savings", label: "Savings Account" },
  { value: "Escrow", label: "Escrow Account" },
  { value: "Overdraft", label: "Overdraft / Cash Credit" },
]

export default function CreateBankAccount() {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)

  const [formData, setFormData] = useState<CreateBankAccountPayload>({
    account_title: "",
    beneficiary_name: "",
    account_number: "",
    bank_name: "",
    branch_name: "",
    ifsc_code: "",
    account_type: "Current",
    upi_id: "",
    swift_code: "",
    instructions: "",
    qr_code_image: "",
    qr_code_file: null,
    is_default: false,
    status: true,
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit. Please choose a smaller image.")
      return
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, JPEG, WEBP, SVG).")
      return
    }

    setSelectedFile(file)
    setFormData((prev) => ({ ...prev, qr_code_file: file }))

    const reader = new FileReader()
    reader.onload = () => {
      setFilePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setFormData((prev) => ({ ...prev, qr_code_file: null, qr_code_image: "" }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === "ifsc_code" ? value.toUpperCase().trim() : value,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    if (!formData.account_title.trim()) {
      toast.error("Account Title is required.")
      return
    }
    if (!formData.beneficiary_name.trim()) {
      toast.error("Beneficiary Name is required.")
      return
    }
    if (!formData.bank_name.trim()) {
      toast.error("Bank Name is required.")
      return
    }
    if (!formData.account_number.trim()) {
      toast.error("Account Number is required.")
      return
    }
    if (!formData.ifsc_code.trim()) {
      toast.error("IFSC Code is required.")
      return
    }

    setIsSubmitting(true)
    try {
      await createBankAccountApi(token, formData)
      toast.success("Bank account created successfully!")
      navigate("/bank-accounts")
    } catch (err: any) {
      toast.error(err.message || "Failed to create bank account.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/80">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate("/bank-accounts")}
            className="h-9 w-9 cursor-pointer shrink-0"
            title="Back to Bank Accounts"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Landmark className="h-6 w-6 text-primary" />
              <span>Add New Bank Account</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Set up an official collection bank account and remittance instructions for schools.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:self-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/bank-accounts")}
            disabled={isSubmitting}
            className="cursor-pointer h-9 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-bank-form"
            disabled={isSubmitting}
            className="cursor-pointer h-9 text-xs gap-1.5 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Bank Account</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <form id="create-bank-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Account Ownership & Title */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              <span>Account Ownership & Identification</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Basic identification details and legal beneficiary name.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="account_title" className="text-xs font-semibold">
                Account Display Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="account_title"
                name="account_title"
                placeholder="e.g. GrowVidya Primary Operations"
                value={formData.account_title}
                onChange={handleInputChange}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Internal label to identify this account across the system.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="beneficiary_name" className="text-xs font-semibold">
                Beneficiary / Account Holder Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="beneficiary_name"
                name="beneficiary_name"
                placeholder="e.g. GrowVidya EdTech Solutions Pvt Ltd"
                value={formData.beneficiary_name}
                onChange={handleInputChange}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Exact legal registered name for RTGS/NEFT/IMPS validation.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account_type" className="text-xs font-semibold">
                Account Type
              </Label>
              <Select
                value={formData.account_type || "Current"}
                onValueChange={(val) => {
                  if (val) setFormData((prev) => ({ ...prev, account_type: val }))
                }}
              >
                <SelectTrigger id="account_type" className="h-9 text-xs w-full">
                  <SelectValue placeholder="Select Account Type" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Banking & Clearing Details */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Landmark className="h-4 w-4 text-primary" />
              <span>Banking & Clearing Information</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Bank credentials used by schools to initiate wire transfers.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bank_name" className="text-xs font-semibold">
                Bank Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bank_name"
                name="bank_name"
                placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                value={formData.bank_name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account_number" className="text-xs font-semibold">
                Account Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="account_number"
                name="account_number"
                placeholder="e.g. 50200012345678"
                value={formData.account_number}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ifsc_code" className="text-xs font-semibold">
                IFSC Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ifsc_code"
                name="ifsc_code"
                placeholder="e.g. HDFC0000123"
                value={formData.ifsc_code}
                onChange={handleInputChange}
                maxLength={15}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                11-character Indian Financial System Code.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch_name" className="text-xs font-semibold">
                Branch Name & City
              </Label>
              <Input
                id="branch_name"
                name="branch_name"
                placeholder="e.g. Koramangala Branch, Bengaluru"
                value={formData.branch_name || ""}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="swift_code" className="text-xs font-semibold">
                SWIFT / BIC Code (Optional)
              </Label>
              <Input
                id="swift_code"
                name="swift_code"
                placeholder="e.g. HDFCINBB (Required for international wire transfers)"
                value={formData.swift_code || ""}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: UPI & Digital Payment Details */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <QrCode className="h-4 w-4 text-primary" />
              <span>UPI & Instant Payment Mapping (Optional)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Support QR code scanning and direct UPI handle transfers.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="upi_id" className="text-xs font-semibold">
                UPI VPA Handle
              </Label>
              <Input
                id="upi_id"
                name="upi_id"
                placeholder="e.g. growvidya@hdfcbank"
                value={formData.upi_id || ""}
                onChange={handleInputChange}
              />
              <p className="text-[11px] text-muted-foreground">
                Virtual Payment Address for UPI collection.
              </p>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold">
                Payment QR Code Image
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleFileChange}
              />

              {!filePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/60 hover:bg-muted/30 transition-all rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer text-center group"
                >
                  <div className="p-3 bg-muted/60 group-hover:bg-primary/10 group-hover:text-primary rounded-xl text-muted-foreground transition-colors mb-2">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    Click to upload Payment QR Code
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Supports PNG, JPG, JPEG, WEBP, SVG (Max 5MB)
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-border/80 bg-muted/20 rounded-xl">
                  <img
                    src={filePreview}
                    alt="QR Code Preview"
                    className="w-24 h-24 object-contain rounded-lg border border-border bg-white p-1.5 shadow-2xs shrink-0"
                  />
                  <div className="flex-1 space-y-1 text-center sm:text-left min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {selectedFile?.name || "Uploaded QR Code"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                        : "Selected Image"}
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-7 text-xs px-2.5 cursor-pointer"
                      >
                        Change Image
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        className="h-7 text-xs px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Instructions & System Settings */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <FileText className="h-4 w-4 text-primary" />
              <span>Remittance Instructions & Settings</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Special remarks presented to schools during bank transfer payment.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="instructions" className="text-xs font-semibold">
                Transfer Remarks & Instructions
              </Label>
              <textarea
                id="instructions"
                name="instructions"
                rows={4}
                placeholder="e.g. Please mention your School Registration ID or Registered Email in the transaction remarks. Once transferred, email payment screenshot to billing@growvidya.com for fast clearance."
                value={formData.instructions || ""}
                onChange={handleInputChange}
                className="w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed dark:bg-input/30"
              />
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="is_default"
                  checked={Boolean(formData.is_default)}
                  onChange={handleInputChange}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 mt-0.5"
                />
                <div>
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    Make this the Primary Default Account
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    When enabled, this account will be automatically highlighted and selected as the default payment channel for all school subscription packages. (Any previous default will be unset).
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/bank-accounts")}
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
                <span>Saving Bank Account...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Bank Account</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
