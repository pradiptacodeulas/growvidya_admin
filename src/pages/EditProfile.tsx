import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router"
import { useAppDispatch, useAppSelector } from "@/store/store"
import { fetchAdminProfile, updateAdminProfile } from "@/store/authSlice"
import { toast } from "sonner"
import { fetchGendersApi } from "@/services/profileService"
import type { GenderItem } from "@/types/auth"
import { getFullImageUrl } from "@/config/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Upload,
  Camera,
  Trash2,
  Loader2,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  Clock,
  Info,
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

export default function EditProfile() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { profile, user, isLoadingProfile } = useAppSelector(
    (state) => state.auth
  )

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [gender, setGender] = useState<string>("")
  const [genders, setGenders] = useState<GenderItem[]>([])
  const [isLoadingGenders, setIsLoadingGenders] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const genderItemsMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const g of genders) {
      map[String(g.id)] = g.name || g.gender
    }
    return map
  }, [genders])

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch available genders from backend API
  useEffect(() => {
    let isMounted = true
    setIsLoadingGenders(true)
    fetchGendersApi()
      .then((data) => {
        if (isMounted) {
          setGenders(data)
        }
      })
      .catch((err) => {
        console.error("Failed to fetch genders:", err)
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingGenders(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Fetch profile if refreshed directly on this page
  useEffect(() => {
    if (!profile && !user) {
      dispatch(fetchAdminProfile())
    }
  }, [dispatch, profile, user])

  // Populate form with current user/profile details
  useEffect(() => {
    if (profile || user) {
      const fName = profile?.first_name || user?.first_name || ""
      const lName = profile?.last_name || user?.last_name || ""
      setFirstName(fName)
      setLastName(lName)
      setEmail(profile?.email || user?.email || "")
      setPhoneNumber(profile?.phone_number || user?.phone_number || "")

      const rawGender =
        profile?.gender_id ?? profile?.gender ?? user?.gender_id ?? user?.gender
      if (rawGender !== undefined && rawGender !== null && rawGender !== "") {
        setGender(String(rawGender))
      } else {
        setGender("")
      }
    }
  }, [profile, user])

  // Clean up avatar preview URL on change / unmount
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  const currentImageUrl = getFullImageUrl(profile?.profile_image ?? user?.profile_image)
  const activeDisplayAvatar = avatarPreview || currentImageUrl
  const initials =
    (firstName?.[0] || profile?.first_name?.[0] || "") +
    (lastName?.[0] || profile?.last_name?.[0] || "")

  const role = profile?.role_name || profile?.role || user?.role || ""
  const status = profile?.status ?? user?.status
  const createdAt = profile?.created_at || user?.created_at
  const updatedAt = profile?.updated_at || user?.updated_at

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!validTypes.includes(file.type)) {
      toast.error("Please select a valid image file (.jpg, .jpeg, .png, .webp).")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB.")
      return
    }

    setAvatarFile(file)
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview)
    }
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleRemoveSelectedFile = () => {
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview)
    }
    setAvatarFile(null)
    setAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (
      !firstName.trim() &&
      !lastName.trim() &&
      !email.trim() &&
      !phoneNumber.trim() &&
      !gender &&
      !avatarFile
    ) {
      toast.error("Please provide at least one field to update.")
      return
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Please enter a valid email address.")
      return
    }

    if (phoneNumber.trim()) {
      const cleanPhone = phoneNumber.trim().replace(/^\+/, "")
      if (!/^\d{7,15}$/.test(cleanPhone)) {
        toast.error("Please provide a valid phone number (7 to 15 digits).")
        return
      }
    }

    setIsSubmitting(true)

    try {
      const resultAction = await dispatch(
        updateAdminProfile({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone_number: phoneNumber.trim(),
          gender: gender ? Number(gender) : undefined,
          profile_image: avatarFile,
        })
      )

      if (updateAdminProfile.fulfilled.match(resultAction)) {
        toast.success("Profile updated successfully.")
        navigate("/profile", { replace: true })
      } else if (updateAdminProfile.rejected.match(resultAction)) {
        toast.error(
          resultAction.payload || "Failed to update profile. Please try again."
        )
      }
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error.message || "An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header with Single Back Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/profile")}
          className="gap-2 h-9 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Edit Profile
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Update your administrator credentials, personal details, and avatar image.
          </p>
        </div>
      </div>

      {/* Form Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Edit Form (2 Columns) */}
        <div className="lg:col-span-2">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Make changes to your basic identification, contact details, and avatar picture.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isLoadingProfile && !profile && !user ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Avatar Upload Banner */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-xl border border-border/60 bg-muted/20">
                    <div className="relative group shrink-0">
                      <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-2 border-border/80 bg-primary/10 text-primary font-bold text-2xl uppercase flex items-center justify-center overflow-hidden shadow-sm ring-2 ring-primary/20">
                        {activeDisplayAvatar ? (
                          <img
                            src={activeDisplayAvatar}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                        ) : initials ? (
                          <span>{initials}</span>
                        ) : (
                          <User className="h-8 w-8 text-primary/70" />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                        className="absolute inset-0 rounded-2xl bg-black/50 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer disabled:pointer-events-none"
                        title="Upload new photo"
                      >
                        <Camera className="h-5 w-5" />
                        <span className="text-[10px] font-medium mt-0.5">Change</span>
                      </button>
                    </div>

                    <div className="flex-1 space-y-1.5 text-center sm:text-left">
                      <div className="text-xs font-semibold text-foreground">
                        Profile Avatar Picture
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Upload a clear JPG, PNG, or WEBP photo. File size limit is 5MB.
                      </p>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1.5">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSubmitting}
                          className="h-8 text-xs font-medium gap-1.5 cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {avatarFile ? "Change Photo" : "Upload Photo"}
                        </Button>

                        {avatarFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveSelectedFile}
                            disabled={isSubmitting}
                            className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2.5 cursor-pointer"
                            title="Remove selected file"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* First Name & Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="first_name" className="text-xs font-semibold">
                        First Name
                      </Label>
                      <Input
                        id="first_name"
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        disabled={isSubmitting}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="last_name" className="text-xs font-semibold">
                        Last Name
                      </Label>
                      <Input
                        id="last_name"
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={isSubmitting}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone_number" className="text-xs font-semibold flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone_number"
                      type="tel"
                      placeholder="Phone number (7 to 15 digits)"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={isSubmitting}
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <Label htmlFor="gender" className="text-xs font-semibold flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      Gender
                    </Label>

                    {isLoadingGenders && genders.length === 0 ? (
                      <Skeleton className="h-9 w-full rounded-lg" />
                    ) : (
                      <Select
                        value={gender || null}
                        onValueChange={(val) => setGender(val ? String(val) : "")}
                        items={genderItemsMap}
                        itemToStringLabel={(val) => {
                          if (!val) return ""
                          return genderItemsMap[String(val)] || String(val)
                        }}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="gender" className="w-full h-9 text-xs">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          {genders.map((item) => (
                            <SelectItem
                              key={item.id}
                              value={String(item.id)}
                              label={item.name || item.gender}
                              className="text-xs cursor-pointer"
                            >
                              {item.name || item.gender}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/70">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/profile")}
                      disabled={isSubmitting}
                      className="h-9 text-xs font-semibold px-4 cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmitting}
                      className="h-9 text-xs font-semibold px-5 gap-1.5 cursor-pointer shadow-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving Changes...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info & Status (1 Column) */}
        <div className="space-y-6">
          {/* Account Status Card */}
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">Account Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-0.5">
                <span className="text-xs font-medium text-muted-foreground">Assigned Role</span>
                <div className="flex items-center justify-between pt-0.5 min-h-[1.25rem]">
                  <span className="text-xs font-semibold text-foreground uppercase">{role}</span>
                  {role && (
                    <Badge variant="default" className="text-[10px] uppercase font-bold">
                      {role}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-0.5">
                <span className="text-xs font-medium text-muted-foreground">Account Status</span>
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground pt-0.5 min-h-[1.25rem]">
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
            </CardContent>
          </Card>

          {/* Quick Guidelines Card */}
          <Card className="border-border/70 shadow-sm bg-muted/10">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Info className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-semibold text-foreground">Update Guidelines</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                &bull; Updates to your email or name take effect immediately across all admin sessions.
              </p>
              <p>
                &bull; If changing phone number, enter 7 to 15 digits without special characters.
              </p>
              <p>
                &bull; Photo uploads are automatically compressed and securely stored on the server.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
