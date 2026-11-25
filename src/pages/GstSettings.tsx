import { useState, useEffect } from "react"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
import {
  fetchGstSettingApi,
  updateGstSettingApi,
  fetchCountriesApi,
  fetchStatesByCountryApi,
} from "@/services/settingsService"
import type {
  GstSetting,
  LocationCountry,
  LocationState,
} from "@/types/settings"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Settings as SettingsIcon,
  ChevronRight,
  RefreshCw,
  Save,
  ReceiptIndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Building2,
  MapPin,
  Percent,
} from "lucide-react"
import { toast } from "sonner"

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr.replace(" ", "T"))
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return dateStr
  }
}

export default function GstSettings() {
  const token = useAppSelector((state) => state.auth.token)
  const { can } = usePermission()

  const canUpdateSettings = can(
    ["gst_settings", "payment_gateway", "email_delivery", "email_settings", "footer_settings"],
    ["can_edit", "can_manage", "can_add"]
  )

  const [gstSetting, setGstSetting] = useState<GstSetting | null>(null)
  const [countries, setCountries] = useState<LocationCountry[]>([])
  const [states, setStates] = useState<LocationState[]>([])
  const [isLoadingStates, setIsLoadingStates] = useState(false)

  const [isGstEnabled, setIsGstEnabled] = useState<boolean>(false)
  const [gstPercentage, setGstPercentage] = useState<string>("")
  const [homeCountryId, setHomeCountryId] = useState<string>("")
  const [homeStateId, setHomeStateId] = useState<string>("")
  const [companyLegalName, setCompanyLegalName] = useState<string>("")
  const [companyGstin, setCompanyGstin] = useState<string>("")
  const [companyAddress, setCompanyAddress] = useState<string>("")
  const [companyPhone, setCompanyPhone] = useState<string>("")
  const [companyEmail, setCompanyEmail] = useState<string>("")
  const [hsnSacCode, setHsnSacCode] = useState<string>("")

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadStatesForCountry = async (countryIdVal: string | number) => {
    if (!token || !countryIdVal) {
      setStates([])
      return
    }
    setIsLoadingStates(true)
    try {
      const stateList = await fetchStatesByCountryApi(token, countryIdVal)
      setStates(Array.isArray(stateList) ? stateList : [])
    } catch {
      setStates([])
    } finally {
      setIsLoadingStates(false)
    }
  }

  const loadGstData = async (showSkeleton = true) => {
    if (!token) return
    if (showSkeleton) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const [settingData, countryList] = await Promise.all([
        fetchGstSettingApi(token),
        fetchCountriesApi(token),
      ])

      setCountries(Array.isArray(countryList) ? countryList : [])
      setGstSetting(settingData)

      const enabled = Number(settingData?.is_gst_enabled) === 1
      setIsGstEnabled(enabled)
      setGstPercentage(
        settingData && settingData.gst_percentage !== undefined
          ? String(settingData.gst_percentage)
          : ""
      )

      const resolvedCountryId = settingData?.home_country_id
        ? String(settingData.home_country_id)
        : ""
      setHomeCountryId(resolvedCountryId)
      setHomeStateId(
        settingData?.home_state_id ? String(settingData.home_state_id) : ""
      )
      setCompanyLegalName(settingData?.company_legal_name || "")
      setCompanyGstin(settingData?.company_gstin || "")
      setCompanyAddress(settingData?.company_address || "")
      setCompanyPhone(settingData?.company_phone || "")
      setCompanyEmail(settingData?.company_email || "")
      setHsnSacCode(settingData?.hsn_sac_code || "")
      setFormError(null)

      if (resolvedCountryId) {
        await loadStatesForCountry(resolvedCountryId)
      } else {
        setStates([])
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load GST configuration.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadGstData(true)
  }, [token])

  const handleCountryChange = async (newCountryId: string) => {
    setHomeCountryId(newCountryId)
    setHomeStateId("")
    if (newCountryId) {
      await loadStatesForCountry(newCountryId)
    } else {
      setStates([])
    }
  }

  const parsedRate = Math.max(0, Math.min(100, parseFloat(gstPercentage) || 0))
  const computedCgst = Number((parsedRate / 2).toFixed(2))
  const computedSgst = Number((parsedRate - computedCgst).toFixed(2))
  const computedIgst = Number(parsedRate.toFixed(2))

  const selectedHomeStateName =
    states.find((s) => String(s.id) === String(homeStateId))?.name ||
    gstSetting?.home_state_name ||
    ""

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!canUpdateSettings) {
      toast.error("Access denied. You do not have permission to update GST settings.")
      return
    }

    if (isGstEnabled) {
      if (parsedRate <= 0 || parsedRate > 100) {
        setFormError("Please enter a valid GST percentage between 0.01 and 100.")
        return
      }
      if (!homeCountryId || !homeStateId) {
        setFormError(
          "Please select the company home Country and Home State (e.g. West Bengal) to determine CGST+SGST vs IGST."
        )
        return
      }
      if (!companyLegalName.trim()) {
        setFormError("Company Legal Name is required when GST is enabled.")
        return
      }
      if (!companyGstin.trim()) {
        setFormError("Company GSTIN is required when GST is enabled.")
        return
      }
    }

    setFormError(null)
    setIsSubmitting(true)
    try {
      const updated = await updateGstSettingApi(token, {
        is_gst_enabled: isGstEnabled ? 1 : 0,
        gst_percentage: parsedRate,
        home_country_id: homeCountryId ? Number(homeCountryId) : null,
        home_state_id: homeStateId ? Number(homeStateId) : null,
        home_state_name: selectedHomeStateName,
        company_legal_name: companyLegalName.trim(),
        company_gstin: companyGstin.trim().toUpperCase(),
        company_address: companyAddress.trim(),
        company_phone: companyPhone.trim(),
        company_email: companyEmail.trim(),
        hsn_sac_code: hsnSacCode.trim(),
      })
      setGstSetting(updated)
      toast.success("Platform GST & Tax Invoice configuration updated successfully.")
    } catch (err: any) {
      const msg = err.message || "Failed to update GST configuration."
      setFormError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
      {!canUpdateSettings && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-medium">
          <ShieldAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Read-only access:</strong> You have permission to view platform GST settings. Updating tax configuration requires edit permission.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
            <SettingsIcon className="h-3.5 w-3.5" />
            <span>Settings</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-semibold">GST Configuration</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ReceiptIndianRupee className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                GST &amp; Tax Invoice Configuration
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure post-coupon GST percentage, merchant GSTIN details, and home state rule (CGST + SGST inside home state, IGST outside).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadGstData(false)}
            disabled={isLoading || isRefreshing}
            className="gap-2 h-9 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">GST Status</p>
              <div className="text-lg font-bold tracking-tight">
                {isLoading ? (
                  <Skeleton className="h-6 w-28" />
                ) : isGstEnabled ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="size-4" />
                    Enabled ({parsedRate}% GST)
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">Disabled (0% Tax)</span>
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Percent className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Home State (CGST + SGST)</p>
              <div className="text-lg font-bold tracking-tight truncate">
                {isLoading ? (
                  <Skeleton className="h-6 w-32" />
                ) : selectedHomeStateName ? (
                  <span>{selectedHomeStateName}</span>
                ) : (
                  <span className="text-muted-foreground">Not Selected</span>
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MapPin className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Last Updated</p>
              <div className="text-sm font-bold tracking-tight">
                {isLoading ? (
                  <Skeleton className="h-6 w-36" />
                ) : (
                  <span>{formatDate(gstSetting?.updated_at || gstSetting?.created_at)}</span>
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Card */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="border-b bg-muted/25 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span>Platform GST Rules &amp; Merchant Billing Profile</span>
                {!isLoading && isGstEnabled && (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs"
                  >
                    Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                GST is calculated after deducting any coupon discount (Standard Exclusive GST). Schools located inside the configured Home State are billed CGST + SGST; schools outside the Home State are billed IGST.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSaveSubmit} className="space-y-6">
              {formError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Toggle GST Enabled */}
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                <div className="space-y-0.5">
                  <Label htmlFor="is_gst_enabled" className="text-sm font-semibold cursor-pointer">
                    Enable GST on Platform Subscriptions &amp; Add-ons
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, post-coupon GST is automatically applied at checkout and printed on backend PDF tax invoices.
                  </p>
                </div>
                <input
                  id="is_gst_enabled"
                  type="checkbox"
                  checked={isGstEnabled}
                  disabled={!canUpdateSettings || isSubmitting}
                  onChange={(e) => setIsGstEnabled(e.target.checked)}
                  className="h-5 w-5 accent-primary rounded cursor-pointer"
                />
              </div>

              {/* Tax Rate & Split Preview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl border bg-background">
                <div className="space-y-2">
                  <Label htmlFor="gst_percentage" className="text-xs font-semibold">
                    Total GST Percentage (%) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="gst_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={gstPercentage}
                    onChange={(e) => setGstPercentage(e.target.value)}
                    disabled={!canUpdateSettings || isSubmitting}
                    placeholder="e.g. 18"
                    className="text-sm font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Intra-State CGST (50%)
                  </Label>
                  <div className="h-9 px-3 rounded-md border bg-muted/40 flex items-center text-sm font-mono font-semibold text-foreground">
                    {computedCgst}%
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Intra-State SGST (50%)
                  </Label>
                  <div className="h-9 px-3 rounded-md border bg-muted/40 flex items-center text-sm font-mono font-semibold text-foreground">
                    {computedSgst}%
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Inter-State IGST (100%)
                  </Label>
                  <div className="h-9 px-3 rounded-md border bg-muted/40 flex items-center text-sm font-mono font-semibold text-foreground">
                    {computedIgst}%
                  </div>
                </div>
              </div>

              {/* Home Country & Home State */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin className="size-4 text-primary" />
                  <span>Merchant Home Jurisdiction (Intra-State vs Inter-State Rule)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="home_country_id" className="text-xs font-semibold">
                      Home Country <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="home_country_id"
                      value={homeCountryId}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      disabled={!canUpdateSettings || isSubmitting}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select Country</option>
                      {countries.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="home_state_id" className="text-xs font-semibold">
                      Home State (Charges CGST + SGST) <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="home_state_id"
                      value={homeStateId}
                      onChange={(e) => setHomeStateId(e.target.value)}
                      disabled={!canUpdateSettings || isSubmitting || !homeCountryId || isLoadingStates}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">
                        {isLoadingStates ? "Loading states..." : "Select Home State"}
                      </option>
                      {states.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {selectedHomeStateName && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        Schools in <strong>{selectedHomeStateName}</strong> will be charged CGST ({computedCgst}%) + SGST ({computedSgst}%). Schools outside <strong>{selectedHomeStateName}</strong> will be charged IGST ({computedIgst}%).
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Merchant / Company Details for Tax Invoice */}
              <div className="space-y-3 pt-2 border-t border-border/60">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Building2 className="size-4 text-primary" />
                  <span>Merchant Details Printed on Tax Invoice PDF</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_legal_name" className="text-xs font-semibold">
                      Company Legal Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="company_legal_name"
                      value={companyLegalName}
                      onChange={(e) => setCompanyLegalName(e.target.value)}
                      disabled={!canUpdateSettings || isSubmitting}
                      placeholder="Enter legal entity name"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_gstin" className="text-xs font-semibold">
                      Company GSTIN <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="company_gstin"
                      value={companyGstin}
                      onChange={(e) => setCompanyGstin(e.target.value.toUpperCase())}
                      disabled={!canUpdateSettings || isSubmitting}
                      placeholder="Enter 15-character GSTIN"
                      maxLength={30}
                      className="text-sm font-mono uppercase"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hsn_sac_code" className="text-xs font-semibold">
                      HSN / SAC Code
                    </Label>
                    <Input
                      id="hsn_sac_code"
                      value={hsnSacCode}
                      onChange={(e) => setHsnSacCode(e.target.value)}
                      disabled={!canUpdateSettings || isSubmitting}
                      placeholder="Enter HSN / SAC code"
                      maxLength={30}
                      className="text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_email" className="text-xs font-semibold">
                      Billing Support Email
                    </Label>
                    <Input
                      id="company_email"
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      disabled={!canUpdateSettings || isSubmitting}
                      placeholder="Billing email shown on tax invoice"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_phone" className="text-xs font-semibold">
                      Billing Support Phone
                    </Label>
                    <Input
                      id="company_phone"
                      type="text"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      disabled={!canUpdateSettings || isSubmitting}
                      placeholder="Phone number shown on tax invoice"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_address" className="text-xs font-semibold">
                    Registered Company Address
                  </Label>
                  <textarea
                    id="company_address"
                    rows={2}
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    disabled={!canUpdateSettings || isSubmitting}
                    placeholder="Registered address printed in the tax invoice header"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>

              {canUpdateSettings && (
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className="gap-1.5 h-9 px-4 text-xs font-semibold cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>Save GST Configuration</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
