import { useEffect, useState } from "react"
import { useAppSelector } from "@/store/store"
import { fetchFooterSettingApi } from "@/services/settingsService"
import type { FooterSetting } from "@/types/settings"

export function AppFooter() {
  const token = useAppSelector((state) => state.auth.token)
  const [footerText, setFooterText] = useState<string>("")

  useEffect(() => {
    if (!token) return
    let isMounted = true

    const loadFooterSetting = async () => {
      try {
        const data = await fetchFooterSettingApi(token)
        if (isMounted) {
          setFooterText(data?.footer_text ? data.footer_text.trim() : "")
        }
      } catch {
        // Silent fail on layout footer fetch
      }
    }

    loadFooterSetting()

    const handleFooterUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<FooterSetting | null>
      const updatedText = customEvent.detail?.footer_text
      setFooterText(updatedText ? updatedText.trim() : "")
    }

    window.addEventListener("growvidya:footer_updated", handleFooterUpdated)
    return () => {
      isMounted = false
      window.removeEventListener("growvidya:footer_updated", handleFooterUpdated)
    }
  }, [token])

  if (!footerText) {
    return null
  }

  return (
    <footer className="border-t border-border/60 bg-background/80 px-4 py-3 sm:px-6 text-xs text-muted-foreground">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>{footerText}</span>
      </div>
    </footer>
  )
}
