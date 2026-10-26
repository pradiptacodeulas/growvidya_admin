export type RfidCardType = 'pvc_card' | 'keyfob' | 'wristband' | 'sticker' | string

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
