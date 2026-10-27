import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
import {
  fetchRfidCardsApi,
  deleteRfidCardApi,
  toggleRfidCardStatusApi,
} from "@/services/rfidCardService"
import type { RfidCard } from "@/types/rfidCard"
import {
  DEFAULT_PAGE_SIZE,
  EMPTY_COUNTS,
  EMPTY_PAGINATION,
  type CatalogCounts,
  type PaginationMeta,
} from "@/types/pagination"
import { DataPagination } from "@/components/DataPagination"
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
  Plus,
  Pencil,
} from "lucide-react"
import { toast } from "sonner"

export default function RfidCards() {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)
  const { can } = usePermission()
  const canAddRfid = can("rfid_cards", "can_add")
  const canEditRfid = can("rfid_cards", "can_edit")
  const canDeleteRfid = can("rfid_cards", "can_delete")
  const canManageRfid = can("rfid_cards", "can_manage")
  const [cards, setCards] = useState<RfidCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // Server-side pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION)
  const [counts, setCounts] = useState<CatalogCounts>(EMPTY_COUNTS)
  // Guards against out-of-order responses when filters/pages change quickly
  const requestIdRef = useRef(0)

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<RfidCard | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debounce search (reset to first page when the search term changes)
  useEffect(() => {
    if (searchQuery === debouncedSearch) return
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery, debouncedSearch])

  // Fetch cards (NO fallback data)
  const loadCards = async (showLoadingState = true) => {
    if (!token) return
    const requestId = ++requestIdRef.current
    if (showLoadingState) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const data = await fetchRfidCardsApi(token, {
        search: debouncedSearch,
        status: statusFilter === "all" ? undefined : statusFilter === "active" ? 1 : 0,
        page,
        limit: pageSize,
      })
      if (requestId !== requestIdRef.current) return
      // Requested page no longer exists (e.g. rows removed elsewhere) — jump to the last page
      if (data.cards.length === 0 && page > 1 && data.pagination.totalPages < page) {
        setPage(Math.max(1, data.pagination.totalPages))
        return
      }
      setCards(data.cards)
      setPagination(data.pagination)
      setCounts(data.counts)
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return
      const message = err instanceof Error ? err.message : "Failed to load RFID cards."
      toast.error(message)
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }

  useEffect(() => {
    loadCards(true)
  }, [token, debouncedSearch, statusFilter, page, pageSize])

  const handlePageSizeChange = (size: number) => {
    if (size === pageSize) return
    setPageSize(size)
    setPage(1)
  }

  const handleStatusChange = (val: "all" | "active" | "inactive") => {
    if (val === statusFilter) return
    setStatusFilter(val)
    setPage(1)
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setDebouncedSearch("")
    setStatusFilter("all")
    setPage(1)
  }

  const hasActiveFilters = Boolean(searchQuery) || statusFilter !== "all"

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
      // Refresh the current page so the global counts stay accurate
      loadCards(false)
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
      toast.success(`RFID card "${selectedCard.card_name}" deleted successfully.`)
      setIsDeleteOpen(false)
      setSelectedCard(null)
      if (cards.length === 1 && page > 1) {
        // Removed the last row on this page — step back one page (effect reloads)
        setPage((p) => Math.max(1, p - 1))
      } else {
        loadCards(false)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete RFID card."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Summary counts (global catalog totals from the server, unaffected by filters/paging)
  const totalCount = counts.total
  const activeCount = counts.active
  const inactiveCount = counts.inactive

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
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
            className="gap-2 h-9 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing || isLoading ? "animate-spin" : ""}`} />
            {isRefreshing || isLoading ? "Refreshing..." : "Refresh"}
          </Button>

          {canAddRfid && (
            <Button
              onClick={() => navigate("/rfid-cards/create")}
              size="sm"
              className="gap-1.5 h-9 text-xs font-semibold cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Card</span>
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Total Cards</span>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? <Skeleton className="h-7 w-12" /> : totalCount}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Radio className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Active Cards</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {isLoading ? <Skeleton className="h-7 w-12" /> : activeCount}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Inactive Cards</span>
              <div className="text-2xl font-bold tracking-tight text-muted-foreground">
                {isLoading ? <Skeleton className="h-7 w-12" /> : inactiveCount}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by card name, SKU code, frequency, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/30 text-xs">
            <button
              type="button"
              onClick={() => handleStatusChange("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("active")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === "active"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("inactive")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === "inactive"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Inactive
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/30 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="Table View"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: DataTable or Grid View */}
      {viewMode === "table" ? (
        <Card className="border-border/70 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[72px]">Image</TableHead>
                <TableHead className="w-[240px]">Card Name & SKU</TableHead>
                <TableHead>Type & Frequency</TableHead>
                <TableHead>Read Range & MOQ</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead className="text-right">Status / Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Skeleton className="h-11 w-11 rounded-lg" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-36 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-6 w-24 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : cards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                        <Radio className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        No RFID cards found
                      </span>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {hasActiveFilters
                          ? "Try adjusting your search query or filters."
                          : "No RFID cards have been registered in the system yet."}
                      </p>
                      {hasActiveFilters ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetFilters}
                          className="mt-2 text-xs font-semibold cursor-pointer"
                        >
                          Reset all filters
                        </Button>
                      ) : canAddRfid ? (
                        <Button
                          size="sm"
                          onClick={() => navigate("/rfid-cards/create")}
                          className="mt-2 text-xs font-semibold gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add First Card</span>
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                cards.map((card) => {
                  const imageUrl = getFullImageUrl(card.card_image || card.rfid_image)
                  const isToggling = togglingId === card.id

                  return (
                    <TableRow key={card.id} className="group">
                      <TableCell>
                        <div className="size-11 rounded-lg bg-muted border border-border/60 overflow-hidden flex items-center justify-center shrink-0">
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground text-sm">
                              {card.card_name}
                            </span>
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 tracking-wider">
                              {card.card_code}
                            </span>
                          </div>
                          {card.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                              {card.description}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-[11px] capitalize">
                            {card.card_type ? card.card_type.replace(/_/g, " ") : "Card"}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{card.frequency || "—"}</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>
                            <span className="font-medium text-foreground">Range:</span>{" "}
                            {card.read_range || "—"}
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

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => canManageRfid && handleToggleStatus(card)}
                            disabled={!canManageRfid || isToggling}
                            title={
                              canManageRfid
                                ? `Click to mark as ${card.status === 1 ? "Inactive" : "Active"}`
                                : undefined
                            }
                            className={`transition-transform ${
                              canManageRfid ? "cursor-pointer active:scale-95" : "cursor-default"
                            } ${isToggling ? "opacity-50 pointer-events-none" : ""}`}
                          >
                            {card.status === 1 ? (
                              <Badge
                                variant="default"
                                className="capitalize gap-1 text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Active
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="capitalize gap-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                              >
                                <XCircle className="h-3 w-3" />
                                Inactive
                              </Badge>
                            )}
                          </button>

                          {canEditRfid && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit"
                              onClick={() => navigate(`/rfid-cards/${card.id}/edit`)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}

                          {canDeleteRfid && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              onClick={() => {
                                setSelectedCard(card)
                                setIsDeleteOpen(true)
                              }}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <DataPagination
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            isLoading={isLoading || isRefreshing}
            itemLabel="cards"
          />
        </Card>
      ) : (
        /* Grid View */
        <div className="space-y-4">
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
            <Card className="border-border/70 shadow-sm p-12 text-center">
              <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                <div className="p-3 rounded-full bg-muted text-muted-foreground">
                  <Radio className="size-8" />
                </div>
                <h3 className="text-base font-semibold text-foreground">No RFID Cards Found</h3>
                <p className="text-xs text-muted-foreground">
                  {hasActiveFilters
                    ? "No RFID cards match the selected filter criteria."
                    : "No RFID cards have been registered in the system yet."}
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cards.map((card) => {
                const imageUrl = getFullImageUrl(card.card_image || card.rfid_image)

                return (
                  <Card
                    key={card.id}
                    className="overflow-hidden border-border/60 hover:border-primary/40 hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    <div>
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

                        <div className="absolute bottom-3 left-3">
                          <Badge
                            variant="outline"
                            className="text-[11px] font-medium bg-background/90 backdrop-blur-xs uppercase tracking-wider"
                          >
                            {card.card_type ? card.card_type.replace(/_/g, " ") : "Card"}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-medium text-primary uppercase tracking-wider flex items-center gap-1">
                              <Tag className="size-3" />
                              {card.frequency || "—"}
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

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Scan className="size-3.5 text-foreground/70 shrink-0" />
                            <span className="truncate">Range: {card.read_range || "—"}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Package className="size-3.5 text-foreground/70 shrink-0" />
                            <span className="truncate">MOQ: {card.min_order_qty || 1} pcs</span>
                          </div>

                          <div className="col-span-2 flex items-center justify-between text-foreground font-semibold pt-1">
                            <span className="text-xs text-muted-foreground font-normal">
                              Unit Price
                            </span>
                            <span>₹{Number(card.unit_price || 0).toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {(canManageRfid || canEditRfid || canDeleteRfid) && (
                      <div className="p-3 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-1">
                        <div>
                          {canManageRfid && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(card)}
                              disabled={togglingId === card.id}
                              title={card.status === 1 ? "Deactivate" : "Activate"}
                              className={`h-8 px-2 text-xs gap-1.5 cursor-pointer ${
                                card.status === 1
                                  ? "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                                  : "text-emerald-600 hover:bg-emerald-500/10"
                              }`}
                            >
                              <Power
                                className={`size-3.5 ${togglingId === card.id ? "animate-spin" : ""}`}
                              />
                              {card.status === 1 ? "Deactivate" : "Activate"}
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {canEditRfid && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit"
                              onClick={() => navigate(`/rfid-cards/${card.id}/edit`)}
                              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
                            >
                              <Pencil className="size-3.5" />
                              Edit
                            </Button>
                          )}

                          {canDeleteRfid && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete"
                              onClick={() => {
                                setSelectedCard(card)
                                setIsDeleteOpen(true)
                              }}
                              className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 cursor-pointer gap-1.5"
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}

          <Card className="border-border/70 shadow-sm overflow-hidden">
            <DataPagination
              pagination={pagination}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
              isLoading={isLoading || isRefreshing}
              itemLabel="cards"
              className="border-t-0"
            />
          </Card>
        </div>
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
