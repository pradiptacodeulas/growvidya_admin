import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import { usePermission } from "@/hooks/usePermission"
import {
  fetchSubAdminsApi,
  fetchSubAdminByIdApi,
  createSubAdminApi,
  updateSubAdminApi,
  toggleSubAdminStatusApi,
  deleteSubAdminApi,
  fetchRolesApi,
  resolveSubAdminImageUrl,
} from "@/services/roleUserService"
import { fetchGendersApi } from "@/services/profileService"
import type {
  SubAdminUser,
  SubAdminsPagination,
  SaasRole,
} from "@/types/roleUser"
import type { GenderItem } from "@/types/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Users,
  UserPlus,
  RefreshCw,
  Search,
  Shield,
  Mail,
  Phone,
  Pencil,
  Trash2,
  Eye,
  Power,
  PowerOff,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

export default function SubAdmins() {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)
  const currentUser = useAppSelector((state) => state.auth.profile || state.auth.user)
  const { can, isSuperAdmin, refreshPermissions } = usePermission()

  const canCreateSubAdmin = can("sub_admins", "can_add")
  const canEditSubAdmin = can("sub_admins", "can_edit")
  const canDeleteSubAdmin = can("sub_admins", "can_delete")
  const canManageSubAdmin = can("sub_admins", "can_manage")
  const canViewRoles = can("roles", "can_view")

  const [subAdmins, setSubAdmins] = useState<SubAdminUser[]>([])
  const [pagination, setPagination] = useState<SubAdminsPagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  })
  const [roles, setRoles] = useState<SaasRole[]>([])
  const [genders, setGenders] = useState<GenderItem[]>([])

  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Create / Edit Modal state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false)
  const [editingUser, setEditingUser] = useState<SubAdminUser | null>(null)
  const [firstName, setFirstName] = useState<string>("")
  const [lastName, setLastName] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [phoneNumber, setPhoneNumber] = useState<string>("")
  const [genderId, setGenderId] = useState<string>("")
  const [roleId, setRoleId] = useState<string>("")
  const [statusVal, setStatusVal] = useState<number>(1)
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  // View Details Modal state
  const [isViewOpen, setIsViewOpen] = useState<boolean>(false)
  const [viewingUser, setViewingUser] = useState<SubAdminUser | null>(null)
  const [loadingViewDetails, setLoadingViewDetails] = useState<boolean>(false)

  // Delete Confirmation Modal state
  const [userToDelete, setUserToDelete] = useState<SubAdminUser | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // Load lookup data (roles + genders)
  useEffect(() => {
    if (!token) return
    fetchRolesApi(token)
      .then((r) => setRoles(r || []))
      .catch(() => {})
    fetchGendersApi(token)
      .then((g) => setGenders(g || []))
      .catch(() => {})
  }, [token])

  const loadSubAdmins = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const data = await fetchSubAdminsApi(token, {
        search: searchQuery,
        status: selectedStatusFilter === "all" ? undefined : selectedStatusFilter,
        role_id: selectedRoleFilter === "all" ? undefined : selectedRoleFilter,
        page: currentPage,
        limit: 10,
      })
      setSubAdmins(data.sub_admins || [])
      if (data.pagination) {
        setPagination(data.pagination)
      }
    } catch (err: any) {
      console.error("Failed to fetch sub-admins:", err)
      toast.error(err?.message || "Failed to load admin users.")
    } finally {
      setLoading(false)
    }
  }, [token, searchQuery, selectedStatusFilter, selectedRoleFilter, currentPage])

  useEffect(() => {
    loadSubAdmins()
  }, [loadSubAdmins])

  const assignableRoles = useMemo(() => {
    return roles.filter((r) => {
      if (!isSuperAdmin && Number(r.is_system) === 1) return false
      if (Number(r.status) === 1) return true
      // Keep currently assigned role in dropdown if editing a user whose role was deactivated
      if (editingUser && Number(editingUser.role_id) === Number(r.id)) return true
      return false
    })
  }, [roles, isSuperAdmin, editingUser])

  const handleOpenCreate = () => {
    setEditingUser(null)
    setFirstName("")
    setLastName("")
    setEmail("")
    setPassword("")
    setPhoneNumber("")
    setGenderId("")
    const defaultRole = roles.find(
      (r) => Number(r.status) === 1 && (isSuperAdmin || Number(r.is_system) !== 1)
    )
    setRoleId(defaultRole ? String(defaultRole.id) : "")
    setStatusVal(1)
    setProfileFile(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (user: SubAdminUser) => {
    setEditingUser(user)
    setFirstName(user.first_name || "")
    setLastName(user.last_name || "")
    setEmail(user.email || "")
    setPassword("")
    setPhoneNumber(user.phone_number || "")
    setGenderId(user.gender_id ? String(user.gender_id) : user.gender ? String(user.gender) : "")
    setRoleId(user.role_id ? String(user.role_id) : "")
    setStatusVal(Number(user.status) === 0 ? 0 : 1)
    setProfileFile(null)
    setIsFormOpen(true)
  }

  const handleOpenView = async (user: SubAdminUser) => {
    if (!token) return
    setViewingUser(user)
    setIsViewOpen(true)
    try {
      setLoadingViewDetails(true)
      const detail = await fetchSubAdminByIdApi(token, user.id)
      setViewingUser(detail)
    } catch (err: any) {
      toast.error(err?.message || "Failed to load user permissions.")
    } finally {
      setLoadingViewDetails(false)
    }
  }

  const handleSaveUser = async () => {
    if (!token) return
    if (!firstName.trim()) {
      toast.error("First name is required.")
      return
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please provide a valid email address.")
      return
    }
    if (!editingUser && (!password || password.length < 6)) {
      toast.error("Password is required and must be at least 6 characters.")
      return
    }
    if (editingUser && password && password.length < 6) {
      toast.error("New password must be at least 6 characters.")
      return
    }
    if (!roleId) {
      toast.error("Please select a role for this user.")
      return
    }

    try {
      setIsSaving(true)
      if (editingUser) {
        await updateSubAdminApi(token, editingUser.id, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          password: password || undefined,
          phone_number: phoneNumber.trim(),
          gender: genderId ? Number(genderId) : null,
          role_id: Number(roleId),
          status: statusVal,
          profile_image: profileFile || undefined,
        })
        toast.success("Sub-admin user updated successfully.")
      } else {
        await createSubAdminApi(token, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          password,
          phone_number: phoneNumber.trim(),
          gender: genderId ? Number(genderId) : null,
          role_id: Number(roleId),
          status: statusVal,
          profile_image: profileFile || undefined,
        })
        toast.success("Sub-admin user created successfully.")
      }
      setIsFormOpen(false)
      loadSubAdmins()
      if (editingUser && Number(editingUser.id) === Number(currentUser?.id)) {
        refreshPermissions()
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save sub-admin user.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleStatus = async (user: SubAdminUser) => {
    if (!token) return
    const nextStatus = Number(user.status) === 1 ? 0 : 1
    try {
      await toggleSubAdminStatusApi(token, user.id, nextStatus)
      toast.success(
        `User "${user.first_name}" ${nextStatus === 1 ? "activated" : "deactivated"} successfully.`
      )
      loadSubAdmins()
    } catch (err: any) {
      toast.error(err?.message || "Failed to update user status.")
    }
  }

  const handleConfirmDelete = async () => {
    if (!token || !userToDelete) return
    try {
      setIsDeleting(true)
      await deleteSubAdminApi(token, userToDelete.id)
      toast.success(`User "${userToDelete.first_name}" deleted successfully.`)
      setIsDeleteOpen(false)
      setUserToDelete(null)
      loadSubAdmins()
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete user.")
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—"
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const activeCount = subAdmins.filter((u) => Number(u.status) === 1).length
  const inactiveCount = subAdmins.filter((u) => Number(u.status) === 0).length

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="size-6 text-primary shrink-0" />
            <span>Users & Sub-Admins</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage platform sub-admin users, assign roles, and control access status.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSubAdmins}
            disabled={loading}
            className="h-9 px-3 gap-1.5 cursor-pointer text-xs font-semibold"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          {canViewRoles && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/roles")}
              className="h-9 px-3 gap-1.5 cursor-pointer text-xs font-semibold"
            >
              <Shield className="size-3.5" />
              <span>Roles & Permissions</span>
            </Button>
          )}
          {canCreateSubAdmin && (
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="h-9 px-3.5 gap-1.5 cursor-pointer shadow-xs text-xs font-semibold"
            >
              <UserPlus className="size-4" />
              <span>Add User</span>
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Users
              </p>
              <div className="text-2xl font-bold tracking-tight">
                {loading ? <Skeleton className="h-7 w-12" /> : pagination.total}
              </div>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active (Current Page)
              </p>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {loading ? <Skeleton className="h-7 w-12" /> : activeCount}
              </div>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Inactive (Current Page)
              </p>
              <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                {loading ? <Skeleton className="h-7 w-12" /> : inactiveCount}
              </div>
            </div>
            <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Available Roles
              </p>
              <div className="text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400">
                {roles.length}
              </div>
            </div>
            <div className="size-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Shield className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedRoleFilter}
              onChange={(e) => {
                setSelectedRoleFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.role_name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              {(["all", "1", "0"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={selectedStatusFilter === tab ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedStatusFilter(tab)
                    setCurrentPage(1)
                  }}
                  className="h-9 text-xs cursor-pointer"
                >
                  {tab === "all" ? "All" : tab === "1" ? "Active" : "Inactive"}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border border-border/80 shadow-xs py-0 gap-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="px-5 py-3.5 font-semibold">User</th>
                <th className="px-5 py-3.5 font-semibold">Contact</th>
                <th className="px-5 py-3.5 font-semibold">Role</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold">Created</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-4">
                      <Skeleton className="h-12 w-full" />
                    </td>
                  </tr>
                ))
              ) : subAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No sub-admin users found. Click "Add User" to create one.
                  </td>
                </tr>
              ) : (
                subAdmins.map((u) => {
                  const avatarUrl = resolveSubAdminImageUrl(u.profile_image)
                  const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim()
                  const initials = (u.first_name?.[0] || "U").toUpperCase()
                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={fullName}
                              className="size-9 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="size-9 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-foreground">{fullName}</div>
                            {u.gender_name && (
                              <div className="text-xs text-muted-foreground">{u.gender_name}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-foreground">
                            <Mail className="size-3.5 text-muted-foreground shrink-0" />
                            <span>{u.email}</span>
                          </div>
                          {u.phone_number && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="size-3.5 shrink-0" />
                              <span>{u.phone_number}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30 gap-1">
                          <Shield className="size-3" />
                          {u.role_name || "Sub Admin"}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <Badge
                          className={
                            Number(u.status) === 1
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                          }
                        >
                          {Number(u.status) === 1 ? "Active" : "Inactive"}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {formatDate(u.created_at)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleOpenView(u)}
                            className="size-8 cursor-pointer"
                            title="View Details & Permissions"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          {canEditSubAdmin && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleOpenEdit(u)}
                              className="size-8 cursor-pointer"
                              title="Edit User"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                          {canManageSubAdmin && Number(u.id) !== Number(currentUser?.id) && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleToggleStatus(u)}
                              className={`size-8 cursor-pointer ${
                                Number(u.status) === 1
                                  ? "text-amber-600 hover:text-amber-700"
                                  : "text-emerald-600 hover:text-emerald-700"
                              }`}
                              title={Number(u.status) === 1 ? "Deactivate User" : "Activate User"}
                            >
                              {Number(u.status) === 1 ? (
                                <PowerOff className="size-3.5" />
                              ) : (
                                <Power className="size-3.5" />
                              )}
                            </Button>
                          )}
                          {canDeleteSubAdmin && Number(u.id) !== Number(currentUser?.id) && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setUserToDelete(u)
                                setIsDeleteOpen(true)
                              }}
                              className="size-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrevPage}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 gap-1 cursor-pointer"
              >
                <ChevronLeft className="size-3.5" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNextPage}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 px-2.5 gap-1 cursor-pointer"
              >
                Next <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create / Edit Sub-Admin Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              {editingUser ? "Edit Sub-Admin User" : "Add Sub-Admin User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update profile details, assigned role, or reset password."
                : "Create a new sub-admin account and assign a role."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sa-fname">First Name *</Label>
              <Input
                id="sa-fname"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sa-lname">Last Name</Label>
              <Input
                id="sa-lname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sa-email">Email Address *</Label>
              <Input
                id="sa-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@growvidya.com"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sa-pass">
                {editingUser ? "New Password (leave blank to keep current)" : "Password *"}
              </Label>
              <Input
                id="sa-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sa-phone">Phone Number</Label>
              <Input
                id="sa-phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g., 9876543210"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sa-gender">Gender</Label>
              <select
                id="sa-gender"
                value={genderId}
                onChange={(e) => setGenderId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select gender</option>
                {genders.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.gender || g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sa-role">Assigned Role *</Label>
              <select
                id="sa-role"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                disabled={Boolean(editingUser && Number(editingUser.id) === Number(currentUser?.id) && !isSuperAdmin)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="">Select a role</option>
                {assignableRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.role_name}{Number(r.status) !== 1 ? " (Inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sa-status">Account Status</Label>
              <select
                id="sa-status"
                value={statusVal}
                onChange={(e) => setStatusVal(Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sa-photo">Profile Image (optional)</Label>
              <Input
                id="sa-photo"
                type="file"
                accept="image/*"
                onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              disabled={isSaving}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={isSaving} className="cursor-pointer">
              {isSaving ? "Saving..." : editingUser ? "Update User" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Details & Permissions Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              User Details & Effective Permissions
            </DialogTitle>
            <DialogDescription>
              Assigned role and module permissions for {viewingUser?.first_name}{" "}
              {viewingUser?.last_name}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {viewingUser && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border/60">
                <div className="space-y-1">
                  <div className="text-base font-bold text-foreground">
                    {viewingUser.first_name} {viewingUser.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">{viewingUser.email}</div>
                  {viewingUser.phone_number && (
                    <div className="text-xs text-muted-foreground">{viewingUser.phone_number}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30">
                    {viewingUser.role_name || "Sub Admin"}
                  </Badge>
                  <Badge
                    className={
                      Number(viewingUser.status) === 1
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                    }
                  >
                    {Number(viewingUser.status) === 1 ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Role Permissions
              </h4>
              {loadingViewDetails ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : !viewingUser?.permissions || viewingUser.permissions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">
                  No specific module permissions configured for this user's role.
                </p>
              ) : (
                <div className="border border-border/80 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="uppercase bg-muted/50 text-muted-foreground border-b border-border/60">
                      <tr>
                        <th className="px-3 py-2.5 font-semibold">Module</th>
                        <th className="px-2 py-2.5 text-center font-semibold">View</th>
                        <th className="px-2 py-2.5 text-center font-semibold">Add</th>
                        <th className="px-2 py-2.5 text-center font-semibold">Edit</th>
                        <th className="px-2 py-2.5 text-center font-semibold">Delete</th>
                        <th className="px-2 py-2.5 text-center font-semibold">Manage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {viewingUser.permissions.map((p) => (
                        <tr key={p.module_key}>
                          <td className="px-3 py-2 font-medium text-foreground">
                            {p.module_name || p.module_key}
                          </td>
                          {(
                            ["can_view", "can_add", "can_edit", "can_delete", "can_manage"] as const
                          ).map((k) => (
                            <td key={k} className="px-2 py-2 text-center">
                              {p[k] ? (
                                <CheckCircle2 className="size-4 text-emerald-600 inline-block" />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsViewOpen(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Sub-Admin User</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-foreground">
                {userToDelete?.first_name} {userToDelete?.last_name} ({userToDelete?.email})
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              {isDeleting ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
