import { API_BASE_URL, SERVER_BASE_URL } from "@/config/api"
import type {
  AttendanceMachine,
  AttendanceMachineFilterParams,
  CreateAttendanceMachinePayload,
  UpdateAttendanceMachinePayload,
} from "@/types/attendanceMachine"

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
 * Fetch a single attendance machine by ID
 */
export async function fetchAttendanceMachineByIdApi(
  token: string,
  id: number
): Promise<AttendanceMachine> {
  try {
    const res = await fetch(`${API_BASE_URL}/attendance-machines/${id}`, {
      method: "GET",
      headers: getAuthHeaders(token),
    })
    return await handleResponse<AttendanceMachine>(res, "Failed to retrieve attendance machine.")
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404 || status === 403) {
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/attendance-machines/${id}`, {
        method: "GET",
        headers: getAuthHeaders(token),
      })
      return await handleResponse<AttendanceMachine>(fallbackRes, "Failed to retrieve attendance machine.")
    }
    throw err
  }
}

/**
 * Create a new attendance machine
 */
export async function createAttendanceMachineApi(
  token: string,
  payload: CreateAttendanceMachinePayload
): Promise<AttendanceMachine> {
  let body: BodyInit
  let isJson = true

  if (payload.machine_image instanceof File) {
    isJson = false
    const formData = new FormData()
    formData.append("machine_name", payload.machine_name)
    formData.append("model_number", payload.model_number)
    formData.append("brand", payload.brand)
    if (payload.machine_type) formData.append("machine_type", payload.machine_type)
    if (payload.connectivity) formData.append("connectivity", payload.connectivity)
    if (payload.user_capacity !== undefined) formData.append("user_capacity", String(payload.user_capacity))
    if (payload.log_capacity !== undefined) formData.append("log_capacity", String(payload.log_capacity))
    if (payload.push_protocol) formData.append("push_protocol", payload.push_protocol)
    if (payload.unit_price !== undefined) formData.append("unit_price", String(payload.unit_price))
    if (payload.amc_price !== undefined) formData.append("amc_price", String(payload.amc_price))
    if (payload.specifications) formData.append("specifications", payload.specifications)
    if (payload.status !== undefined) formData.append("status", String(payload.status))
    formData.append("machine_image", payload.machine_image)
    body = formData
  } else {
    body = JSON.stringify(payload)
  }

  try {
    const res = await fetch(`${API_BASE_URL}/attendance-machines`, {
      method: "POST",
      headers: getAuthHeaders(token, isJson),
      body,
    })
    return await handleResponse<AttendanceMachine>(res, "Failed to create attendance machine.")
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404 || status === 403) {
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/attendance-machines`, {
        method: "POST",
        headers: getAuthHeaders(token, isJson),
        body,
      })
      return await handleResponse<AttendanceMachine>(fallbackRes, "Failed to create attendance machine.")
    }
    throw err
  }
}

/**
 * Update an existing attendance machine
 */
export async function updateAttendanceMachineApi(
  token: string,
  id: number,
  payload: UpdateAttendanceMachinePayload
): Promise<AttendanceMachine> {
  let body: BodyInit
  let isJson = true

  if (payload.machine_image instanceof File) {
    isJson = false
    const formData = new FormData()
    if (payload.machine_name) formData.append("machine_name", payload.machine_name)
    if (payload.model_number) formData.append("model_number", payload.model_number)
    if (payload.brand) formData.append("brand", payload.brand)
    if (payload.machine_type) formData.append("machine_type", payload.machine_type)
    if (payload.connectivity) formData.append("connectivity", payload.connectivity)
    if (payload.user_capacity !== undefined) formData.append("user_capacity", String(payload.user_capacity))
    if (payload.log_capacity !== undefined) formData.append("log_capacity", String(payload.log_capacity))
    if (payload.push_protocol) formData.append("push_protocol", payload.push_protocol)
    if (payload.unit_price !== undefined) formData.append("unit_price", String(payload.unit_price))
    if (payload.amc_price !== undefined) formData.append("amc_price", String(payload.amc_price))
    if (payload.specifications !== undefined) formData.append("specifications", payload.specifications)
    if (payload.status !== undefined) formData.append("status", String(payload.status))
    formData.append("machine_image", payload.machine_image)
    body = formData
  } else {
    body = JSON.stringify(payload)
  }

  try {
    const res = await fetch(`${API_BASE_URL}/attendance-machines/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(token, isJson),
      body,
    })
    return await handleResponse<AttendanceMachine>(res, "Failed to update attendance machine.")
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404 || status === 403) {
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/attendance-machines/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(token, isJson),
        body,
      })
      return await handleResponse<AttendanceMachine>(fallbackRes, "Failed to update attendance machine.")
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
