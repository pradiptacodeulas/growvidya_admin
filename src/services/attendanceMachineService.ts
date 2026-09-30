import { API_BASE_URL, SERVER_BASE_URL } from "@/config/api"
import type {
  AttendanceMachine,
  AttendanceMachineFilterParams,
} from "@/types/attendanceMachine"

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
 * Fetch all attendance machines from API
 */
export async function fetchAttendanceMachinesApi(
  token: string,
  params?: AttendanceMachineFilterParams
): Promise<AttendanceMachine[]> {
  const query = new URLSearchParams()
  if (params?.search && params.search.trim()) {
    query.set("search", params.search.trim())
  }
  if (params?.status !== undefined && params.status !== "" && params.status !== "all") {
    query.set("status", String(params.status))
  }
  if (params?.machine_type && params.machine_type !== "all") {
    query.set("machine_type", params.machine_type)
  }
  if (params?.brand && params.brand !== "all") {
    query.set("brand", params.brand)
  }

  const queryString = query.toString() ? `?${query.toString()}` : ""

  try {
    const res = await fetch(`${API_BASE_URL}/attendance-machines${queryString}`, {
      method: "GET",
      headers: getAuthHeaders(token),
    })
    return await handleResponse<AttendanceMachine[]>(res, "Failed to retrieve attendance machines.")
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404 || status === 403) {
      // Fallback to /api/attendance-machines if saas-admin sub-route has different prefix
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/attendance-machines${queryString}`, {
        method: "GET",
        headers: getAuthHeaders(token),
      })
      return await handleResponse<AttendanceMachine[]>(fallbackRes, "Failed to retrieve attendance machines.")
    }
    throw err
  }
}

/**
 * Toggle attendance machine status (Active/Inactive)
 */
export async function toggleAttendanceMachineStatusApi(
  token: string,
  id: number,
  status: number
): Promise<{ message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/attendance-machines/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ status }),
    })
    return await handleResponse<{ message: string }>(res, "Failed to update machine status.")
  } catch (err: unknown) {
    const statusErr = (err as { status?: number })?.status
    if (statusErr === 404 || statusErr === 403) {
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/attendance-machines/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(token),
        body: JSON.stringify({ status }),
      })
      return await handleResponse<{ message: string }>(fallbackRes, "Failed to update machine status.")
    }
    throw err
  }
}

/**
 * Delete an attendance machine
 */
export async function deleteAttendanceMachineApi(
  token: string,
  id: number
): Promise<{ message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/attendance-machines/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(token),
    })
    return await handleResponse<{ message: string }>(res, "Failed to delete machine.")
  } catch (err: unknown) {
    const statusErr = (err as { status?: number })?.status
    if (statusErr === 404 || statusErr === 403) {
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/attendance-machines/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(token),
      })
      return await handleResponse<{ message: string }>(fallbackRes, "Failed to delete machine.")
    }
    throw err
  }
}
