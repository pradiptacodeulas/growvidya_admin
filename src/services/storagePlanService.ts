import { API_BASE_URL, SERVER_BASE_URL } from "@/config/api"
import type {
  StoragePlan,
  CapacityUnit,
  StoragePlanFilterParams,
  CreateStoragePlanPayload,
  UpdateStoragePlanPayload,
  StoragePlanListResult,
  StoragePlanBuyerCounts,
  StoragePlanBuyerListResult,
  StoragePlanBuyerOrder,
  UpdateStoragePlanBuyerPayload,
} from "@/types/storagePlan"
import {
  EMPTY_COUNTS,
  EMPTY_PAGINATION,
  type PaginationParams,
} from "@/types/pagination"

const EMPTY_BUYER_COUNTS: StoragePlanBuyerCounts = {
  total_orders: 0,
  total_quantity: 0,
  total_revenue: 0,
  pending_count: 0,
  active_count: 0,
  expired_count: 0,
  cancelled_count: 0,
}

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

export async function fetchStoragePlansApi(
  token: string,
  params?: StoragePlanFilterParams & PaginationParams
): Promise<StoragePlanListResult> {
  const query = new URLSearchParams()
  if (params?.search && params.search.trim()) {
    query.set("search", params.search.trim())
  }
  if (params?.status !== undefined && params.status !== "" && params.status !== "all") {
    query.set("status", String(params.status))
  }

  if (params?.page && params.page > 0) {
    query.set("page", String(params.page))
  }
  if (params?.limit && params.limit > 0) {
    query.set("limit", String(params.limit))
  }

  const queryString = query.toString() ? `?${query.toString()}` : ""

  const normalize = (data: Partial<StoragePlanListResult> | null): StoragePlanListResult => ({
    plans: Array.isArray(data?.plans) ? data.plans : [],
    pagination: data?.pagination ?? EMPTY_PAGINATION,
    counts: data?.counts ?? EMPTY_COUNTS,
  })

  try {
    const res = await fetch(`${API_BASE_URL}/storage-plans${queryString}`, {
      method: "GET",
      headers: getAuthHeaders(token),
    })
    return normalize(
      await handleResponse<StoragePlanListResult>(res, "Failed to retrieve storage plans.")
    )
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404 || status === 403) {
      const fallbackRes = await fetch(`${SERVER_BASE_URL}/api/v1/storage-plans${queryString}`, {
        method: "GET",
        headers: getAuthHeaders(token),
      })
      return normalize(
        await handleResponse<StoragePlanListResult>(fallbackRes, "Failed to retrieve storage plans.")
      )
    }
    throw err
  }
}

export async function fetchStoragePlanBuyersApi(
  token: string,
  params?: { search?: string; status?: string; storage_plan_id?: number | string } & PaginationParams
): Promise<StoragePlanBuyerListResult> {
  const query = new URLSearchParams()
  if (params?.search && params.search.trim()) {
    query.set("search", params.search.trim())
  }
  if (params?.status && params.status !== "all") {
    query.set("status", params.status)
  }
  if (params?.storage_plan_id && params.storage_plan_id !== "all") {
    query.set("storage_plan_id", String(params.storage_plan_id))
  }
  if (params?.page !== undefined) {
    query.set("page", String(params.page))
  }
  if (params?.limit !== undefined) {
    query.set("limit", String(params.limit))
  }

  const queryString = query.toString() ? `?${query.toString()}` : ""
  const res = await fetch(`${API_BASE_URL}/storage-plans/buyers${queryString}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  })
  const data = await handleResponse<StoragePlanBuyerListResult>(
    res,
    "Failed to retrieve storage plan buyers."
  )
  return {
    buyers: Array.isArray(data?.buyers) ? data.buyers : [],
    pagination: data?.pagination ?? EMPTY_PAGINATION,
    counts: data?.counts ?? EMPTY_BUYER_COUNTS,
  }
}

export async function updateStoragePlanBuyerOrderApi(
  token: string,
  id: number,
  payload: UpdateStoragePlanBuyerPayload
): Promise<StoragePlanBuyerOrder> {
  const res = await fetch(`${API_BASE_URL}/storage-plans/buyers/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  })
  return await handleResponse<StoragePlanBuyerOrder>(
    res,
    "Failed to update storage plan order."
  )
}

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
