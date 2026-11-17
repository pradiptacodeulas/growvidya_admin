import { useState, useEffect } from "react"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
import {
  fetchNotificationPricingApi,
  updateNotificationPricingApi,
} from "@/services/settingsService"
import type { NotificationPricingItem } from "@/types/settings"
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
  Bell,
  RefreshCw,
  Save,
  Loader2,
  IndianRupee,
  Power,
  ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"

export default function NotificationPlans() {
  const token = useAppSelector((state) => state.auth.token)
  const { can } = usePermission()

  const canUpdatePricing =
    can("packages", ["can_edit", "can_manage", "can_add"]) ||
    can("email_delivery", ["can_edit", "can_manage", "can_add"]) ||
    can("email_settings", ["can_edit", "can_manage", "can_add"])

  const [pricingItems, setPricingItems] = useState<NotificationPricingItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadPricing = async (showSkeleton = true) => {
    if (!token) return
    if (showSkeleton) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const data = await fetchNotificationPricingApi(token)
      setPricingItems(Array.isArray(data) ? data : [])
    } catch (err: any) {
      toast.error(err.message || "Failed to load notification credit pricing.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadPricing(true)
  }, [token])

  const handleUpdateField = (
    index: number,
    field: keyof NotificationPricingItem,
    value: string | number
  ) => {
    setPricingItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    )
  }

  const handleSave = async () => {
    if (!token || !canUpdatePricing) return

    for (const item of pricingItems) {
      const unitPrice = Number(item.unit_price)
      const minQty = Number(item.min_qty)
      if (!item.pack_name?.trim()) {
        toast.error(`Pack name is required for ${item.channel.toUpperCase()}.`)
        return
      }
      if (isNaN(unitPrice) || unitPrice < 0) {
        toast.error(`Valid non-negative unit price is required for ${item.channel.toUpperCase()}.`)
        return
      }
      if (!Number.isInteger(minQty) || minQty < 1) {
        toast.error(`Minimum credit order quantity must be at least 1 for ${item.channel.toUpperCase()}.`)
        return
      }
    }

    setIsSaving(true)
    try {
      const updated = await updateNotificationPricingApi(
        token,
        pricingItems.map((it) => ({
          ...it,
          pack_name: it.pack_name.trim(),
          unit_price: Number(it.unit_price),
          min_qty: Number(it.min_qty),
          status: Number(it.status) === 1 ? 1 : 2,
        }))
      )
      setPricingItems(Array.isArray(updated) ? updated : [])
      toast.success("Notification credit pricing updated successfully.")
    } catch (err: any) {
      toast.error(err.message || "Failed to update notification credit pricing.")
    } finally {
      setIsSaving(false)
    }
  }

  const activeCount = pricingItems.filter((i) => Number(i.status) === 1).length
  const inactiveCount = pricingItems.filter((i) => Number(i.status) === 2).length

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
      {!canUpdatePricing && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            <strong>Read-only access:</strong> You have permission to view notification pricing. Updating rates requires edit permission.
          </span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Manage Notification Pricing
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage prepaid notification credit rates and minimum order quantities from the database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPricing(false)}
            disabled={isLoading || isRefreshing}
            className="gap-2 h-9 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>

          {canUpdatePricing && pricingItems.length > 0 && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="gap-1.5 h-9 text-xs font-semibold cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Channels</p>
              <p className="text-2xl font-bold mt-1">{pricingItems.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Bell className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Channels</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {activeCount}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Power className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Inactive Channels</p>
              <p className="text-2xl font-bold mt-1 text-muted-foreground">{inactiveCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
              <IndianRupee className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Credit Pricing Cards */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="border-b bg-muted/25 pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            Notification Credit Pricing
          </CardTitle>
          <CardDescription className="text-xs mt-1">
            Configure per-credit rates and minimum purchase quantities for school add-on checkouts.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : pricingItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No notification pricing records found in the database.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pricingItems.map((item, idx) => {
                const sampleTotal = (
                  Number(item.unit_price || 0) * Number(item.min_qty || 1)
                ).toFixed(2)
                const isActive = Number(item.status) === 1

                return (
                  <div
                    key={item.id ?? item.channel}
                    className="p-4 rounded-xl border bg-muted/15 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="uppercase font-mono text-xs font-bold border-primary/40 bg-primary/10 text-primary"
                        >
                          {item.channel.toUpperCase()} Channel
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Min pack = ₹{Number(sampleTotal).toLocaleString("en-IN")}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={!canUpdatePricing}
                        onClick={() =>
                          handleUpdateField(idx, "status", isActive ? 2 : 1)
                        }
                        className="cursor-pointer"
                      >
                        <Badge
                          variant={isActive ? "default" : "secondary"}
                          className={
                            isActive
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px]"
                              : "text-[11px]"
                          }
                        >
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Pack Label</Label>
                        <Input
                          value={item.pack_name}
                          disabled={!canUpdatePricing}
                          onChange={(e) =>
                            handleUpdateField(idx, "pack_name", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Net Price / Credit (₹)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          disabled={!canUpdatePricing}
                          onChange={(e) =>
                            handleUpdateField(idx, "unit_price", e.target.value)
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Min Order Credits</Label>
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          value={item.min_qty}
                          disabled={!canUpdatePricing}
                          onChange={(e) =>
                            handleUpdateField(idx, "min_qty", Number(e.target.value))
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Description</Label>
                      <Input
                        value={item.description || ""}
                        disabled={!canUpdatePricing}
                        onChange={(e) =>
                          handleUpdateField(idx, "description", e.target.value)
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
