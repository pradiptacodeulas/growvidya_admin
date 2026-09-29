import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { motion } from "motion/react"
import { useAppDispatch } from "@/store/store"
import { fetchAdminProfile, setCredentials } from "@/store/authSlice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from "lucide-react"
import logoLight from "@/assets/logo_light.png"
import logoDark from "@/assets/logo_dark.png"
import { API_BASE_URL } from "@/config/api"

interface LoginSuccessResponse {
  success: true
  message: string
  data: {
    token: string
    user: {
      id: number
      name: string
      email: string
      role: string
      status: number
    }
  }
}

interface LoginRejectResponse {
  success: false
  message: string
  errors: unknown
}

export default function Login() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("growvidya-theme")
      if (saved) return saved === "dark"
      return document.documentElement.classList.contains("dark")
    }
    return false
  })

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"))
    }
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data: LoginSuccessResponse | LoginRejectResponse =
        await response.json()

      if (data.success) {
        dispatch(
          setCredentials({
            token: data.data.token,
            user: data.data.user,
          })
        )
        // Automatically fetch full profile details
        dispatch(fetchAdminProfile())
        navigate("/overview", { replace: true })
      } else {
        setError(data.message || "Invalid email or password.")
      }
    } catch {
      setError("Unable to connect to the server. Please check your network connection.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-background text-foreground overflow-hidden">
      {/* Left side: Premium Abstract Geometric Showcase (matching reference) */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 lg:p-16 border-r border-border/60 bg-[#080b11] text-white overflow-hidden select-none">
        {/* Layer 1: Geometric Angular Shards & Facet Planes */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 1000 1200"
        >
          <defs>
            <linearGradient id="facet-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.04" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.01" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="facet-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.08" />
              <stop offset="70%" stopColor="#ffffff" stopOpacity="0.015" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="edge-glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.02" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="edge-primary" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Angular polygonal dark facets */}
          <polygon points="-100,0 700,0 450,850 -100,600" fill="url(#facet-1)" />
          <polygon points="350,1300 1100,300 1100,1300" fill="url(#facet-2)" />
          <polygon points="-100,600 450,850 100,1300 -100,1300" fill="url(#facet-1)" opacity="0.6" />

          {/* Precision highlight edge seams */}
          <line x1="-100" y1="600" x2="700" y2="0" stroke="url(#edge-glow)" strokeWidth="1.2" />
          <line x1="450" y1="850" x2="1100" y2="300" stroke="url(#edge-primary)" strokeWidth="1.4" />
          <line x1="-100" y1="600" x2="450" y2="850" stroke="url(#edge-glow)" strokeWidth="1" />
        </svg>

        {/* Layer 2: Animated sweeping diagonal light beams */}
        <motion.div
          animate={{
            opacity: [0.2, 0.45, 0.2],
            rotate: [-32, -30, -32],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-1/4 -left-1/4 w-[160%] h-[150%] pointer-events-none"
        >
          <div className="absolute top-1/2 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent blur-[0.5px]" />
          <div className="absolute top-[43%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/35 to-transparent blur-[1px]" />
        </motion.div>

        {/* Layer 3: Ambient glowing aura directly behind brand */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.18, 0.32, 0.18],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-primary/25 blur-3xl pointer-events-none"
        />

        {/* Ambient secondary corner glow */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.12, 0.22, 0.12],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none"
        />

        <div />

        {/* Center: Hero brand presence */}
        <div className="relative z-10 my-auto py-12 flex flex-col items-start max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mb-8"
          >
            {/* Left side is a dark themed showcase matching reference */}
            <img
              src={logoDark}
              alt="Growvidya"
              className="w-[250px] xl:w-[290px] object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="space-y-4"
          >
            <h2 className="text-2xl xl:text-3xl font-bold tracking-tight text-white/95 leading-tight">
              Empowering schools with scalable, intelligent infrastructure.
            </h2>
            <p className="text-sm xl:text-base text-gray-400 leading-relaxed">
              Manage multi-tenant subscriptions, institutional licenses, invoices,
              and system-wide analytics with high fidelity and simplicity.
            </p>
          </motion.div>
        </div>

        {/* Bottom security pill */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative z-10 flex items-center gap-2 text-xs text-gray-400"
        >
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Enterprise-grade authentication & encrypted role-based controls</span>
        </motion.div>
      </div>

      {/* Right side: Clean, Modern Sign In Section */}
      <div className="relative flex flex-col justify-between p-6 sm:p-10 lg:p-14 w-full h-full overflow-hidden bg-background">
        {/* Subtle background ambiance */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(currentColor 1.2px, transparent 1.2px)`,
            backgroundSize: "28px 28px",
          }}
        />

        {/* Soft background glows */}
        <motion.div
          animate={{
            x: [0, 20, 0],
            y: [0, -25, 0],
            scale: [1, 1.15, 1],
            opacity: [0.08, 0.18, 0.08],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{
            x: [0, -15, 0],
            y: [0, 20, 0],
            scale: [1, 1.2, 1],
            opacity: [0.06, 0.14, 0.06],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
          className="absolute -bottom-24 -left-20 w-80 h-80 rounded-full bg-primary/15 blur-3xl pointer-events-none"
        />

        {/* Mobile header brand logo */}
        <div className="relative z-10 lg:hidden flex items-center justify-center sm:justify-start mb-6 pt-2">
          <img
            src={isDark ? logoDark : logoLight}
            alt="Growvidya"
            className="w-[140px] object-contain"
          />
        </div>

        <div className="hidden lg:block h-2" />

        {/* Clean Sign In Container */}
        <div className="relative z-10 w-full max-w-md mx-auto my-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="rounded-2xl border border-border/60 bg-card/60 dark:bg-card/40 backdrop-blur-md p-7 sm:p-9 shadow-xl shadow-black/5 dark:shadow-black/25 space-y-6"
          >
            <div className="space-y-1.5 text-left">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Sign in
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome back! Please sign in to continue.
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="leading-snug">{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  disabled={isLoading}
                  className="h-10 bg-background/50 border-input transition-colors focus-visible:ring-1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="h-10 pr-10 bg-background/50 border-input transition-colors focus-visible:ring-1"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold shadow-xs hover:shadow-sm transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pt-6 text-center text-xs text-muted-foreground">
          <span>&copy; Growvidya &middot; Privacy &middot; Terms</span>
        </div>
      </div>
    </div>
  )
}
