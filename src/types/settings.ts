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

export interface EmailCredential {
  id: number
  provider: EmailProviderType
  from_name: string
  from_email: string
  // Mailjet fields
  api_key: string | null
  api_secret_masked: string | null
  has_api_secret: boolean
  // SMTP fields
  smtp_host: string | null
  smtp_port: number | null
  smtp_username: string | null
  smtp_password_masked: string | null
  has_smtp_password: boolean
  smtp_encryption: SmtpEncryptionType | null
  // Status & Default
  is_default: 0 | 1
  status: 0 | 1
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
  status?: 0 | 1
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
  status: 0 | 1
  updated_at?: string
}
