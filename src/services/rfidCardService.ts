import { API_BASE_URL, SERVER_BASE_URL } from "@/config/api"
import type {
  RfidCard,
  RfidCardFilterParams,
  CreateRfidCardPayload,
  UpdateRfidCardPayload,
} from "@/types/rfidCard"

function getAuthHeaders(token?: string | null, isJson = true): Record<string, string> {
  const headers: Record<string, string> = {}
  if (isJson) {
    headers["Content-Type"] = "application/json"
  }
  if (token) {
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token
    headers["Authorization"] = `Bearer ${cleanToken}`
  }
  return headers
}

async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`
    try {
      const errJson = await res.json()
      if (errJson.message) {
        errorMessage = errJson.message
      } else if (errJson.errors && Array.isArray(errJson.errors)) {
        errorMessage = errJson.errors.join(", ")
      }
    } catch {
      // Ignore JSON parse error
    }
    const error = new Error(errorMessage) as Error & { status?: number }
    error.status = res.status
    throw error
  }

  const json = await res.json()
  if (json.success === false) {
    throw new Error(json.message || fallbackMessage)
  }
  return json.data as T
}

/**
 * Fetch all RFID cards from API
 */
export async function fetchRfidCardsApi(
  token: string,
  params?: RfidCardFilterParams
): Promise<RfidCard[]> {
  const query = new URLSearchParams()
  if (params?.search && params.search.trim()) {
    query.set("search", params.search.trim())
  }
  if (params?.status !== undefined && params.status !== "" && params.status !== "all") {
    query.set("status", String(params.status))
  }
  if (params?.card_type && params.card_type !== "all") {
    query.set("card_type", params.card_type)
  }

  const queryString = query.toString() ? `?${query.toString()}` : ""

  try {
    const res = await fetch(`${API_BASE_URL}/rfid-cards${queryString}`, {
      method: "GET",
      headers: getAuthHeaders(token),
    })
    return await handleResponse<RfidCard[]>(res, "Failed to retrieve RFID cards.")
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404 || status === 403) {
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/rfid-cards${queryString}`, {
        method: "GET",
        headers: getAuthHeaders(token),
      })
      return await handleResponse<RfidCard[]>(fallbackRes, "Failed to retrieve RFID cards.")
    }
    throw err
  }
}

/**
 * Fetch a single RFID card by ID
 */
export async function fetchRfidCardByIdApi(
  token: string,
  id: number
): Promise<RfidCard> {
  try {
    const res = await fetch(`${API_BASE_URL}/rfid-cards/${id}`, {
      method: "GET",
      headers: getAuthHeaders(token),
    })
    return await handleResponse<RfidCard>(res, "Failed to retrieve RFID card details.")
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404 || status === 403) {
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/rfid-cards/${id}`, {
        method: "GET",
        headers: getAuthHeaders(token),
      })
      return await handleResponse<RfidCard>(fallbackRes, "Failed to retrieve RFID card details.")
    }
    throw err
  }
}

/**
 * Create a new RFID card
 */
export async function createRfidCardApi(
  token: string,
  payload: CreateRfidCardPayload
): Promise<RfidCard> {
  let body: BodyInit
  let isJson = true

  const fileToUpload = payload.card_image instanceof File ? payload.card_image : payload.rfid_image instanceof File ? payload.rfid_image : null

  if (fileToUpload) {
    isJson = false
    const formData = new FormData()
    formData.append("card_name", payload.card_name)
    formData.append("card_code", payload.card_code)
    if (payload.card_type) formData.append("card_type", payload.card_type)
    if (payload.frequency) formData.append("frequency", payload.frequency)
    if (payload.read_range) formData.append("read_range", payload.read_range)
    if (payload.unit_price !== undefined) formData.append("unit_price", String(payload.unit_price))
    if (payload.min_order_qty !== undefined) formData.append("min_order_qty", String(payload.min_order_qty))
    if (payload.description) formData.append("description", payload.description)
    if (payload.status !== undefined) formData.append("status", String(payload.status))
    formData.append("card_image", fileToUpload)
    body = formData
  } else {
    body = JSON.stringify(payload)
  }

  try {
    const res = await fetch(`${API_BASE_URL}/rfid-cards`, {
      method: "POST",
      headers: getAuthHeaders(token, isJson),
      body,
    })
    return await handleResponse<RfidCard>(res, "Failed to create RFID card.")
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404 || status === 403) {
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/rfid-cards`, {
        method: "POST",
        headers: getAuthHeaders(token, isJson),
        body,
      })
      return await handleResponse<RfidCard>(fallbackRes, "Failed to create RFID card.")
    }
    throw err
  }
}

/**
 * Update an existing RFID card
 */
export async function updateRfidCardApi(
  token: string,
  id: number,
  payload: UpdateRfidCardPayload
): Promise<RfidCard> {
  let body: BodyInit
  let isJson = true

  const fileToUpload = payload.card_image instanceof File ? payload.card_image : payload.rfid_image instanceof File ? payload.rfid_image : null

  if (fileToUpload) {
    isJson = false
    const formData = new FormData()
    if (payload.card_name) formData.append("card_name", payload.card_name)
    if (payload.card_code) formData.append("card_code", payload.card_code)
    if (payload.card_type) formData.append("card_type", payload.card_type)
    if (payload.frequency) formData.append("frequency", payload.frequency)
    if (payload.read_range) formData.append("read_range", payload.read_range)
    if (payload.unit_price !== undefined) formData.append("unit_price", String(payload.unit_price))
    if (payload.min_order_qty !== undefined) formData.append("min_order_qty", String(payload.min_order_qty))
    if (payload.description !== undefined) formData.append("description", payload.description)
    if (payload.status !== undefined) formData.append("status", String(payload.status))
    formData.append("card_image", fileToUpload)
    body = formData
  } else {
    body = JSON.stringify(payload)
  }

  try {
    const res = await fetch(`${API_BASE_URL}/rfid-cards/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(token, isJson),
      body,
    })
    return await handleResponse<RfidCard>(res, "Failed to update RFID card.")
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404 || status === 403) {
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/rfid-cards/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(token, isJson),
        body,
      })
      return await handleResponse<RfidCard>(fallbackRes, "Failed to update RFID card.")
    }
    throw err
  }
}

/**
 * Toggle RFID card status (Active/Inactive)
 */
export async function toggleRfidCardStatusApi(
  token: string,
  id: number,
  status: number
): Promise<{ message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/rfid-cards/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ status }),
    })
    return await handleResponse<{ message: string }>(res, "Failed to update RFID card status.")
  } catch (err: unknown) {
    const statusErr = (err as { status?: number })?.status
    if (statusErr === 404 || statusErr === 403) {
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/rfid-cards/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(token),
        body: JSON.stringify({ status }),
      })
      return await handleResponse<{ message: string }>(fallbackRes, "Failed to update RFID card status.")
    }
    throw err
  }
}

/**
 * Delete an RFID card
 */
export async function deleteRfidCardApi(
  token: string,
  id: number
): Promise<{ message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/rfid-cards/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(token),
    })
    return await handleResponse<{ message: string }>(res, "Failed to delete RFID card.")
  } catch (err: unknown) {
    const statusErr = (err as { status?: number })?.status
    if (statusErr === 404 || statusErr === 403) {
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/rfid-cards/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(token),
      })
      return await handleResponse<{ message: string }>(fallbackRes, "Failed to delete RFID card.")
    }
    throw err
  }
}
