import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { useAppDispatch, useAppSelector } from "@/store/store"
import { fetchAdminProfile, clearProfileError } from "@/store/authSlice"
import { getFullImageUrl } from "@/config/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Pencil,
  Camera,
} from "lucide-react"

function formatDate(dateStr?: string) {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr.replace(" ", "T"))
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return dateStr
  }
}

export default function Profile() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { profile, user, isLoadingProfile, profileError } = useAppSelector(
    (state) => state.auth
  )
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    dispatch(fetchAdminProfile())
  }, [dispatch])

  const handleRefresh = () => {
    dispatch(fetchAdminProfile())
  }

  // Active data source: prefer full profile, fall back to user credentials
  const firstName = profile?.first_name || user?.first_name || ""
  const lastName = profile?.last_name || user?.last_name || ""
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName
  const displayName = profile?.name || fullName || user?.name || ""
  const email = profile?.email || user?.email || ""
  const phone = profile?.phone_number || user?.phone_number || ""
  const genderDisplay = profile?.gender_name || user?.gender_name || ""
  const role = profile?.role_name || profile?.role || user?.role || ""
  const status = profile?.status ?? user?.status
  const createdAt = profile?.created_at || user?.created_at
  const updatedAt = profile?.updated_at || user?.updated_at
  const profileImage = profile?.profile_image ?? user?.profile_image

  const avatarUrl = getFullImageUrl(profileImage)
  const initials =
    (firstName?.[0] || displayName?.[0] || "") +
    (lastName?.[0] || (displayName.includes(" ") ? displayName.split(" ")[1]?.[0] : "") || "")

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Admin Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your administrator account credentials and personal details.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            onClick={() => navigate("/profile/edit")}
            className="gap-2 h-9 text-xs font-semibold cursor-pointer shadow-xs"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingProfile}
            className="gap-2 h-9 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingProfile ? "animate-spin" : ""}`} />
            {isLoadingProfile ? "Refreshing..." : "Refresh Profile"}
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {profileError && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">Unable to fetch profile:</span>{" "}
              {profileError}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              className="h-8 text-xs font-semibold border-destructive/40 text-destructive hover:bg-destructive/20"
            >
              Retry
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => dispatch(clearProfileError())}
              className="h-8 text-xs"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Profile Hero Card */}
      <Card className="relative overflow-hidden border-border/70 shadow-sm">
        {/* Banner Gradient Background */}
        <div className="h-24 sm:h-32 bg-gradient-to-r from-primary/15 via-primary/5 to-muted border-b border-border/40 relative">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,_currentColor_1px,_transparent_0)] [background-size:16px_16px]" />
          <div className="absolute top-3 right-4 flex items-center gap-2">
            {status !== undefined && status !== null && (
              <Badge
                variant={status === 1 ? "default" : "secondary"}
                className="capitalize gap-1 text-[11px] font-semibold"
              >
                <CheckCircle2 className="h-3 w-3" />
                {status === 1 ? "Active" : "Inactive"}
              </Badge>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/profile/edit")}
              className="h-7 text-xs font-medium gap-1.5 bg-background/80 hover:bg-background backdrop-blur-xs shadow-xs cursor-pointer"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          </div>
        </div>

        <CardContent className="pt-0 relative px-6 sm:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-10 sm:-mt-12 mb-2">
            {/* Avatar with edit overlay */}
            <div className="relative group">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-4 border-card bg-primary/10 text-primary font-bold text-xl sm:text-2xl uppercase flex items-center justify-center shadow-md overflow-hidden ring-1 ring-border/50">
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
                  <User className="h-8 w-8 text-primary/70" />
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate("/profile/edit")}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-transform hover:scale-110 cursor-pointer"
                title="Update avatar or profile"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Name & Role */}
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                {displayName && (
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {displayName}
                  </h2>
                )}
                {role && (
                  <Badge variant="default" className="text-xs uppercase tracking-wider font-bold gap-1 px-2.5 py-0.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {role}
                  </Badge>
                )}
              </div>

              {(email || phone) && (
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground pt-1">
                  {email && (
                    <a
                      href={`mailto:${email}`}
                      className="flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>{email}</span>
                    </a>
                  )}
                  {phone && (
                    <>
                      {email && <span className="text-border hidden sm:inline">&bull;</span>}
                      <a
                        href={`tel:${phone}`}
                        className="flex items-center gap-1.5 hover:text-primary transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>{phone}</span>
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Personal Info & Account Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details Card */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/profile/edit")}
                className="h-7 text-xs font-semibold gap-1 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
            </div>
            <CardDescription className="text-xs">
              Basic identification and contact information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingProfile && !profile && !user ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-0.5 sm:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Full Name</span>
                  <div className="text-sm font-semibold text-foreground min-h-[1.25rem]">
                    {displayName}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-0.5 sm:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Email Address</span>
                  <div className="text-sm font-semibold text-foreground truncate min-h-[1.25rem]">
                    {email}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-0.5">
                  <span className="text-xs font-medium text-muted-foreground">Phone Number</span>
                  <div className="text-sm font-semibold text-foreground min-h-[1.25rem]">
                    {phone}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-0.5">
                  <span className="text-xs font-medium text-muted-foreground">Gender</span>
                  <div className="text-sm font-semibold text-foreground min-h-[1.25rem]">
                    {genderDisplay}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Details Card */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Account Details</CardTitle>
            </div>
            <CardDescription className="text-xs">
              System credentials and account status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-0.5">
                <span className="text-xs font-medium text-muted-foreground">Role</span>
                <div className="text-sm font-semibold text-foreground uppercase">
                  {role}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-0.5">
                <span className="text-xs font-medium text-muted-foreground">Status</span>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground min-h-[1.25rem]">
                  {status !== undefined && status !== null ? (
                    <>
                      <span className={`h-2 w-2 rounded-full ${status === 1 ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                      {status === 1 ? "Active Account" : "Inactive"}
                    </>
                  ) : null}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-0.5">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Registered On
                </span>
                <div className="text-xs font-medium text-foreground">
                  {formatDate(createdAt)}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-0.5">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Last Updated
                </span>
                <div className="text-xs font-medium text-foreground">
                  {formatDate(updatedAt)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
