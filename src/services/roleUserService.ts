import { API_BASE_URL, SERVER_BASE_URL } from "@/config/api"
import type {
  SaasModule,
  SaasRole,
  CreateRolePayload,
  UpdateRolePayload,
  SubAdminUser,
  SubAdminsListResult,
  CreateSubAdminPayload,
  UpdateSubAdminPayload,
} from "@/types/roleUser"

function getAuthHeaders(token?: string | null, isMultipart = false): Record<string, string> {
  const headers: Record<string, string> = {}
  if (!isMultipart) {
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

export function resolveSubAdminImageUrl(imagePath?: string | null): string | null {
  if (!imagePath) return null
  const trimmed = String(imagePath).trim()
  if (!trimmed) return null
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed
  }
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  return `${SERVER_BASE_URL}${normalizedPath}`
}

// ========================================================
// 1. MODULES
// ========================================================
export async function fetchModulesApi(token: string): Promise<SaasModule[]> {
  const res = await fetch(`${API_BASE_URL}/modules`, {
    method: "GET",
    headers: getAuthHeaders(token),
  })
  return handleResponse<SaasModule[]>(res, "Failed to retrieve SaaS modules.")
}

// ========================================================
// 2. ROLES & PERMISSIONS
// ========================================================
export async function fetchRolesApi(
  token: string,
  params?: { search?: string; status?: string | number }
): Promise<SaasRole[]> {
  const query = new URLSearchParams()
  if (params?.search && params.search.trim()) {
    query.set("search", params.search.trim())
  }
  if (params?.status !== undefined && params.status !== "" && params.status !== "all") {
    query.set("status", String(params.status))
  }
  const qs = query.toString() ? `?${query.toString()}` : ""
  const res = await fetch(`${API_BASE_URL}/roles${qs}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  })
  return handleResponse<SaasRole[]>(res, "Failed to retrieve roles.")
}

export async function fetchRoleByIdApi(token: string, id: number): Promise<SaasRole> {
  const res = await fetch(`${API_BASE_URL}/roles/${id}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  })
  return handleResponse<SaasRole>(res, "Failed to retrieve role details.")
}

export async function createRoleApi(token: string, payload: CreateRolePayload): Promise<SaasRole> {
  const res = await fetch(`${API_BASE_URL}/roles`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  })
  return handleResponse<SaasRole>(res, "Failed to create role.")
}

export async function updateRoleApi(
  token: string,
  id: number,
  payload: UpdateRolePayload
): Promise<SaasRole> {
  const res = await fetch(`${API_BASE_URL}/roles/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  })
  return handleResponse<SaasRole>(res, "Failed to update role.")
}

export async function toggleRoleStatusApi(
  token: string,
  id: number,
  status: number
): Promise<SaasRole> {
  const res = await fetch(`${API_BASE_URL}/roles/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status }),
  })
  return handleResponse<SaasRole>(res, "Failed to update role status.")
}

export async function deleteRoleApi(token: string, id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/roles/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  })
  await handleResponse<unknown>(res, "Failed to delete role.")
}

// ========================================================
// 3. SUB-ADMIN USERS
// ========================================================
export async function fetchSubAdminsApi(
  token: string,
  params?: {
    search?: string
    status?: string | number
    role_id?: string | number
    page?: number
    limit?: number
  }
): Promise<SubAdminsListResult> {
  const query = new URLSearchParams()
  if (params?.search && params.search.trim()) {
    query.set("search", params.search.trim())
  }
  if (params?.status !== undefined && params.status !== "" && params.status !== "all") {
    query.set("status", String(params.status))
  }
  if (params?.role_id !== undefined && params.role_id !== "" && params.role_id !== "all") {
    query.set("role_id", String(params.role_id))
  }
  if (params?.page) {
    query.set("page", String(params.page))
  }
  if (params?.limit) {
    query.set("limit", String(params.limit))
  }

  const qs = query.toString() ? `?${query.toString()}` : ""
  const res = await fetch(`${API_BASE_URL}/sub-admins${qs}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  })
  return handleResponse<SubAdminsListResult>(res, "Failed to retrieve sub-admin users.")
}

export async function fetchSubAdminByIdApi(token: string, id: number): Promise<SubAdminUser> {
  const res = await fetch(`${API_BASE_URL}/sub-admins/${id}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  })
  return handleResponse<SubAdminUser>(res, "Failed to retrieve sub-admin details.")
}

export async function createSubAdminApi(
  token: string,
  payload: CreateSubAdminPayload
): Promise<SubAdminUser> {
  const hasFile = payload.profile_image instanceof File

  if (hasFile) {
    const formData = new FormData()
    formData.append("first_name", payload.first_name.trim())
    if (payload.last_name) formData.append("last_name", payload.last_name.trim())
    formData.append("email", payload.email.trim())
    formData.append("password", payload.password)
    formData.append("role_id", String(payload.role_id))
    if (payload.gender !== undefined && payload.gender !== null && payload.gender !== "") {
      formData.append("gender", String(payload.gender))
    }
    if (payload.phone_number) formData.append("phone_number", payload.phone_number.trim())
    if (payload.status !== undefined) formData.append("status", String(payload.status))
    formData.append("profile_image", payload.profile_image as File)

    const res = await fetch(`${API_BASE_URL}/sub-admins`, {
      method: "POST",
      headers: getAuthHeaders(token, true),
      body: formData,
    })
    return handleResponse<SubAdminUser>(res, "Failed to create sub-admin user.")
  }

  const res = await fetch(`${API_BASE_URL}/sub-admins`, {
    method: "POST",
    headers: getAuthHeaders(token, false),
    body: JSON.stringify(payload),
  })
  return handleResponse<SubAdminUser>(res, "Failed to create sub-admin user.")
}

export async function updateSubAdminApi(
  token: string,
  id: number,
  payload: UpdateSubAdminPayload
): Promise<SubAdminUser> {
  const hasFile = payload.profile_image instanceof File

  if (hasFile) {
    const formData = new FormData()
    if (payload.first_name !== undefined) formData.append("first_name", payload.first_name.trim())
    if (payload.last_name !== undefined) formData.append("last_name", payload.last_name.trim())
    if (payload.email !== undefined) formData.append("email", payload.email.trim())
    if (payload.password) formData.append("password", payload.password)
    if (payload.role_id !== undefined) formData.append("role_id", String(payload.role_id))
    if (payload.gender !== undefined && payload.gender !== null) {
      formData.append("gender", String(payload.gender))
    }
    if (payload.phone_number !== undefined) formData.append("phone_number", payload.phone_number.trim())
    if (payload.status !== undefined) formData.append("status", String(payload.status))
    formData.append("profile_image", payload.profile_image as File)

    const res = await fetch(`${API_BASE_URL}/sub-admins/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(token, true),
      body: formData,
    })
    return handleResponse<SubAdminUser>(res, "Failed to update sub-admin user.")
  }

  const res = await fetch(`${API_BASE_URL}/sub-admins/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(token, false),
    body: JSON.stringify(payload),
  })
  return handleResponse<SubAdminUser>(res, "Failed to update sub-admin user.")
}

export async function toggleSubAdminStatusApi(
  token: string,
  id: number,
  status: number
): Promise<SubAdminUser> {
  const res = await fetch(`${API_BASE_URL}/sub-admins/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status }),
  })
  return handleResponse<SubAdminUser>(res, "Failed to update sub-admin status.")
}

export async function deleteSubAdminApi(token: string, id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/sub-admins/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  })
  await handleResponse<unknown>(res, "Failed to delete sub-admin user.")
}
