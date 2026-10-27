import { API_BASE_URL } from "@/config/api"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function getBrowserName(): string {
  const ua = navigator.userAgent
  if (ua.includes("Edg/")) return "Microsoft Edge (SaaS Admin)"
  if (ua.includes("Chrome/")) return "Google Chrome (SaaS Admin)"
  if (ua.includes("Firefox/")) return "Mozilla Firefox (SaaS Admin)"
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Apple Safari (SaaS Admin)"
  return "Web Browser (SaaS Admin)"
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isWebPushSupported()) return "unsupported"
  return Notification.permission
}

export async function registerSaasServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isWebPushSupported()) return null
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" })
  } catch (err) {
    console.warn("[SaaS ServiceWorker registration failed]:", err)
    return null
  }
}

export async function subscribeSaasWebPush(
  token: string,
  userInitiated = false
): Promise<{ success: boolean; reason?: string; error?: string }> {
  if (!isWebPushSupported() || !token) {
    return { success: false, reason: "unsupported" }
  }

  try {
    let permission = Notification.permission
    if (userInitiated && permission !== "granted") {
      permission = await Notification.requestPermission()
    }

    if (permission !== "granted") {
      return { success: false, reason: "permission_denied" }
    }

    let registration = await navigator.serviceWorker.getRegistration()
    if (!registration) {
      registration = (await registerSaasServiceWorker()) || undefined
    }
    if (!registration) {
      return { success: false, reason: "sw_failed" }
    }
    await navigator.serviceWorker.ready

    const vapidRes = await fetch(`${API_BASE_URL}/notifications/vapid-public-key`)
    const vapidJson = await vapidRes.json()
    if (!vapidJson.success || !vapidJson.vapidPublicKey) {
      throw new Error("Failed to retrieve VAPID public key from server")
    }

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(vapidJson.vapidPublicKey)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as BufferSource,
      })
    }

    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token
    await fetch(`${API_BASE_URL}/notifications/device-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanToken}`,
      },
      body: JSON.stringify({
        token: subscription,
        device_type: "web",
        device_name: getBrowserName(),
      }),
    })

    localStorage.setItem("saas_web_push_subscribed", "true")
    return { success: true }
  } catch (err: any) {
    console.warn("[subscribeSaasWebPush Error]:", err?.message || err)
    return { success: false, error: err?.message }
  }
}

export async function unsubscribeSaasWebPush(token?: string | null): Promise<void> {
  if (!isWebPushSupported()) return

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return

    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      if (token) {
        const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token
        await fetch(`${API_BASE_URL}/notifications/device-token`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cleanToken}`,
          },
          body: JSON.stringify({ token: subscription }),
        }).catch(() => {})
      }
      await subscription.unsubscribe().catch(() => {})
    }
    localStorage.removeItem("saas_web_push_subscribed")
  } catch (err) {
    console.warn("[unsubscribeSaasWebPush Error]:", err)
  }
}

export function playNotificationChime(): void {
  if (typeof window === "undefined") return
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {})
    }

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    const now = ctx.currentTime
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1)

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.35)
  } catch {
    // Ignore audio context autoplay restrictions
  }
}
