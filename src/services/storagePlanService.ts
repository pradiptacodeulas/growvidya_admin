import { API_BASE_URL, SERVER_BASE_URL } from "@/config/api"
import type {
  StoragePlan,
  CapacityUnit,
  StoragePlanFilterParams,
  CreateStoragePlanPayload,
  UpdateStoragePlanPayload,
} from "@/types/storagePlan"

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
 * Fetch all storage plans with optional search & status filter
 */
export async function fetchStoragePlansApi(
  token: string,
  params?: StoragePlanFilterParams
): Promise<StoragePlan[]> {
  const query = new URLSearchParams()
  if (params?.search && params.search.trim()) {
    query.set("search", params.search.trim())
  }
  if (params?.status !== undefined && params.status !== "" && params.status !== "all") {
    query.set("status", String(params.status))
  }

  const queryString = query.toString() ? `?${query.toString()}` : ""

  try {
    const res = await fetch(`${API_BASE_URL}/storage-plans${queryString}`, {
      method: "GET",
      headers: getAuthHeaders(token),
    })
    return await handleResponse<StoragePlan[]>(res, "Failed to retrieve storage plans.")
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404 || status === 403) {
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/v1/storage-plans${queryString}`, {
        method: "GET",
        headers: getAuthHeaders(token),
      })
      return await handleResponse<StoragePlan[]>(fallbackRes, "Failed to retrieve storage plans.")
    }
    throw err
  }
}

/**
 * Fetch active capacity units (MB, GB, TB)
 */
export async function fetchCapacityUnitsApi(token: string): Promise<CapacityUnit[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/storage-plans/units`, {
      method: "GET",
      headers: getAuthHeaders(token),
    })
    return await handleResponse<CapacityUnit[]>(res, "Failed to retrieve capacity units.")
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404 || status === 403) {
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/v1/storage-plans/units`, {
        method: "GET",
        headers: getAuthHeaders(token),
      })
      return await handleResponse<CapacityUnit[]>(fallbackRes, "Failed to retrieve capacity units.")
    }
    throw err
  }
}

/**
 * Fetch single storage plan by ID
 */
export async function fetchStoragePlanByIdApi(
  token: string,
  id: number
): Promise<StoragePlan> {
  try {
    const res = await fetch(`${API_BASE_URL}/storage-plans/${id}`, {
      method: "GET",
      headers: getAuthHeaders(token),
    })
    return await handleResponse<StoragePlan>(res, "Failed to retrieve storage plan details.")
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404 || status === 403) {
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/v1/storage-plans/${id}`, {
        method: "GET",
        headers: getAuthHeaders(token),
      })
      return await handleResponse<StoragePlan>(fallbackRes, "Failed to retrieve storage plan details.")
    }
    throw err
  }
}

/**
 * Create a new storage plan
 */
export async function createStoragePlanApi(
  token: string,
  payload: CreateStoragePlanPayload
): Promise<StoragePlan> {
  const res = await fetch(`${API_BASE_URL}/storage-plans`, {
    method: "POST",
    headers: getAuthHeaders(token, true),
    body: JSON.stringify(payload),
  })
  return await handleResponse<StoragePlan>(res, "Failed to create storage plan.")
}

/**
 * Update an existing storage plan
 */
export async function updateStoragePlanApi(
  token: string,
  id: number,
  payload: UpdateStoragePlanPayload
): Promise<StoragePlan> {
  const res = await fetch(`${API_BASE_URL}/storage-plans/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(token, true),
    body: JSON.stringify(payload),
  })
  return await handleResponse<StoragePlan>(res, "Failed to update storage plan.")
}

/**
 * Delete a storage plan
 */
export async function deleteStoragePlanApi(
  token: string,
  id: number
): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/storage-plans/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token, true),
  })
  await handleResponse<{ message?: string }>(res, "Failed to delete storage plan.")
  return true
}

/**
 * Toggle storage plan active/inactive status
 */
export async function toggleStoragePlanStatusApi(
  token: string,
  id: number,
  status: number
): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/storage-plans/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(token, true),
    body: JSON.stringify({ status }),
  })
  await handleResponse<{ message?: string }>(res, "Failed to update storage plan status.")
  return true
}
