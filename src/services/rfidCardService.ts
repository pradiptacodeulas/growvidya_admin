import { API_BASE_URL, SERVER_BASE_URL } from "@/config/api"
import type {
  RfidCard,
  RfidCardFilterParams,
} from "@/types/rfidCard"

function getAuthHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
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
