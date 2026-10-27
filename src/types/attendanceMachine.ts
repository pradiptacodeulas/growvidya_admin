import type { CatalogCounts, PaginationMeta, PaginationParams } from "@/types/pagination"

export type MachineType = 'biometric' | 'facial' | 'rfid' | 'hybrid' | string

export type HardwareOrderStatus = 'pending' | 'approved' | 'dispatched' | 'delivered' | 'cancelled'

export interface AttendanceMachine {
  id: number
  machine_name: string
  model_number: string
  brand: string
  machine_type: MachineType
  connectivity: string
  user_capacity: number
  log_capacity: number
  push_protocol: string
  unit_price: number | string
  amc_price: number | string
  machine_image: string | null
  specifications: string | null
  status: number // 1: Active, 0: Inactive
  created_at?: string
  updated_at?: string
}

export interface AttendanceMachineFilterParams {
  search?: string
  status?: string | number
  machine_type?: string
  brand?: string
}

/** Filters + server-side pagination params for the paginated list endpoint. */
export interface AttendanceMachineListParams extends AttendanceMachineFilterParams, PaginationParams {}

/** Paginated response shape of GET /attendance-machines. */
export interface AttendanceMachineListResult {
  machines: AttendanceMachine[]
  pagination: PaginationMeta
  counts: CatalogCounts
}

export interface CreateAttendanceMachinePayload {
  machine_name: string
  model_number: string
  brand: string
  machine_type?: MachineType
  connectivity?: string
  user_capacity?: number
  log_capacity?: number
  push_protocol?: string
  unit_price: number | string
  amc_price?: number | string
  machine_image?: string | File | null
  specifications?: string
  status?: number
}

export interface UpdateAttendanceMachinePayload {
  machine_name?: string
  model_number?: string
  brand?: string
  machine_type?: MachineType
  connectivity?: string
  user_capacity?: number
  log_capacity?: number
  push_protocol?: string
  unit_price?: number | string
  amc_price?: number | string
  machine_image?: string | File | null
  specifications?: string
  status?: number
}

export interface AttendanceMachineBuyerOrder {
  id: number
  order_no: string | null
  school_id: number
  branch_id: number | null
  machine_master_id: number
  quantity: number
  unit_price: number | string
  total_amount: number | string
  device_serial_number: string
  device_location: string | null
  ip_address: string | null
  port: number | null
  status: number
  order_status: HardwareOrderStatus
  payment_transaction_id: string | null
  shipping_address: string | null
  remarks: string | null
  last_sync_at: string | null
  created_at: string
  updated_at: string | null
  machine_name: string
  model_number: string
  brand: string
  machine_type: string
  connectivity: string | null
  machine_image: string | null
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

export interface AttendanceMachineBuyerCounts {
  total_orders: number
  total_quantity: number
  total_revenue: number
  pending_count: number
  approved_count: number
  dispatched_count: number
  delivered_count: number
  cancelled_count: number
  active_devices: number
}

export interface AttendanceMachineBuyerListResult {
  buyers: AttendanceMachineBuyerOrder[]
  pagination: PaginationMeta
  counts: AttendanceMachineBuyerCounts
}

export interface UpdateAttendanceMachineBuyerPayload {
  order_status?: HardwareOrderStatus
  status?: number
  device_serial_number?: string
  device_location?: string | null
  ip_address?: string | null
  port?: number | null
  shipping_address?: string | null
  remarks?: string | null
}
