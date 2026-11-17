export interface RazorpayCredentials {
  id: number
  method: string
  key_id: string
  key_secret_masked: string | null
  has_key_secret: boolean
  webhook_secret_masked?: string | null
  has_webhook_secret?: boolean
  mode: "test" | "live"
  status: number
  created_on?: string
  created_at?: string
  updated_at?: string
}

export interface SaveRazorpayCredentialsPayload {
  key_id: string
  key_secret?: string
  webhook_secret?: string
  clear_webhook_secret?: boolean
  status?: number
}

export type EmailProviderType = "mailjet" | "smtp"
export type SmtpEncryptionType = "tls" | "ssl" | "none"
export type OtpModeType = "test" | "production"

export interface EmailCredential {
  id: number
  provider: EmailProviderType
  from_name: string
  from_email: string
  // Mailjet fields
  api_key: string | null
  api_secret?: string | null
  api_secret_masked: string | null
  has_api_secret: boolean
  // SMTP fields
  smtp_host: string | null
  smtp_port: number | null
  smtp_username: string | null
  smtp_password?: string | null
  smtp_password_masked: string | null
  has_smtp_password: boolean
  smtp_encryption: SmtpEncryptionType | null
  // Status, Default & OTP Mode
  is_default: 0 | 1
  otp_mode?: OtpModeType
  status: 1 | 2
  created_on?: string
  created_at?: string
  updated_at?: string
}

export interface SaveEmailCredentialPayload {
  provider: EmailProviderType
  from_name: string
  from_email: string
  api_key?: string
  api_secret?: string
  smtp_host?: string
  smtp_port?: number
  smtp_username?: string
  smtp_password?: string
  smtp_encryption?: SmtpEncryptionType
  is_default?: 0 | 1
  status?: 1 | 2
}

export interface CommunicationSettings {
  id?: number
  email_alerts_enabled: 0 | 1
  sms_alerts_enabled: 0 | 1
  notify_on_payment_success: 0 | 1
  notify_on_offline_decision: 0 | 1
  notify_on_expiry_reminder: 0 | 1
  sms_provider?: string | null
  sms_sender_id?: string | null
  updated_at?: string
}

export interface NotificationPricingItem {
  id?: number
  channel: "sms" | "push"
  pack_name: string
  unit_price: number | string
  min_qty: number
  description?: string | null
  status: 1 | 2
  updated_at?: string
}

export interface NotificationBuyerWallet {
  id: number
  school_id: number
  school_name: string
  school_code?: string | null
  school_email?: string | null
  school_phone?: string | null
  school_status: 1 | 2
  sms_balance: number
  push_balance: number
  total_sms_purchased: number
  total_push_purchased: number
  total_sms_used: number
  total_push_used: number
  total_amount_spent: number | string
  updated_at?: string
}

export interface NotificationBuyerCounts {
  total_schools: number
  total_sms_balance: number
  total_push_balance: number
  total_sms_purchased: number
  total_push_purchased: number
  total_sms_used: number
  total_push_used: number
  total_revenue: number
  pending_orders_count?: number
}

export interface PendingNotificationOrder {
  id: number
  order_no?: string | null
  school_id: number
  school_name: string
  school_code?: string | null
  school_email?: string | null
  school_phone?: string | null
  sms_qty?: number
  sms_units?: number
  sms_amount?: number | string
  push_qty?: number
  push_units?: number
  push_amount?: number | string
  notifications_amount: number | string
  grand_total?: number | string
  total_amount?: number | string
  payment_method: string
  utr_number?: string | null
  offline_transaction_ref?: string | null
  bank_account_id?: number | null
  company_bank_name?: string | null
  company_bank_title?: string | null
  company_bank_beneficiary?: string | null
  company_account_number?: string | null
  company_ifsc_code?: string | null
  offline_receipt_url?: string | null
  status: string
  created_at: string
}

export interface NotificationLedgerEntry {
  id: number
  school_id: number
  channel: "sms" | "push"
  entry_type: "credit" | "debit" | "adjustment"
  units: number
  balance_after: number
  unit_price: number | string
  total_amount: number | string
  payment_order_id?: number | null
  reference_note?: string | null
  created_at: string
}
