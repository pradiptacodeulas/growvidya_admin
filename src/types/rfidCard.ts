import type { CatalogCounts, PaginationMeta } from "@/types/pagination"

export type RfidCardType = 'pvc_card' | 'keyfob' | 'wristband' | 'sticker' | string

export type RfidOrderStatus = 'pending' | 'approved' | 'dispatched' | 'delivered' | 'cancelled'

export interface RfidCard {
  id: number
  card_name: string
  card_code: string
  card_type: RfidCardType
  frequency: string
  read_range: string
  unit_price: number | string
  min_order_qty: number
  card_image?: string | null
  rfid_image?: string | null
  description?: string | null
  status: number // 1: Active, 0: Inactive
  created_at?: string
  updated_at?: string
}

export interface RfidCardFilterParams {
  search?: string
  status?: string | number
  card_type?: string
}

/** Paginated response of GET /rfid-cards (rows for current page + global counts). */
export interface RfidCardListResult {
  cards: RfidCard[]
  pagination: PaginationMeta
  counts: CatalogCounts
}

export interface CreateRfidCardPayload {
  card_name: string
  card_code: string
  card_type?: RfidCardType
  frequency?: string
  read_range?: string
  unit_price: number | string
  min_order_qty?: number
  card_image?: string | File | null
  rfid_image?: string | File | null
  description?: string
  status?: number
}

export interface UpdateRfidCardPayload {
  card_name?: string
  card_code?: string
  card_type?: RfidCardType
  frequency?: string
  read_range?: string
  unit_price?: number | string
  min_order_qty?: number
  card_image?: string | File | null
  rfid_image?: string | File | null
  description?: string
  status?: number
}

export interface RfidCardBuyerOrder {
  id: number
  order_no: string
  school_id: number
  rfid_card_id: number
  quantity: number
  unit_price: number | string
  total_amount: number | string
  order_status: RfidOrderStatus
  payment_transaction_id: string | null
  shipping_address: string | null
  remarks: string | null
  created_at: string
  updated_at: string | null
  card_name: string
  card_code: string
  card_type: string
  frequency: string | null
  read_range: string | null
  card_image: string | null
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

export interface RfidCardBuyerCounts {
  total_orders: number
  total_cards_ordered: number
  total_revenue: number
  pending_count: number
  approved_count: number
  dispatched_count: number
  delivered_count: number
  cancelled_count: number
}

export interface RfidCardBuyerListResult {
  buyers: RfidCardBuyerOrder[]
  pagination: PaginationMeta
  counts: RfidCardBuyerCounts
}

export interface UpdateRfidCardBuyerPayload {
  order_status?: RfidOrderStatus
  shipping_address?: string | null
  remarks?: string | null
}
