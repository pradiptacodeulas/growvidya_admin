import { API_BASE_URL } from "@/config/api"
import type {
  AdminProfile,
  ProfileApiResponse,
  UpdateProfileParams,
  GenderItem,
  GendersApiResponse,
} from "@/types/auth"

export async function fetchProfileApi(token: string): Promise<AdminProfile> {
  const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token

  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cleanToken}`,
    },
  })

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`
    try {
      const errorJson = await response.json()
      if (errorJson.message) {
        errorMessage = errorJson.message
      }
    } catch {
      // Ignore JSON parse error on non-JSON response
    }
    const error = new Error(errorMessage) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  const result: ProfileApiResponse = await response.json()
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch profile details")
  }

  const rawData = result.data as unknown as Record<string, unknown>
  const profileData = (
    rawData && typeof rawData === "object"
      ? (rawData.profile as AdminProfile) ||
        (rawData.admin as AdminProfile) ||
        (rawData.user as AdminProfile) ||
        (rawData as unknown as AdminProfile)
      : (result.data as AdminProfile)
  )

  if (profileData && !profileData.name && (profileData.first_name || profileData.last_name)) {
    profileData.name = `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim()
  }

  return profileData
}

export async function updateProfileApi(
  token: string,
  params: UpdateProfileParams
): Promise<AdminProfile> {
  const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token
  const url = `${API_BASE_URL}/profile`

  let body: BodyInit
  const headers: Record<string, string> = {
    Authorization: `Bearer ${cleanToken}`,
  }

  // Option A: multipart/form-data when uploading a photo
  if (params.profile_image && params.profile_image instanceof File) {
    const formData = new FormData()
    if (params.first_name !== undefined && params.first_name.trim() !== "") {
      formData.append("first_name", params.first_name.trim())
    }
    if (params.last_name !== undefined && params.last_name.trim() !== "") {
      formData.append("last_name", params.last_name.trim())
    }
    if (params.email !== undefined && params.email.trim() !== "") {
      formData.append("email", params.email.trim())
    }
    if (params.phone_number !== undefined && params.phone_number.trim() !== "") {
      formData.append("phone_number", params.phone_number.trim())
    }
    if (params.gender !== undefined && params.gender !== null && params.gender !== "") {
      formData.append("gender", String(params.gender))
    }
    formData.append("profile_image", params.profile_image)
    body = formData
    // Do not set Content-Type header so the browser sets multipart/form-data with boundary
  } else {
    // Option B: application/json for text details only
    headers["Content-Type"] = "application/json"
    const jsonPayload: Record<string, unknown> = {}
    if (params.first_name !== undefined && params.first_name.trim() !== "") {
      jsonPayload.first_name = params.first_name.trim()
    }
    if (params.last_name !== undefined && params.last_name.trim() !== "") {
      jsonPayload.last_name = params.last_name.trim()
    }
    if (params.email !== undefined && params.email.trim() !== "") {
      jsonPayload.email = params.email.trim()
    }
    if (params.phone_number !== undefined && params.phone_number.trim() !== "") {
      jsonPayload.phone_number = params.phone_number.trim()
    }
    if (params.gender !== undefined && params.gender !== null && params.gender !== "") {
      jsonPayload.gender = Number(params.gender)
    }
    body = JSON.stringify(jsonPayload)
  }

  // Support PUT with fallback to PATCH or POST if 404/405
  const candidateMethods = ["PUT", "PATCH", "POST"]
  let response: Response | null = null
  let lastError: Error | null = null

  for (const method of candidateMethods) {
    try {
      response = await fetch(url, {
        method,
        headers,
        body,
      })

      // If method is not supported, attempt alternative
      if (response.status === 404 || response.status === 405) {
        continue
      }
      break
    } catch (err) {
      lastError = err as Error
    }
  }

  if (!response) {
    throw lastError || new Error("Failed to connect to the server.")
  }

  if (!response.ok) {
    let errorMessage = `Failed to update profile (status ${response.status})`
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

  const result: ProfileApiResponse = await response.json()
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to update profile details.")
  }

  const rawData = result.data as unknown as Record<string, unknown>
  const profileData = (
    rawData && typeof rawData === "object"
      ? (rawData.profile as AdminProfile) ||
        (rawData.admin as AdminProfile) ||
        (rawData.user as AdminProfile) ||
        (rawData as unknown as AdminProfile)
      : (result.data as AdminProfile)
  )

  if (profileData && !profileData.name && (profileData.first_name || profileData.last_name)) {
    profileData.name = `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim()
  }

  return profileData
}

export async function fetchGendersApi(token?: string | null): Promise<GenderItem[]> {
  const cleanToken = token ? (token.startsWith("Bearer ") ? token.slice(7) : token) : null

  const response = await fetch(`${API_BASE_URL}/genders`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch genders (status ${response.status})`)
  }

  const result: GendersApiResponse = await response.json()
  return result.data || []
}
