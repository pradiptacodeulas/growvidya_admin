import { API_BASE_URL } from "@/config/api"
import type {
  BankAccount,
  BankAccountQueryParams,
  CreateBankAccountPayload,
  UpdateBankAccountPayload,
} from "@/types/bankAccount"

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

  // 1. Try standard saas-admin endpoint
  let response = await fetch(`${API_BASE_URL}${endpointPath}`, {
    ...options,
    headers,
  })

  // 2. If 404, fallback to /api/v1/bank-accounts
  if (response.status === 404) {
    const rootBaseUrl = API_BASE_URL.replace(/\/saas-admin\/?$/, "")
    response = await fetch(`${rootBaseUrl}${endpointPath}`, {
      ...options,
      headers,
    })
  }

  return response
}

async function handleResponse<T>(response: Response, defaultErrorMessage: string): Promise<T> {
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

export async function fetchBankAccountsApi(
  token: string,
  params?: BankAccountQueryParams
): Promise<BankAccount[]> {
  const query = new URLSearchParams()
  if (params?.search && params.search.trim() !== "") {
    query.append("search", params.search.trim())
  }
  if (params?.status !== undefined && params.status !== "all" && params.status !== "") {
    const statusVal =
      params.status === "active" ? "1" : params.status === "inactive" ? "0" : String(params.status)
    query.append("status", statusVal)
  }

  const queryString = query.toString() ? `?${query.toString()}` : ""
  const response = await makeRequest(`/bank-accounts${queryString}`, { method: "GET" }, token)
  const data = await handleResponse<BankAccount[]>(response, "Failed to fetch bank accounts")
  return Array.isArray(data) ? data : []
}

export async function fetchBankAccountByIdApi(
  token: string,
  id: number | string
): Promise<BankAccount> {
  const response = await makeRequest(`/bank-accounts/${id}`, { method: "GET" }, token)
  return handleResponse<BankAccount>(response, "Bank account not found.")
}

function buildRequestBody(payload: CreateBankAccountPayload | UpdateBankAccountPayload): BodyInit {
  if (payload.qr_code_file instanceof File) {
    const fd = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (key === "qr_code_file") {
        fd.append("qr_code_image", value as File)
      } else if (value !== undefined && value !== null) {
        if (typeof value === "boolean") {
          fd.append(key, value ? "1" : "0")
        } else {
          fd.append(key, String(value))
        }
      }
    })
    return fd
  }

  const cleanPayload = { ...payload }
  delete cleanPayload.qr_code_file
  return JSON.stringify(cleanPayload)
}

export async function createBankAccountApi(
  token: string,
  payload: CreateBankAccountPayload
): Promise<BankAccount> {
  const body = buildRequestBody(payload)
  const response = await makeRequest(
    "/bank-accounts",
    {
      method: "POST",
      body,
    },
    token
  )
  return handleResponse<BankAccount>(response, "Failed to create bank account.")
}

export async function updateBankAccountApi(
  token: string,
  id: number | string,
  payload: UpdateBankAccountPayload
): Promise<BankAccount> {
  const body = buildRequestBody(payload)
  const response = await makeRequest(
    `/bank-accounts/${id}`,
    {
      method: "PUT",
      body,
    },
    token
  )
  return handleResponse<BankAccount>(response, "Failed to update bank account.")
}

export async function deleteBankAccountApi(
  token: string,
  id: number | string
): Promise<boolean> {
  const response = await makeRequest(
    `/bank-accounts/${id}`,
    {
      method: "DELETE",
    },
    token
  )
  if (!response.ok) {
    let errorMessage = "Failed to delete bank account."
    try {
      const errorJson = await response.json()
      if (errorJson.message) errorMessage = errorJson.message
    } catch {
      // Ignore
    }
    throw new Error(errorMessage)
  }
  return true
}

export async function toggleBankAccountStatusApi(
  token: string,
  id: number | string,
  status?: number | boolean
): Promise<BankAccount> {
  const body = status !== undefined ? JSON.stringify({ status: status ? 1 : 0 }) : "{}"
  const response = await makeRequest(
    `/bank-accounts/${id}/status`,
    {
      method: "PATCH",
      body,
    },
    token
  )
  return handleResponse<BankAccount>(response, "Failed to update bank account status.")
}

export async function setDefaultBankAccountApi(
  token: string,
  id: number | string
): Promise<BankAccount> {
  const response = await makeRequest(
    `/bank-accounts/${id}/default`,
    {
      method: "PATCH",
    },
    token
  )
  return handleResponse<BankAccount>(response, "Failed to set bank account as default.")
}
