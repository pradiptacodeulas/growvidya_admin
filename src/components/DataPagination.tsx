import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { PAGE_SIZE_OPTIONS, type PaginationMeta } from "@/types/pagination"

interface DataPaginationProps {
  pagination: PaginationMeta
  onPageChange: (page: number) => void
  onPageSizeChange?: (limit: number) => void
  pageSizeOptions?: number[]
  isLoading?: boolean
  itemLabel?: string
  className?: string
}

function getVisiblePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | string)[] = []
  if (current <= 3) {
    pages.push(1, 2, 3, 4, "...", total)
  } else if (current >= total - 2) {
    pages.push(1, "...", total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, "...", current - 1, current, current + 1, "...", total)
  }
  return pages
}

/**
 * Reusable pagination footer matching the Coupons DataTable pagination design.
 * Always renders the range summary, rows-per-page selector, and first/prev/numbered/next/last controls.
 */
export function DataPagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  isLoading = false,
  itemLabel = "records",
  className = "",
}: DataPaginationProps) {
  const page = Math.max(1, pagination?.page || 1)
  const limit = Math.max(1, pagination?.limit || 10)
  const totalCount = Math.max(0, pagination?.total || 0)
  const totalPages = Math.max(1, pagination?.totalPages || Math.ceil(totalCount / limit) || 1)
  const hasPrev = pagination ? pagination.hasPrevPage : page > 1
  const hasNext = pagination ? pagination.hasNextPage : page < totalPages
  const startItem = totalCount > 0 ? (page - 1) * limit + 1 : 0
  const endItem = totalCount > 0 ? Math.min(page * limit, totalCount) : 0

  const handlePageChange = (newPage: number) => {
    const clamped = Math.min(Math.max(1, newPage), totalPages)
    if (clamped === page || isLoading) return
    onPageChange(clamped)
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-border/60 bg-muted/20 ${className}`}
    >
      {/* Left: Range and Limits */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
        <span>
          Showing <strong className="text-foreground font-semibold">{startItem}</strong> to{" "}
          <strong className="text-foreground font-semibold">{endItem}</strong> of{" "}
          <strong className="text-foreground font-semibold">{totalCount}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={isLoading}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring cursor-pointer"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-xs cursor-pointer"
          onClick={() => handlePageChange(1)}
          disabled={page <= 1 || isLoading}
          title="First Page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-xs cursor-pointer"
          onClick={() => handlePageChange(Math.max(1, page - 1))}
          disabled={!hasPrev || isLoading}
          title="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Desktop Numeric Pages */}
        <div className="hidden sm:flex items-center gap-1">
          {getVisiblePageNumbers(page, totalPages).map((p, idx) =>
            typeof p === "number" ? (
              <Button
                key={idx}
                variant={page === p ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0 text-xs font-medium cursor-pointer"
                onClick={() => handlePageChange(p)}
                disabled={isLoading}
              >
                {p}
              </Button>
            ) : (
              <span key={idx} className="px-1 text-xs text-muted-foreground select-none">
                {p}
              </span>
            )
          )}
        </div>

        {/* Mobile Page indicator */}
        <span className="sm:hidden text-xs font-medium px-2 text-muted-foreground">
          Page {page} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-xs cursor-pointer"
          onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
          disabled={!hasNext || isLoading}
          title="Next Page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-xs cursor-pointer"
          onClick={() => handlePageChange(totalPages)}
          disabled={page >= totalPages || isLoading}
          title="Last Page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default DataPagination
