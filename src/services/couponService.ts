import { API_BASE_URL } from "@/config/api"
import type {
  CouponDetail,
  CouponQueryParams,
  CouponsApiResponse,
  CouponsData,
  SingleCouponApiResponse,
} from "@/types/coupon"


export async function fetchCouponsApi(
  token: string,
  params?: CouponQueryParams
): Promise<CouponsData> {
  const query = new URLSearchParams()

  if (params?.page !== undefined) {
    query.append("page", String(params.page))
  }
  if (params?.limit !== undefined) {
    query.append("limit", String(params.limit))
  }
  if (params?.search !== undefined && params.search.trim() !== "") {
    query.append("search", params.search.trim())
  }
  if (params?.status !== undefined && params.status !== "all" && params.status !== "") {
    const statusVal =
      params.status === "active" ? "1" : params.status === "inactive" ? "0" : String(params.status)
    query.append("status", statusVal)
  }
  if (params?.discount_type && params.discount_type !== "all" && params.discount_type !== "") {
    query.append("discount_type", params.discount_type)
  }

  const queryString = query.toString() ? `?${query.toString()}` : ""

  // Use /api/v1/coupons (with fallback to saas-admin/coupons if needed)
  const baseUrl = API_BASE_URL.replace(/\/saas-admin\/?$/, "")
  let response = await fetch(`${baseUrl}/coupons${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (response.status === 404) {
    response = await fetch(`${API_BASE_URL}/coupons${queryString}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  }


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

  const result: CouponsApiResponse = await response.json()
  if (!result.success) {
    throw new Error(result.message || "Failed to fetch coupons")
  }

  // Handle paginated response: { data: { coupons: [...], pagination: {...} } }
  if (result.data && !Array.isArray(result.data) && Array.isArray(result.data.coupons)) {
    return {
      coupons: result.data.coupons,
      pagination: result.data.pagination || {
        total: result.data.coupons.length,
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        totalPages: Math.ceil(result.data.coupons.length / (params?.limit ?? 10)) || 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    }
  }

  // Fallback if API returned plain array (backward compatibility)
  if (Array.isArray(result.data)) {
    const total = result.data.length
    const page = params?.page ?? 1
    const limit = params?.limit ?? (total || 10)
    return {
      coupons: result.data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    }
  }

  throw new Error("Invalid coupons response structure received from API")
}

export async function fetchCouponByIdApi(
  token: string,
  id: number | string
): Promise<CouponDetail> {
  const url = `${API_BASE_URL}/coupons/${id}`
  let response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  // Fallback to /api/v1/coupons/:id if 404
  if (response.status === 404) {
    const fallbackUrl = `${API_BASE_URL.replace(/\/saas-admin\/?$/, "")}/coupons/${id}`
    response = await fetch(fallbackUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
  }

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

  const result: SingleCouponApiResponse = await response.json()
  if (!result.success || !result.data) {
    throw new Error(result.message || "Coupon not found.")
  }

  return result.data
}


