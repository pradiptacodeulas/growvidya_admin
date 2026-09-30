export type DiscountType = 'fixed' | 'percentage'

export interface Coupon {
  id: number
  code: string
  description: string | null
  discount_type: DiscountType | string
  discount_value: string
  min_order_amount: string | null
  max_discount_amount: string | null
  start_date: string
  end_date: string
  max_uses: number | null
  used_count: number
  status: number
  created_at: string
  updated_at: string
  total_redemptions?: number
  total_discount_given?: string | number | null
}

export interface PaginationInfo {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface CouponsData {
  coupons: Coupon[]
  pagination: PaginationInfo
}

export interface CouponQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: number | string
  discount_type?: string
}

export interface CouponsApiResponse {
  success: boolean
  message: string
  data: CouponsData | Coupon[]
}

export interface CouponUsage {
  id?: number
  coupon_id?: number
  user_id?: number
  order_id?: number | string
  discount_amount?: string | number
  school_name?: string
  user_email?: string
  used_at?: string
  created_at?: string
  [key: string]: unknown
}

export interface CouponDetail extends Coupon {
  usages?: CouponUsage[]
}

export interface SingleCouponApiResponse {
  success: boolean
  message: string
  data: CouponDetail | null
  errors?: unknown
}

export interface CreateCouponPayload {
  code: string
  description?: string
  discount_type: DiscountType | string
  discount_value: number | string
  min_order_amount?: number | string | null
  max_discount_amount?: number | string | null
  start_date?: string | null
  end_date?: string | null
  max_uses?: number | string | null
  status?: number
}

export interface UpdateCouponPayload extends Partial<CreateCouponPayload> {}

