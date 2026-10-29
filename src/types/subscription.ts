import type { CatalogCounts, PaginationMeta } from "@/types/pagination"

export type BillingCycle = "monthly" | "quarterly" | "half_yearly" | "annual" | "trial"

export interface SubscriptionItem {
  id?: number
  sub_id?: number
  item_name: string
  item_code?: string | null
  item_type?: "module" | "feature" | string
  description?: string | null
  status: 1 | 0
  created_at?: string
  updated_at?: string
}

export interface SubscriptionPackage {
  id: number
  plan_name: string
  plan_code: string
  plan_group?: string | null
  tier_rank?: number
  description: string
  price: number | string
  original_price?: number | string | null
  discount_amount?: number
  discount_percent?: number
  billing_cycle: BillingCycle
  free_trial_days?: number
  max_students: number
  max_teachers?: number
  max_branches?: number
  included_storage_gb?: number
  is_popular?: 0 | 1 | boolean
  status: 1 | 0
  subscriber_count?: number
  items_count?: number
  features?: Record<string, boolean>
  cycle_meta?: {
    key: string
    label: string
    months: number
    days: number
  }
  items: SubscriptionItem[]
  created_at: string
  updated_at?: string
}

export interface CreatePackagePayload {
  plan_name: string
  plan_code: string
  plan_group?: string
  tier_rank?: number
  description?: string
  price: number | string
  original_price?: number | string | null
  billing_cycle: BillingCycle
  free_trial_days?: number
  max_students: number
  included_storage_gb?: number
  is_popular?: 0 | 1
  status?: 1 | 0
  items?: SubscriptionItem[]
}

export interface UpdatePackagePayload {
  plan_name?: string
  plan_code?: string
  plan_group?: string
  tier_rank?: number
  description?: string
  price?: number | string
  original_price?: number | string | null
  billing_cycle?: BillingCycle
  free_trial_days?: number
  max_students?: number
  included_storage_gb?: number
  is_popular?: 0 | 1
  status?: 1 | 0
  items?: SubscriptionItem[]
}

export interface CreateItemPayload {
  item_name: string
  item_code?: string | null
  item_type?: "module" | "feature" | string
  description?: string | null
  status?: 1 | 0
}

export interface PackagesApiResponse {
  success: boolean
  message: string
  data: SubscriptionPackage[]
}

/** Global (unfiltered) package catalog totals, plus subscription item totals. */
export interface PackageCounts extends CatalogCounts {
  total_items: number
  active_items: number
}

/** Paginated response of GET /packages */
export interface PackagesListResult {
  packages: SubscriptionPackage[]
  pagination: PaginationMeta
  counts: PackageCounts
}

/** Query params accepted by GET /packages */
export interface PackagesListParams {
  search?: string
  status?: number | string
  billing_cycle?: string
  page?: number
  limit?: number
}

export interface SinglePackageApiResponse {
  success: boolean
  message: string
  data: SubscriptionPackage
}

export interface PackageItemsApiResponse {
  success: boolean
  message: string
  data: SubscriptionItem[]
}

export interface SingleItemApiResponse {
  success: boolean
  message: string
  data: SubscriptionItem
}

export type SchoolSubscriptionStatus =
  | "pending"
  | "active"
  | "trial"
  | "expired"
  | "suspended"
  | "rejected"
  | "superseded"

export type SchoolPaymentStatus = "completed" | "pending" | "failed"

export interface OrderInvoiceLineItem {
  category: string
  title: string
  description?: string
  quantity: number
  unit_price: number
  total: number
}

export interface OrderInvoiceDetails {
  id: number
  order_no: string
  invoice_no?: string | null
  school_id?: number | null
  school_name?: string | null
  school_code?: string | null
  school_email?: string | null
  school_phone?: string | null
  school_address?: string | null
  order_type: string
  action_type: string
  plan_id?: number | null
  plan_name?: string | null
  billing_cycle?: string | null
  plan_amount: number
  addons_amount: number
  subtotal_amount: number
  coupon_code?: string | null
  discount_amount: number
  tax_amount: number
  grand_total: number
  currency: string
  payment_method: string
  razorpay_order_id?: string | null
  razorpay_payment_id?: string | null
  utr_number?: string | null
  shipping_address?: string | null
  status: string
  failure_code?: string | null
  failure_reason?: string | null
  subscription_id?: number | null
  start_date?: string | null
  end_date?: string | null
  subscription_status?: string | null
  verification_notes?: string | null
  paid_at?: string | null
  created_at?: string | null
  line_items: OrderInvoiceLineItem[]
}

export interface SubscriptionAuditLog {
  id: number
  school_id: number
  subscription_id?: number | null
  payment_order_id?: number | null
  action: string
  actor_type: string
  actor_id?: number | null
  old_plan_id?: number | null
  new_plan_id?: number | null
  old_status?: string | null
  new_status?: string | null
  old_end_date?: string | null
  new_end_date?: string | null
  amount?: number | string | null
  notes?: string | null
  created_at: string
}

export interface SchoolSubscription {
  id: number
  school_id: number
  school_name: string
  school_code: string
  school_email?: string | null
  school_phone?: string | null
  school_address?: string | null
  plan_id: number
  plan_name: string
  plan_code?: string
  tier_rank?: number
  included_storage_gb?: number
  plan_price: number | string
  billing_cycle: BillingCycle
  max_students?: number
  max_teachers?: number
  action_type?: string
  plan_amount?: number | string | null
  addons_amount?: number | string | null
  amount_paid: number | string
  original_amount?: number | string | null
  discount_amount?: number | string
  coupon_id?: number | null
  coupon_code?: string | null
  payment_gateway?: string
  payment_transaction_id?: string | null
  payment_order_id?: number | null
  order_no?: string | null
  invoice_no?: string | null
  payment_status: SchoolPaymentStatus
  status: SchoolSubscriptionStatus
  start_date: string
  end_date: string
  verification_notes?: string | null
  verified_by?: number | null
  verified_by_name?: string | null
  verified_at?: string | null
  rejection_reason?: string | null
  order_details?: OrderInvoiceDetails | null
  audit_logs?: SubscriptionAuditLog[]
  created_at: string
  updated_at?: string | null
}

export interface SubscriptionCounts {
  total: number
  pending: number
  active: number
  expired: number
  suspended: number
  trial: number
  rejected?: number
}

export interface SubscriptionsPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SubscriptionsListResult {
  subscriptions: SchoolSubscription[]
  pagination: SubscriptionsPagination
  counts: SubscriptionCounts
}

export interface ApproveSubscriptionPayload {
  verificationNotes?: string
  startDate?: string
  endDate?: string
}

export interface RejectSubscriptionPayload {
  rejectionReason?: string
}

export interface ManualAssignSubscriptionPayload {
  school_id: number
  plan_id: number
  custom_end_date?: string | null
  amount_paid?: number
  reason: string
}

export interface SchoolLookupItem {
  id: number
  school_name: string
  school_code: string
  email?: string | null
  phone_number?: string | null
  plan_name?: string | null
  subscription_status?: string | null
  student_count?: number
}
