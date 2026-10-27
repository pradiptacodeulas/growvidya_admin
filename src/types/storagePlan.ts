import type { PaginationMeta, CatalogCounts } from "@/types/pagination"

export type StorageOrderStatus = 'pending' | 'active' | 'expired' | 'cancelled'

export interface CapacityUnit {
  id: number
  unit_name: string
  unit_code: string
  factor_in_mb: number
  status: number
  created_at?: string
  updated_at?: string
}

export interface StoragePlan {
  id: number
  plan_name: string
  storage_capacity: number
  capacity_unit_id: number
  unit_code: string
  unit_name: string
  factor_in_mb: number
  total_capacity_mb: number
  monthly_price: number | string
  annual_price: number | string
  description: string | null
  status: number // 1 = Active, 0 = Inactive
  created_at: string
  updated_at?: string
}

export interface CreateStoragePlanPayload {
  plan_name: string
  storage_capacity: number
  capacity_unit_id: number
  monthly_price: number
  annual_price: number
  description?: string
  status?: number
}

export interface UpdateStoragePlanPayload {
  plan_name?: string
  storage_capacity?: number
  capacity_unit_id?: number
  monthly_price?: number
  annual_price?: number
  description?: string
  status?: number
}

export interface StoragePlanFilterParams {
  search?: string
  status?: number | string | "all"
}

/** Paginated response of GET /storage-plans (see src/types/pagination.ts). */
export interface StoragePlanListResult {
  plans: StoragePlan[]
  pagination: PaginationMeta
  counts: CatalogCounts
}

export interface StoragePlanBuyerOrder {
  id: number
  order_no: string
  school_id: number
  storage_plan_id: number
  billing_cycle: string
  quantity: number
  unit_price: number | string
  total_amount: number | string
  payment_transaction_id: string | null
  order_status: StorageOrderStatus
  start_date: string | null
  end_date: string | null
  remarks: string | null
  created_at: string
  updated_at: string | null
  storage_plan_name: string
  storage_capacity: number
  unit_code: string
  unit_name: string
  monthly_price: number | string
  annual_price: number | string
  school_name: string
  school_code: string
  school_email: string | null
  school_phone: string | null
  school_address: string | null
  admin_user_id: number | null
  admin_name: string | null
  admin_email: string | null
  admin_phone: string | null
  base_subscription_id: number | null
  base_plan_id: number | null
  base_plan_name: string | null
  base_plan_code: string | null
  base_billing_cycle: string | null
  base_subscription_status: string | null
  base_start_date: string | null
  base_end_date: string | null
}

export interface StoragePlanBuyerCounts {
  total_orders: number
  total_quantity: number
  total_revenue: number
  pending_count: number
  active_count: number
  expired_count: number
  cancelled_count: number
}

export interface StoragePlanBuyerListResult {
  buyers: StoragePlanBuyerOrder[]
  pagination: PaginationMeta
  counts: StoragePlanBuyerCounts
}

export interface UpdateStoragePlanBuyerPayload {
  order_status?: StorageOrderStatus
  start_date?: string | null
  end_date?: string | null
  remarks?: string | null
}
