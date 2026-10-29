import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from "react"

const DRAFT_PREFIX = "growvidya_admin_draft:"
const suppressedForms = new Set<string>()

export function useDraftState<T>(
  formKey: string,
  fieldKey: string,
  initialValue: T,
  sanitizeOnLoad?: (loaded: T) => T
): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = `${DRAFT_PREFIX}${formKey}:${fieldKey}`
  const isFirstRender = useRef(true)

  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (raw !== null) {
        const parsed = JSON.parse(raw) as T
        return sanitizeOnLoad ? sanitizeOnLoad(parsed) : parsed
      }
    } catch {
      // Ignore corrupt sessionStorage entries
    }
    return initialValue
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isFirstRender.current) {
      isFirstRender.current = false
      suppressedForms.delete(formKey)
      return
    }
    if (suppressedForms.has(formKey)) return
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // Ignore storage quota errors
    }
  }, [formKey, storageKey, state])

  return [state, setState]
}

export function clearFormDraft(formKey: string): void {
  if (typeof window === "undefined") return
  suppressedForms.add(formKey)
  try {
    const prefix = `${DRAFT_PREFIX}${formKey}:`
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k)
      }
    }
    for (const k of keysToRemove) {
      sessionStorage.removeItem(k)
    }
  } catch {
    // Ignore storage access errors
  }
}

export function clearAllFormDrafts(): void {
  if (typeof window === "undefined") return
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith(DRAFT_PREFIX)) {
        keysToRemove.push(k)
      }
    }
    for (const k of keysToRemove) {
      sessionStorage.removeItem(k)
    }
  } catch {
    // Ignore storage access errors
  }
}
