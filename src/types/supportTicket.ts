export type SupportTicketCategory =
  | "technical"
  | "billing"
  | "subscription"
  | "hardware_rfid"
  | "feature_request"
  | "other"

export type SupportTicketPriority = "low" | "medium" | "high" | "urgent"

export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed"

export interface SupportTicketMessage {
  id: number
  ticket_id: number
  sender_type: "school_admin" | "saas_admin"
  sender_id: number
  sender_name: string
  message: string
  attachment_url?: string | null
  attachment_name?: string | null
  is_internal_note?: number | boolean
  created_at: string
}

export interface SupportTicket {
  id: number
  ticket_number: string
  school_id: number
  branch_id?: number | null
  created_by_admin_id: number
  subject: string
  category: SupportTicketCategory
  priority: SupportTicketPriority
  status: SupportTicketStatus
  assigned_to_saas_admin_id?: number | null
  last_reply_at?: string | null
  last_reply_by?: "school" | "saas_admin" | null
  resolved_at?: string | null
  closed_at?: string | null
  created_at: string
  updated_at: string

  // Joined School & Subscription fields
  school_name: string
  school_code?: string | null
  school_email?: string | null
  school_phone?: string | null
  school_address?: string | null
  school_logo?: string | null
  branch_name?: string | null
  created_by_name?: string | null
  created_by_email?: string | null
  created_by_phone?: string | null
  assigned_admin_name?: string | null
  assigned_admin_email?: string | null
  subscription_id?: number | null
  plan_id?: number | null
  plan_name?: string | null
  plan_code?: string | null
  billing_cycle?: string | null
  subscription_status?: string | null
  subscription_end_date?: string | null
  message_count?: number

  // Included on single ticket fetch
  messages?: SupportTicketMessage[]
}

export interface SupportTicketCounts {
  total_tickets: number
  open_tickets: number
  in_progress_tickets: number
  urgent_high_open_tickets: number
  resolved_tickets: number
  closed_tickets: number
}

export interface SupportTicketsPagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface SupportTicketsResponse {
  tickets: SupportTicket[]
  counts: SupportTicketCounts
  pagination: SupportTicketsPagination
}

export interface SupportTicketQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  priority?: string
  category?: string
  assigned_to?: string
  school_id?: number | string
}

export interface AssignableSaasAdmin {
  id: number
  first_name: string
  last_name?: string | null
  full_name: string
  email: string
  role: string
  role_name: string
}
