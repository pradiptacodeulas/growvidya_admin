import { API_BASE_URL, SERVER_BASE_URL } from "@/config/api"
import type {
  SubscriptionPackage,
  SubscriptionItem,
  CreatePackagePayload,
  UpdatePackagePayload,
  CreateItemPayload,
} from "@/types/subscription"

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
 * List all packages with optional search and filters
 */
export async function fetchPackagesApi(
  token: string,
  params?: { search?: string; status?: number | string; billing_cycle?: string }
): Promise<SubscriptionPackage[]> {
  const query = new URLSearchParams()
  if (params?.search && params.search.trim()) {
    query.set("search", params.search.trim())
  }
  if (params?.status !== undefined && params.status !== "" && params.status !== "all") {
    query.set("status", String(params.status))
  }
  if (params?.billing_cycle && params.billing_cycle !== "all") {
    query.set("billing_cycle", params.billing_cycle)
  }

  const queryString = query.toString() ? `?${query.toString()}` : ""
  const response = await fetch(`${API_BASE_URL}/packages${queryString}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  })

  return handleResponse<SubscriptionPackage[]>(response, "Failed to retrieve subscription packages.")
}

/**
 * Get details of a single package with all items
 */
export async function fetchPackageByIdApi(
  token: string,
  id: number
): Promise<SubscriptionPackage> {
  const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  })

  return handleResponse<SubscriptionPackage>(response, "Failed to retrieve package details.")
}

/**
 * Create a new package with nested items
 */
export async function createPackageApi(
  token: string,
  payload: CreatePackagePayload
): Promise<SubscriptionPackage> {
  const response = await fetch(`${API_BASE_URL}/packages`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  })

  return handleResponse<SubscriptionPackage>(response, "Failed to create subscription package.")
}

/**
 * Update package and synchronize items
 */
export async function updatePackageApi(
  token: string,
  id: number,
  payload: UpdatePackagePayload
): Promise<SubscriptionPackage> {
  const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  })

  return handleResponse<SubscriptionPackage>(response, "Failed to update subscription package.")
}

/**
 * Delete package (cascade deletes its items)
 */
export async function deletePackageApi(
  token: string,
  id: number
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  })

  if (!response.ok) {
    let errorMessage = `Failed to delete package (status ${response.status})`
    try {
      const errJson = await response.json()
      if (errJson.message) errorMessage = errJson.message
    } catch {
      // Ignore
    }
    throw new Error(errorMessage)
  }

  const json = await response.json()
  return { success: true, message: json.message || "Package deleted successfully." }
}

/**
 * Toggle package status (1 = Active, 0 = Inactive)
 */
export async function togglePackageStatusApi(
  token: string,
  id: number,
  status: 0 | 1
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/packages/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    let errorMessage = `Failed to toggle package status (status ${response.status})`
    try {
      const errJson = await response.json()
      if (errJson.message) errorMessage = errJson.message
    } catch {
      // Ignore
    }
    throw new Error(errorMessage)
  }

  const json = await response.json()
  return { success: true, message: json.message || "Status updated successfully." }
}

/**
 * Get items of a specific package
 */
export async function fetchPackageItemsApi(
  token: string,
  packageId: number
): Promise<SubscriptionItem[]> {
  const response = await fetch(`${API_BASE_URL}/packages/${packageId}/items`, {
    method: "GET",
    headers: getAuthHeaders(token),
  })

  return handleResponse<SubscriptionItem[]>(response, "Failed to fetch package items.")
}

/**
 * Add an individual child item to a package
 */
export async function addItemToPackageApi(
  token: string,
  packageId: number,
  item: CreateItemPayload
): Promise<SubscriptionItem> {
  const response = await fetch(`${API_BASE_URL}/packages/${packageId}/items`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(item),
  })

  return handleResponse<SubscriptionItem>(response, "Failed to add item to package.")
}

/**
 * Update an existing child item
 */
export async function updateItemApi(
  token: string,
  itemId: number,
  item: Partial<CreateItemPayload>
): Promise<SubscriptionItem> {
  const response = await fetch(`${API_BASE_URL}/packages/items/${itemId}`, {
    method: "PUT",
    headers: getAuthHeaders(token),
    body: JSON.stringify(item),
  })

  return handleResponse<SubscriptionItem>(response, "Failed to update item.")
}

/**
 * Delete a child item
 */
export async function deleteItemApi(
  token: string,
  itemId: number
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/packages/items/${itemId}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  })

  if (!response.ok) {
    let errorMessage = `Failed to delete item (status ${response.status})`
    try {
      const errJson = await response.json()
      if (errJson.message) errorMessage = errJson.message
    } catch {
      // Ignore
    }
    throw new Error(errorMessage)
  }

  const json = await response.json()
  return { success: true, message: json.message || "Item deleted successfully." }
}

/**
 * Toggle child item status (1 = Active, 0 = Inactive)
 */
export async function toggleItemStatusApi(
  token: string,
  itemId: number,
  status: 0 | 1
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/packages/items/${itemId}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    let errorMessage = `Failed to toggle item status (status ${response.status})`
    try {
      const errJson = await response.json()
      if (errJson.message) errorMessage = errJson.message
    } catch {
      // Ignore
    }
    throw new Error(errorMessage)
  }

  const json = await response.json()
  return { success: true, message: json.message || "Item status updated." }
}

/**
 * Public plans listing from school/public endpoint
 */
export async function fetchPublicPlansApi(): Promise<SubscriptionPackage[]> {
  const response = await fetch(`${SERVER_BASE_URL}/api/v1/saas/plans`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  return handleResponse<SubscriptionPackage[]>(response, "Failed to retrieve public subscription plans.")
}
