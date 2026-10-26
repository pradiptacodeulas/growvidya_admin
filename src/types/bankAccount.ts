export interface BankAccount {
  id: number
  account_title: string
  beneficiary_name: string
  account_number: string
  bank_name: string
  branch_name?: string | null
  ifsc_code: string
  account_type: string
  upi_id?: string | null
  swift_code?: string | null
  instructions?: string | null
  qr_code_image?: string | null
  is_default: number | boolean
  status: number | boolean
  created_at?: string
  updated_at?: string
}

export interface CreateBankAccountPayload {
  account_title: string
  beneficiary_name: string
  account_number: string
  bank_name: string
  branch_name?: string | null
  ifsc_code: string
  account_type?: string
  upi_id?: string | null
  swift_code?: string | null
  instructions?: string | null
  qr_code_image?: string | null
  qr_code_file?: File | null
  is_default?: number | boolean
  status?: number | boolean
}

export type UpdateBankAccountPayload = Partial<CreateBankAccountPayload>

export interface BankAccountQueryParams {
  search?: string
  status?: "all" | "active" | "inactive" | number | string
}

export interface BankAccountsApiResponse {
  success: boolean
  message?: string
  data: BankAccount[]
}

export interface SingleBankAccountApiResponse {
  success: boolean
  message?: string
  data: BankAccount
}
