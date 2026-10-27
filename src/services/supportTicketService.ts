import { API_BASE_URL } from "@/config/api"
import type {
  AssignableSaasAdmin,
  SupportTicket,
  SupportTicketQueryParams,
  SupportTicketsResponse,
} from "@/types/supportTicket"

export async function fetchSaasSupportTicketsApi(
  token: string,
  params?: SupportTicketQueryParams
): Promise<SupportTicketsResponse> {
  const query = new URLSearchParams()

  if (params?.page !== undefined) query.append("page", String(params.page))
  if (params?.limit !== undefined) query.append("limit", String(params.limit))
  if (params?.search && params.search.trim()) query.append("search", params.search.trim())
  if (params?.status && params.status !== "all") query.append("status", params.status)
  if (params?.priority && params.priority !== "all") query.append("priority", params.priority)
  if (params?.category && params.category !== "all") query.append("category", params.category)
  if (params?.assigned_to && params.assigned_to !== "all") {
    query.append("assigned_to", params.assigned_to)
  }
  if (params?.school_id && params.school_id !== "all") {
    query.append("school_id", String(params.school_id))
  }

  const queryString = query.toString() ? `?${query.toString()}` : ""
  const response = await fetch(`${API_BASE_URL}/support-tickets${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.success) {
    throw new Error(result.message || `Failed to fetch support tickets (${response.status})`)
  }

  const data = result.data || {}
  const tickets: SupportTicket[] = Array.isArray(data.tickets) ? data.tickets : []
  const pagination = result.pagination || {
    total: tickets.length,
    page: params?.page ?? 1,
    limit: params?.limit ?? 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  }

  return {
    tickets,
    counts: {
      total_tickets: Number(data.total_tickets || 0),
      open_tickets: Number(data.open_tickets || 0),
      in_progress_tickets: Number(data.in_progress_tickets || 0),
      urgent_high_open_tickets: Number(data.urgent_high_open_tickets || 0),
      resolved_tickets: Number(data.resolved_tickets || 0),
      closed_tickets: Number(data.closed_tickets || 0),
    },
    pagination,
  }
}

export async function fetchSaasSupportTicketByIdApi(
  token: string,
  id: number | string
): Promise<SupportTicket> {
  const response = await fetch(`${API_BASE_URL}/support-tickets/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message || `Failed to fetch support ticket #${id}`)
  }

  return result.data as SupportTicket
}

export async function replyToSaasSupportTicketApi(
  token: string,
  id: number | string,
  payload: FormData | { message: string; is_internal_note?: boolean; next_status?: string | null }
): Promise<SupportTicket> {
  const isFormData = payload instanceof FormData
  const response = await fetch(`${API_BASE_URL}/support-tickets/${id}/reply`, {
    method: "POST",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: isFormData ? payload : JSON.stringify(payload),
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message || "Failed to send support reply")
  }

  return result.data as SupportTicket
}

export async function updateSaasSupportTicketApi(
  token: string,
  id: number | string,
  payload: {
    status?: string
    priority?: string
    assigned_to_saas_admin_id?: number | string | null
  }
): Promise<SupportTicket> {
  const response = await fetch(`${API_BASE_URL}/support-tickets/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message || "Failed to update support ticket")
  }

  return result.data as SupportTicket
}

export async function fetchAssignableSaasAdminsApi(
  token: string
): Promise<AssignableSaasAdmin[]> {
  const response = await fetch(`${API_BASE_URL}/support-tickets/assignees`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch assignable admins")
  }

  return Array.isArray(result.data) ? result.data : []
}
