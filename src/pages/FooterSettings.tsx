import { useState, useEffect } from "react"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
import {
  fetchFooterSettingApi,
  updateFooterSettingApi,
} from "@/services/settingsService"
import type { FooterSetting } from "@/types/settings"
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
  PanelBottom,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

function formatDate(dateStr?: string) {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr.replace(" ", "T"))
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString("en-US", {
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

export default function FooterSettings() {
  const token = useAppSelector((state) => state.auth.token)
  const { can } = usePermission()

  const canUpdateSettings =
    can(["footer_settings", "payment_gateway", "email_delivery", "email_settings"], [
      "can_edit",
      "can_manage",
      "can_add",
    ])

  const [footerSetting, setFooterSetting] = useState<FooterSetting | null>(null)
  const [footerText, setFooterText] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadFooterSetting = async (showSkeleton = true) => {
    if (!token) return
    if (showSkeleton) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const data = await fetchFooterSettingApi(token)
      setFooterSetting(data)
      setFooterText(data?.footer_text || "")
      setFormError(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to load footer configuration.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadFooterSetting(true)
  }, [token])

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!canUpdateSettings) {
      toast.error("Access denied. You do not have permission to update footer configuration.")
      return
    }

    const cleanText = footerText.trim()
    if (!cleanText) {
      setFormError("Footer text is required.")
      return
    }
    if (cleanText.length > 500) {
      setFormError("Footer text must not exceed 500 characters.")
      return
    }

    setFormError(null)
    setIsSubmitting(true)
    try {
      const updated = await updateFooterSettingApi(token, {
        footer_text: cleanText,
      })
      setFooterSetting(updated)
      setFooterText(updated.footer_text)
      window.dispatchEvent(
        new CustomEvent("growvidya:footer_updated", { detail: updated })
      )
      toast.success("Platform footer configuration updated successfully.")
    } catch (err: any) {
      const msg = err.message || "Failed to update footer configuration."
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
            <strong>Read-only access:</strong> You have permission to view platform footer settings. Updating the global footer text requires update permission.
          </span>
        </div>
      )}

      {/* Top Page Header with Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
            <SettingsIcon className="h-3.5 w-3.5" />
            <span>Settings</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-semibold">Footer Configuration</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <PanelBottom className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Platform Footer Configuration
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage the global footer copyright text displayed uniformly across all web portals, onboarding pages, and client applications.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadFooterSetting(false)}
            disabled={isLoading || isRefreshing}
            className="gap-2 h-9 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Configuration Status</p>
              <div className="text-lg font-bold tracking-tight">
                {isLoading ? (
                  <Skeleton className="h-6 w-28" />
                ) : footerSetting?.footer_text ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="size-4" />
                    Configured &amp; Active
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">Not Configured</span>
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <PanelBottom className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Last Updated</p>
              <div className="text-lg font-bold tracking-tight">
                {isLoading ? (
                  <Skeleton className="h-6 w-36" />
                ) : (
                  <span>{formatDate(footerSetting?.updated_at || footerSetting?.created_at)}</span>
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Footer Form Card */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="border-b bg-muted/25 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span>Global Footer Text</span>
                {!isLoading && footerSetting?.footer_text && (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs"
                  >
                    Live
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Only the SaaS Administrator can modify this content. Schools cannot override or edit the platform footer.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-9 w-36" />
            </div>
          ) : (
            <form onSubmit={handleSaveSubmit} className="space-y-5">
              {formError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="footer_text" className="text-xs font-semibold">
                    Footer Content <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {footerText.length} / 500 characters
                  </span>
                </div>
                <Input
                  id="footer_text"
                  name="footer_text"
                  type="text"
                  value={footerText}
                  onChange={(e) => {
                    setFooterText(e.target.value)
                    if (formError) setFormError(null)
                  }}
                  maxLength={500}
                  disabled={!canUpdateSettings || isSubmitting}
                  placeholder="Enter global platform footer text"
                  className="text-sm"
                />
              </div>

              {canUpdateSettings && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
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
                        <span>Save Footer Setting</span>
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
