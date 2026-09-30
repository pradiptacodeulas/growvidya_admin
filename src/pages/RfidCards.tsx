import { useState, useEffect } from "react"
import { useAppSelector } from "@/store/store"
import {
  fetchRfidCardsApi,
  toggleRfidCardStatusApi,
  deleteRfidCardApi,
} from "@/services/rfidCardService"
import type { RfidCard } from "@/types/rfidCard"
import { getFullImageUrl } from "@/config/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Radio,
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle,
  Trash2,
  Power,
  Tag,
  Scan,
  Package,
  X,
} from "lucide-react"
import { toast } from "sonner"

export default function RfidCards() {
  const token = useAppSelector((state) => state.auth.token)
  const [cards, setCards] = useState<RfidCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<RfidCard | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Status toggle in-progress ID
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Fetch cards
  const loadCards = async (showLoadingState = true) => {
    if (!token) return
    if (showLoadingState) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const data = await fetchRfidCardsApi(token, {
        search: debouncedSearch,
        status: statusFilter === "all" ? undefined : statusFilter === "active" ? 1 : 0,
      })
      setCards(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load RFID cards."
      toast.error(message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadCards(true)
  }, [token, debouncedSearch, statusFilter])

  // Toggle status
  const handleToggleStatus = async (card: RfidCard) => {
    if (!token || togglingId !== null) return
    const newStatus = card.status === 1 ? 0 : 1
    setTogglingId(card.id)

    try {
      await toggleRfidCardStatusApi(token, card.id, newStatus)
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, status: newStatus } : c))
      )
      toast.success(
        `RFID card "${card.card_name}" marked as ${newStatus === 1 ? "Active" : "Inactive"}.`
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update RFID card status."
      toast.error(message)
    } finally {
      setTogglingId(null)
    }
  }

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!token || !selectedCard) return
    setIsSubmitting(true)
    try {
      await deleteRfidCardApi(token, selectedCard.id)
      setCards((prev) => prev.filter((c) => c.id !== selectedCard.id))
      toast.success(`RFID card "${selectedCard.card_name}" deleted successfully.`)
      setIsDeleteOpen(false)
      setSelectedCard(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete RFID card."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Summary counts
  const totalCount = cards.length
  const activeCount = cards.filter((c) => c.status === 1).length
  const inactiveCount = cards.filter((c) => c.status === 0).length

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Radio className="size-6 text-primary" />
            RFID Cards & Tags
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage smart identity cards, keyfobs, wristbands, and frequencies for institutions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadCards(false)}
            disabled={isRefreshing || isLoading}
            className="gap-2 cursor-pointer"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-xs border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Cards
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? <Skeleton className="h-8 w-14" /> : totalCount}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Radio className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Active Cards
              </p>
              <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {isLoading ? <Skeleton className="h-8 w-14" /> : activeCount}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Inactive
              </p>
              <p className="text-2xl font-bold tracking-tight text-muted-foreground">
                {isLoading ? <Skeleton className="h-8 w-14" /> : inactiveCount}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
              <XCircle className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/60 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by card name, SKU code, frequency, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status Tabs */}
          <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === "active"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === "inactive"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Inactive
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-1">
            <button
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="Table View"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "table"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-border/60">
              <Skeleton className="h-44 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full mt-4" />
              </div>
            </Card>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <Card className="border-dashed border-2 p-12 text-center">
          <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
            <div className="p-3 rounded-full bg-muted text-muted-foreground">
              <Radio className="size-8" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No RFID Cards Found</h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "No RFID cards match the selected filter criteria."
                : "No RFID cards have been registered in the system yet."}
            </p>
          </div>
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => {
            const imageUrl = getFullImageUrl(card.card_image || card.rfid_image)
            const isToggling = togglingId === card.id

            return (
              <Card
                key={card.id}
                className="overflow-hidden border-border/60 hover:border-primary/40 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  {/* Image / Header Banner */}
                  <div className="relative h-44 bg-muted/40 overflow-hidden flex items-center justify-center border-b border-border/60">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={card.card_name}
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          ;(e.target as HTMLElement).style.display = "none"
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                        <Radio className="size-10 stroke-1 text-muted-foreground/60" />
                        <span className="text-xs">No preview image</span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <Badge
                        variant="secondary"
                        className={`text-xs font-semibold px-2 py-0.5 shadow-xs ${
                          card.status === 1
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {card.status === 1 ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {/* Card Type Badge */}
                    <div className="absolute bottom-3 left-3">
                      <Badge
                        variant="outline"
                        className="text-[11px] font-medium bg-background/90 backdrop-blur-xs uppercase tracking-wider"
                      >
                        {card.card_type ? card.card_type.replace(/_/g, " ") : "Card"}
                      </Badge>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-medium text-primary uppercase tracking-wider flex items-center gap-1">
                          <Tag className="size-3" />
                          {card.frequency || "13.56 MHz"}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {card.card_code}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-foreground line-clamp-1 mt-0.5">
                        {card.card_name}
                      </h3>
                    </div>

                    {card.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {card.description}
                      </p>
                    )}

                    {/* Technical Specs Pills */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Scan className="size-3.5 text-foreground/70 shrink-0" />
                        <span className="truncate">Range: {card.read_range || "Standard"}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Package className="size-3.5 text-foreground/70 shrink-0" />
                        <span className="truncate">MOQ: {card.min_order_qty || 1} pcs</span>
                      </div>

                      <div className="col-span-2 flex items-center justify-between text-foreground font-semibold pt-1">
                        <span className="text-xs text-muted-foreground font-normal">Unit Price</span>
                        <span>₹{Number(card.unit_price || 0).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(card)}
                    disabled={isToggling}
                    className={`h-8 px-2.5 text-xs gap-1.5 cursor-pointer ${
                      card.status === 1
                        ? "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                        : "text-emerald-600 hover:bg-emerald-500/10"
                    }`}
                  >
                    <Power className={`size-3.5 ${isToggling ? "animate-spin" : ""}`} />
                    {card.status === 1 ? "Deactivate" : "Activate"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCard(card)
                      setIsDeleteOpen(true)
                    }}
                    className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="border-border/60 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Card Name & SKU</TableHead>
                  <TableHead>Type & Frequency</TableHead>
                  <TableHead>Read Range & MOQ</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => {
                  const imageUrl = getFullImageUrl(card.card_image || card.rfid_image)
                  const isToggling = togglingId === card.id

                  return (
                    <TableRow key={card.id}>
                      <TableCell>
                        <div className="size-12 rounded-lg bg-muted border border-border/60 overflow-hidden flex items-center justify-center shrink-0">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={card.card_name}
                              className="size-full object-contain p-1"
                              onError={(e) => {
                                ;(e.target as HTMLElement).style.display = "none"
                              }}
                            />
                          ) : (
                            <Radio className="size-5 text-muted-foreground/50" />
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground text-sm">{card.card_name}</p>
                          <p className="text-xs font-mono text-muted-foreground">{card.card_code}</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="text-[11px] capitalize">
                            {card.card_type ? card.card_type.replace(/_/g, " ") : "Card"}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{card.frequency || "13.56 MHz"}</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>
                            <span className="font-medium text-foreground">Range:</span>{" "}
                            {card.read_range || "Standard"}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">MOQ:</span>{" "}
                            {card.min_order_qty || 1} pcs
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="font-semibold text-foreground text-xs">
                          ₹{Number(card.unit_price || 0).toLocaleString("en-IN")}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs font-semibold px-2 py-0.5 ${
                            card.status === 1
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {card.status === 1 ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={card.status === 1 ? "Deactivate" : "Activate"}
                            onClick={() => handleToggleStatus(card)}
                            disabled={isToggling}
                            className={`size-8 cursor-pointer ${
                              card.status === 1
                                ? "text-muted-foreground hover:text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            <Power className={`size-4 ${isToggling ? "animate-spin" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => {
                              setSelectedCard(card)
                              setIsDeleteOpen(true)
                            }}
                            className="size-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <Trash2 className="size-5" />
              Delete RFID Card
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{selectedCard?.card_name}</strong>? This RFID card
              record will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
              className="cursor-pointer gap-2"
            >
              {isSubmitting && <RefreshCw className="size-4 animate-spin" />}
              Delete Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
