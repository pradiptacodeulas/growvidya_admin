import { API_BASE_URL } from "@/config/api"
import type {
  RazorpayCredentials,
  SaveRazorpayCredentialsPayload,
  EmailCredential,
  SaveEmailCredentialPayload,
  CommunicationSettings,
  NotificationPricingItem,
} from "@/types/settings"

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
  status: 0 | 1
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
    "/settings/notification-pricing",
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
