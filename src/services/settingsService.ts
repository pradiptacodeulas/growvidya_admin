import { API_BASE_URL } from "@/config/api"
import type {
  RazorpayCredentials,
  SaveRazorpayCredentialsPayload,
  EmailCredential,
  SaveEmailCredentialPayload,
  CommunicationSettings,
  NotificationPricingItem,
  NotificationBuyerWallet,
  NotificationBuyerCounts,
  NotificationLedgerEntry,
  PendingNotificationOrder,
} from "@/types/settings"
import type { PaginationMeta } from "@/types/pagination"

async function makeRequest(
  endpointPath: string,
  options: RequestInit,
  token?: string
): Promise<Response> {
  const headers = new Headers(options.headers || {})
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(`${API_BASE_URL}${endpointPath}`, {
    ...options,
    headers,
  })
}

async function handleResponse<T>(
  response: Response,
  defaultErrorMessage: string
): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`
    try {
      const errorJson = await response.json()
      if (errorJson.message) {
        errorMessage = errorJson.message
      }
    } catch {
      // Ignore JSON parse error
    }
    const error = new Error(errorMessage) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  const result = await response.json()
  if (!result.success) {
    throw new Error(result.message || defaultErrorMessage)
  }
  return result.data as T
}

// ==========================================
// 1. RAZORPAY CREDENTIALS API
// ==========================================

export async function fetchRazorpayCredentialsApi(
  token: string
): Promise<RazorpayCredentials | null> {
  const response = await makeRequest(
    "/settings/razorpay",
    { method: "GET" },
    token
  )
  return handleResponse<RazorpayCredentials | null>(
    response,
    "Failed to fetch Razorpay credentials"
  )
}

export async function saveRazorpayCredentialsApi(
  token: string,
  payload: SaveRazorpayCredentialsPayload
): Promise<RazorpayCredentials> {
  const response = await makeRequest(
    "/settings/razorpay",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token
  )
  return handleResponse<RazorpayCredentials>(
    response,
    "Failed to save Razorpay credentials"
  )
}

export async function updateRazorpayCredentialsApi(
  token: string,
  id: number | string | null,
  payload: SaveRazorpayCredentialsPayload
): Promise<RazorpayCredentials> {
  const endpoint = id ? `/settings/razorpay/${id}` : "/settings/razorpay"
  const response = await makeRequest(
    endpoint,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token
  )
  return handleResponse<RazorpayCredentials>(
    response,
    "Failed to update Razorpay credentials"
  )
}

export async function deleteRazorpayCredentialsApi(
  token: string,
  id?: number | string | null
): Promise<void> {
  const endpoint = id ? `/settings/razorpay/${id}` : "/settings/razorpay"
  const response = await makeRequest(
    endpoint,
    { method: "DELETE" },
    token
  )
  await handleResponse<null>(
    response,
    "Failed to delete Razorpay credentials"
  )
}

// ==========================================
// 2. EMAIL CREDENTIALS (MAILJET & SMTP) API
// ==========================================

export async function fetchEmailCredentialsApi(
  token: string
): Promise<EmailCredential[]> {
  const response = await makeRequest(
    "/settings/email",
    { method: "GET" },
    token
  )
  return handleResponse<EmailCredential[]>(
    response,
    "Failed to fetch email settings"
  )
}

export async function saveEmailCredentialsApi(
  token: string,
  payload: SaveEmailCredentialPayload
): Promise<EmailCredential> {
  const response = await makeRequest(
    "/settings/email",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token
  )
  return handleResponse<EmailCredential>(
    response,
    "Failed to save email credentials"
  )
}

export async function updateEmailCredentialsApi(
  token: string,
  id: number | string,
  payload: SaveEmailCredentialPayload
): Promise<EmailCredential> {
  const response = await makeRequest(
    `/settings/email/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token
  )
  return handleResponse<EmailCredential>(
    response,
    "Failed to update email credentials"
  )
}

export async function setDefaultEmailProviderApi(
  token: string,
  id: number | string
): Promise<EmailCredential> {
  const response = await makeRequest(
    `/settings/email/${id}/default`,
    { method: "PATCH" },
    token
  )
  return handleResponse<EmailCredential>(
    response,
    "Failed to set default email provider"
  )
}

export async function toggleEmailCredentialStatusApi(
  token: string,
  id: number | string,
  status: 1 | 2
): Promise<EmailCredential> {
  const response = await makeRequest(
    `/settings/email/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    token
  )
  return handleResponse<EmailCredential>(
    response,
    "Failed to update email provider status"
  )
}

export async function deleteEmailCredentialsApi(
  token: string,
  id: number | string
): Promise<void> {
  const response = await makeRequest(
    `/settings/email/${id}`,
    { method: "DELETE" },
    token
  )
  await handleResponse<null>(
    response,
    "Failed to delete email credentials"
  )
}

export async function sendTestEmailApi(
  token: string,
  payload: { to_email: string; credential_id?: number }
): Promise<{ provider: string }> {
  const response = await makeRequest(
    "/settings/email/test",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token
  )
  return handleResponse<{ provider: string }>(
    response,
    "Failed to send test email"
  )
}

export async function updateEmailOtpModeApi(
  token: string,
  otp_mode: "test" | "production"
): Promise<{ otp_mode: "test" | "production" }> {
  const response = await makeRequest(
    "/settings/email/otp-mode",
    {
      method: "PATCH",
      body: JSON.stringify({ otp_mode }),
    },
    token
  )
  return handleResponse<{ otp_mode: "test" | "production" }>(
    response,
    "Failed to update OTP mode"
  )
}

// ==========================================
// 3. OPTIONAL SUBSCRIPTION COMMUNICATION TOGGLES & NOTIFICATION CREDIT PRICING
// ==========================================

export async function fetchCommunicationSettingsApi(
  token: string
): Promise<CommunicationSettings> {
  const response = await makeRequest(
    "/settings/communication",
    { method: "GET" },
    token
  )
  return handleResponse<CommunicationSettings>(
    response,
    "Failed to fetch communication alert settings"
  )
}

export async function updateCommunicationSettingsApi(
  token: string,
  payload: Partial<CommunicationSettings>
): Promise<CommunicationSettings> {
  const response = await makeRequest(
    "/settings/communication",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token
  )
  return handleResponse<CommunicationSettings>(
    response,
    "Failed to update communication alert settings"
  )
}

export async function fetchNotificationPricingApi(
  token: string
): Promise<NotificationPricingItem[]> {
  const response = await makeRequest(
    "/settings/notification-pricing",
    { method: "GET" },
    token
  )
  return handleResponse<NotificationPricingItem[]>(
    response,
    "Failed to fetch notification credit pricing"
  )
}

export async function updateNotificationPricingApi(
  token: string,
  items: NotificationPricingItem[]
): Promise<NotificationPricingItem[]> {
  const response = await makeRequest(
    "/notifications/pricing",
    {
      method: "PUT",
      body: JSON.stringify({ items }),
    },
    token
  )
  return handleResponse<NotificationPricingItem[]>(
    response,
    "Failed to update notification credit pricing"
  )
}

export async function fetchNotificationBuyersApi(
  token: string,
  params?: { search?: string; page?: number; limit?: number }
): Promise<{
  buyers: NotificationBuyerWallet[]
  pending_orders?: PendingNotificationOrder[]
  counts: NotificationBuyerCounts
  pagination: PaginationMeta
}> {
  const query = new URLSearchParams()
  if (params?.search) query.set("search", params.search)
  if (params?.page) query.set("page", String(params.page))
  if (params?.limit) query.set("limit", String(params.limit))
  const qs = query.toString() ? `?${query.toString()}` : ""
  const response = await makeRequest(
    `/notifications/buyers${qs}`,
    { method: "GET" },
    token
  )
  const data = await handleResponse<{
    buyers: NotificationBuyerWallet[]
    pending_orders?: PendingNotificationOrder[]
    counts: NotificationBuyerCounts
    pagination: Partial<PaginationMeta> & {
      total_items?: number
      total_pages?: number
      current_page?: number
      per_page?: number
      has_next_page?: boolean
      has_prev_page?: boolean
    }
  }>(response, "Failed to fetch notification credit buyers")

  const rawPag = data?.pagination || {}
  const page = Number(rawPag.page ?? rawPag.current_page ?? params?.page ?? 1) || 1
  const limit = Number(rawPag.limit ?? rawPag.per_page ?? params?.limit ?? 10) || 10
  const total = Number(rawPag.total ?? rawPag.total_items ?? 0) || 0
  const totalPages = Math.max(
    1,
    Number(rawPag.totalPages ?? rawPag.total_pages ?? Math.ceil(total / limit)) || 1
  )

  return {
    buyers: Array.isArray(data?.buyers) ? data.buyers : [],
    pending_orders: data?.pending_orders,
    counts: data?.counts,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: Boolean(rawPag.hasNextPage ?? rawPag.has_next_page ?? page < totalPages),
      hasPrevPage: Boolean(rawPag.hasPrevPage ?? rawPag.has_prev_page ?? page > 1),
    },
  }
}

export async function approveNotificationOrderApi(
  token: string,
  orderId: number | string,
  adminNote?: string
): Promise<unknown> {
  const response = await makeRequest(
    `/notifications/orders/${orderId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ admin_note: adminNote || "Approved by SaaS Admin" }),
    },
    token
  )
  return handleResponse<unknown>(
    response,
    "Failed to approve offline notification credit order"
  )
}

export async function rejectNotificationOrderApi(
  token: string,
  orderId: number | string,
  reason: string
): Promise<unknown> {
  const response = await makeRequest(
    `/notifications/orders/${orderId}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
    token
  )
  return handleResponse<unknown>(
    response,
    "Failed to reject offline notification credit order"
  )
}

export async function fetchNotificationBuyerLedgerApi(
  token: string,
  schoolId: number | string
): Promise<NotificationLedgerEntry[]> {
  const response = await makeRequest(
    `/notifications/buyers/${schoolId}/ledger`,
    { method: "GET" },
    token
  )
  return handleResponse<NotificationLedgerEntry[]>(
    response,
    "Failed to fetch notification wallet ledger"
  )
}
