export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || ""

export const SERVER_BASE_URL: string = import.meta.env.VITE_SERVER_BASE_URL || ""

/**
 * Helper to get a full accessible image URL from a relative or absolute path.
 */
export function getFullImageUrl(imagePath?: string | null): string | null {
  if (!imagePath) return null
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath
  }
  const cleanPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath
  return `${SERVER_BASE_URL}/${cleanPath}`
}
