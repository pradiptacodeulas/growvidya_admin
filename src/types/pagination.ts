/**
 * Shared pagination contract for Super Admin catalog list endpoints.
 *
 * Request  : ?page=1&limit=12 (plus existing filters)
 * Response : { <listKey>: T[], pagination: PaginationMeta, counts: CatalogCounts }
 */

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/** Global (unfiltered) catalog totals used by the summary metric cards. */
export interface CatalogCounts {
  total: number
  active: number
  inactive: number
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export const EMPTY_PAGINATION: PaginationMeta = {
  total: 0,
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
}

export const EMPTY_COUNTS: CatalogCounts = {
  total: 0,
  active: 0,
  inactive: 0,
}
