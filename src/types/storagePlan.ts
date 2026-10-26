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
