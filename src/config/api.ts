export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || ""

export const SERVER_BASE_URL: string = import.meta.env.VITE_SERVER_BASE_URL || ""

/**
 * Helper to get a full accessible image/attachment URL from a relative or absolute path,
 * automatically appending the SaaS Admin JWT token for protected Backblaze B2 /upload/ routes.
 */
export function getFullImageUrl(imagePath?: string | null): string | null {
  if (!imagePath) return null
  const trimmed = String(imagePath).trim()
  if (!trimmed) return null
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed
  }

  let url = ""
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    url = trimmed
  } else {
    const cleanPath = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed
    url = `${SERVER_BASE_URL}/${cleanPath}`
  }

  if (typeof window !== "undefined" && !url.includes("token=")) {
    const token = localStorage.getItem("growvidya_token")
    if (token) {
      const sep = url.includes("?") ? "&" : "?"
      return `${url}${sep}token=${encodeURIComponent(token)}`
    }
  }

  return url
}
