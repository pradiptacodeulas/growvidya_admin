export type MachineType = 'biometric' | 'facial' | 'rfid' | 'hybrid' | string

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
