export type BillingCycle = 'monthly' | 'quarterly' | 'half_yearly' | 'annual' | 'trial'

export interface SubscriptionItem {
  id?: number
  sub_id?: number
  item_name: string // e.g. "Student information", "Fee management"
  item_code?: string | null // e.g. "STUDENT_INFORMATION", "FEE_MANAGEMENT"
  description?: string | null
  status: 1 | 0 // 1 = Active, 0 = Inactive
  created_at?: string
  updated_at?: string
}

export interface SubscriptionPackage {
  id: number
  plan_name: string // e.g. "Growth Plan"
  plan_code: string // e.g. "growth_annual"
  description: string
  price: number | string // Base plan price (e.g. 5999.00)
  billing_cycle: BillingCycle
  free_trial_days?: number // Dynamic free trial days (0 = no trial)
  max_students: number // 0 = Unlimited
  status: 1 | 0 // 1 = Active, 0 = Inactive
  subscriber_count?: number // Number of enrolled schools
  items_count?: number
  features?: Record<string, boolean>
  items: SubscriptionItem[] // Child items array
  created_at: string
  updated_at?: string
}

export interface CreatePackagePayload {
  plan_name: string
  plan_code: string
  description?: string
  price: number | string
  billing_cycle: BillingCycle
  free_trial_days?: number
  max_students: number
  status?: 1 | 0
  items?: SubscriptionItem[]
}

export interface UpdatePackagePayload {
  plan_name?: string
  plan_code?: string
  description?: string
  price?: number | string
  billing_cycle?: BillingCycle
  free_trial_days?: number
  max_students?: number
  status?: 1 | 0
  items?: SubscriptionItem[]
}

export interface CreateItemPayload {
  item_name: string
  item_code?: string | null
  description?: string | null
  status?: 1 | 0
}

export interface PackagesApiResponse {
  success: boolean
  message: string
  data: SubscriptionPackage[]
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

export type SchoolSubscriptionStatus = 'pending' | 'active' | 'trial' | 'expired' | 'suspended'
export type SchoolPaymentStatus = 'completed' | 'pending' | 'failed'

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
  plan_price: number | string
  billing_cycle: BillingCycle
  max_students?: number
  max_teachers?: number
  amount_paid: number | string
  original_amount?: number | string | null
  discount_amount?: number | string
  coupon_id?: number | null
  coupon_code?: string | null
  payment_gateway?: string
  payment_transaction_id?: string | null
  payment_status: SchoolPaymentStatus
  status: SchoolSubscriptionStatus
  start_date: string
  end_date: string
  verification_notes?: string | null
  verified_by?: number | null
  verified_by_name?: string | null
  verified_at?: string | null
  rejection_reason?: string | null
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
