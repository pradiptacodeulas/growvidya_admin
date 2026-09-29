export type ItemType = 'included' | 'addon' | 'usage_based'
export type BillingType = 'recurring' | 'one_time' | 'per_unit'
export type BillingCycle = 'monthly' | 'quarterly' | 'half_yearly' | 'annual' | 'trial'

export interface SubscriptionItem {
  id?: number
  sub_id?: number
  item_name: string // e.g. "SMS Notifications", "Push Notifications"
  item_code?: string | null // e.g. "SMS_PACK", "PUSH_NOTIF", "RFID_MODULE"
  item_type: ItemType
  price: number | string // 0.00 if included in plan, or cost if addon
  quota_limit?: number | null // e.g. 10000, null for unlimited
  unit?: string | null // "messages", "notifications", "gb", "license", "flat"
  billing_type: BillingType
  description?: string | null
  status: 1 | 0 // 1 = Active, 0 = Inactive
  display_order?: number
}

export interface SubscriptionPackage {
  id: number
  plan_name: string // e.g. "Growth Plan"
  plan_code: string // e.g. "growth_annual"
  description: string
  price: number | string // Base plan price (e.g. 5999.00)
  billing_cycle: BillingCycle
  max_students: number // 0 = Unlimited
  max_teachers: number // 0 = Unlimited
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
  max_students: number
  max_teachers: number
  status?: 1 | 0
  items?: SubscriptionItem[]
}

export interface UpdatePackagePayload {
  plan_name?: string
  plan_code?: string
  description?: string
  price?: number | string
  billing_cycle?: BillingCycle
  max_students?: number
  max_teachers?: number
  status?: 1 | 0
  items?: SubscriptionItem[]
}

export interface CreateItemPayload {
  item_name: string
  item_code?: string | null
  item_type: ItemType
  price: number | string
  quota_limit?: number | null
  unit?: string | null
  billing_type: BillingType
  description?: string | null
  status?: 1 | 0
  display_order?: number
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
