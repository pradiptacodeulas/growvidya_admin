import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router"
import { useAppDispatch, useAppSelector } from "@/store/store"
import { logout } from "@/store/authSlice"
import { getFullImageUrl } from "@/config/api"
import {
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
} from "lucide-react"

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { profile, user } = useAppSelector((state) => state.auth)

  const avatarUrl = getFullImageUrl(profile?.profile_image ?? user?.profile_image)
  const firstName = profile?.first_name || user?.first_name || ""
  const lastName = profile?.last_name || user?.last_name || ""
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName
  const displayName = profile?.name || fullName || user?.name || ""
  const email = profile?.email || user?.email || ""
  const role = profile?.role_name || profile?.role || user?.role || ""
  const initials =
    (firstName?.[0] || displayName?.[0] || "") +
    (lastName?.[0] || (displayName.includes(" ") ? displayName.split(" ")[1]?.[0] : "") || "")

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const handleProfileClick = () => {
    setIsOpen(false)
    navigate("/profile")
  }

  const handleLogout = () => {
    setIsOpen(false)
    dispatch(logout())
    navigate("/login", { replace: true })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="group flex items-center gap-2.5 rounded-full border border-border/60 bg-muted/30 hover:bg-muted/70 px-2.5 py-1 transition-all cursor-pointer select-none"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase overflow-hidden ring-1 ring-primary/20">
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : initials ? (
            <span>{initials}</span>
          ) : (
            <User className="h-3.5 w-3.5" />
          )}
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-semibold leading-tight text-foreground group-hover:text-primary transition-colors max-w-[130px] truncate">
            {displayName}
          </span>
          {role && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground leading-tight">
              <ShieldCheck className="h-3 w-3 text-primary shrink-0" />
              <span className="capitalize">{role}</span>
            </div>
          )}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180 text-foreground" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-lg z-50 p-1.5 focus:outline-none animate-in fade-in zoom-in-95"
        >
          {/* Header Info */}
          <div className="px-2.5 py-2">
            <p className="text-xs font-semibold text-foreground truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {email}
            </p>
          </div>

          <div className="h-px bg-border/60 my-1" />

          {/* Profile Action */}
          <button
            type="button"
            role="menuitem"
            onClick={handleProfileClick}
            className="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted/80 hover:text-primary transition-colors cursor-pointer text-left"
          >
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Profile</span>
          </button>

          <div className="h-px bg-border/60 my-1" />

          {/* Logout Action */}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-left"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  )
}
