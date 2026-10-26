import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate } from "react-router"
import { useAppSelector } from "@/store/store"
import {
  fetchModulesApi,
  fetchRolesApi,
  fetchRoleByIdApi,
  createRoleApi,
  updateRoleApi,
  toggleRoleStatusApi,
  deleteRoleApi,
} from "@/services/roleUserService"
import type { SaasModule, SaasRole, RolePermission } from "@/types/roleUser"
import { usePermission } from "@/hooks/usePermission"
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
  Shield,
  Plus,
  RefreshCw,
  Search,
  Users,
  Layers,
  Pencil,
  Trash2,
  Lock,
  CheckCircle2,
  Check,
  X,
  Eye,
  Power,
  PowerOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

type PermAction = "can_view" | "can_add" | "can_edit" | "can_delete" | "can_manage"

const PERM_COLUMNS: Array<{ key: PermAction; label: string }> = [
  { key: "can_view", label: "View" },
  { key: "can_add", label: "Create / Add" },
  { key: "can_edit", label: "Edit" },
  { key: "can_delete", label: "Delete" },
  { key: "can_manage", label: "Manage / Approve" },
]

function generateSlug(name: string): string {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export default function RolesPermissions() {
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)
  const { can, refreshPermissions } = usePermission()

  const canCreateRole = can("roles", "can_add")
  const canEditRole = can("roles", "can_edit")
  const canDeleteRole = can("roles", "can_delete")
  const canManageRole = can("roles", ["can_manage", "can_edit"])
  const canViewUsers = can("sub_admins", "can_view")

  const [roles, setRoles] = useState<SaasRole[]>([])
  const [modules, setModules] = useState<SaasModule[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 10

  // Create / Edit Role Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingRole, setEditingRole] = useState<SaasRole | null>(null)
  const [roleName, setRoleName] = useState<string>("")
  const [roleSlug, setRoleSlug] = useState<string>("")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState<boolean>(false)
  const [roleDescription, setRoleDescription] = useState<string>("")
  const [roleStatus, setRoleStatus] = useState<number>(1)
  const [permissions, setPermissions] = useState<RolePermission[]>([])
  const [loadingRoleDetails, setLoadingRoleDetails] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  // View Role Details Modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false)
  const [viewingRole, setViewingRole] = useState<SaasRole | null>(null)
  const [loadingViewRole, setLoadingViewRole] = useState<boolean>(false)

  // Delete confirmation modal
  const [roleToDelete, setRoleToDelete] = useState<SaasRole | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  const loadData = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const [rolesData, modulesData] = await Promise.all([
        fetchRolesApi(token, {
          search: searchQuery,
          status: statusFilter === "all" ? undefined : statusFilter,
        }),
        fetchModulesApi(token),
      ])
      setRoles(rolesData || [])
      setModules(modulesData || [])
    } catch (err: any) {
      console.error("Failed to fetch roles/modules:", err)
      toast.error(err?.message || "Failed to load roles and permissions.")
    } finally {
      setLoading(false)
    }
  }, [token, searchQuery, statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const buildEmptyPermissions = useCallback((mods: SaasModule[]): RolePermission[] => {
    return mods.map((m) => ({
      module_key: m.module_key,
      module_name: m.module_name,
      description: m.description,
      can_view: 0,
      can_add: 0,
      can_edit: 0,
      can_delete: 0,
      can_manage: 0,
    }))
  }, [])

  const handleRoleNameChange = (val: string) => {
    setRoleName(val)
    if (!slugManuallyEdited && !editingRole?.is_system) {
      setRoleSlug(generateSlug(val))
    }
  }

  const handleOpenCreate = () => {
    setEditingRole(null)
    setRoleName("")
    setRoleSlug("")
    setSlugManuallyEdited(false)
    setRoleDescription("")
    setRoleStatus(1)
    setPermissions(buildEmptyPermissions(modules))
    setIsModalOpen(true)
  }

  const handleOpenEdit = async (role: SaasRole) => {
    if (!token) return
    setEditingRole(role)
    setRoleName(role.role_name)
    setRoleSlug(role.slug || generateSlug(role.role_name))
    setSlugManuallyEdited(true)
    setRoleDescription(role.description || "")
    setRoleStatus(Number(role.status) === 0 ? 0 : 1)
    setIsModalOpen(true)

    try {
      setLoadingRoleDetails(true)
      const detail = await fetchRoleByIdApi(token, role.id)
      if (detail.permissions && detail.permissions.length > 0) {
        setPermissions(detail.permissions)
      } else {
        setPermissions(buildEmptyPermissions(modules))
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not load role permissions.")
      setPermissions(buildEmptyPermissions(modules))
    } finally {
      setLoadingRoleDetails(false)
    }
  }

  const handleOpenView = async (role: SaasRole) => {
    if (!token) return
    setViewingRole(role)
    setIsViewModalOpen(true)
    try {
      setLoadingViewRole(true)
      const detail = await fetchRoleByIdApi(token, role.id)
      setViewingRole(detail)
    } catch (err: any) {
      toast.error(err?.message || "Could not load role details.")
    } finally {
      setLoadingViewRole(false)
    }
  }

  const handleToggleStatus = async (role: SaasRole) => {
    if (!token) return
    if (Number(role.is_system) === 1) {
      toast.error("Protected system roles cannot be deactivated.")
      return
    }
    const nextStatus = Number(role.status) === 1 ? 0 : 1
    try {
      await toggleRoleStatusApi(token, role.id, nextStatus)
      toast.success(
        `Role "${role.role_name}" ${nextStatus === 1 ? "activated" : "deactivated"} successfully.`
      )
      loadData()
      refreshPermissions()
    } catch (err: any) {
      toast.error(err?.message || "Failed to update role status.")
    }
  }

  const togglePermissionCell = (moduleKey: string, action: PermAction) => {
    if (editingRole && Number(editingRole.is_system) === 1) return
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module_key !== moduleKey) return p
        const nextVal = p[action] ? 0 : 1
        // If unchecking can_view, clear dependent action permissions on this module
        if (action === "can_view" && nextVal === 0) {
          return {
            ...p,
            can_view: 0,
            can_add: 0,
            can_edit: 0,
            can_delete: 0,
            can_manage: 0,
          }
        }
        // If enabling add/edit/delete/manage, auto-enable view
        const autoView = action !== "can_view" && nextVal === 1 ? 1 : p.can_view
        return {
          ...p,
          [action]: nextVal,
          can_view: action === "can_view" ? nextVal : autoView,
        }
      })
    )
  }

  const toggleModuleRowAll = (moduleKey: string) => {
    if (editingRole && Number(editingRole.is_system) === 1) return
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module_key !== moduleKey) return p
        const allChecked =
          p.can_view && p.can_add && p.can_edit && p.can_delete && p.can_manage
        const target = allChecked ? 0 : 1
        return {
          ...p,
          can_view: target,
          can_add: target,
          can_edit: target,
          can_delete: target,
          can_manage: target,
        }
      })
    )
  }

  const toggleColumnAll = (action: PermAction) => {
    if (editingRole && Number(editingRole.is_system) === 1) return
    setPermissions((prev) => {
      const allColChecked = prev.length > 0 && prev.every((p) => Boolean(p[action]))
      const nextVal = allColChecked ? 0 : 1
      return prev.map((p) => {
        if (action === "can_view" && nextVal === 0) {
          return {
            ...p,
            can_view: 0,
            can_add: 0,
            can_edit: 0,
            can_delete: 0,
            can_manage: 0,
          }
        }
        const autoView = action !== "can_view" && nextVal === 1 ? 1 : p.can_view
        return {
          ...p,
          [action]: nextVal,
          can_view: action === "can_view" ? nextVal : autoView,
        }
      })
    })
  }

  const handleGrantAll = (val: 0 | 1) => {
    if (editingRole && Number(editingRole.is_system) === 1) return
    setPermissions((prev) =>
      prev.map((p) => ({
        ...p,
        can_view: val,
        can_add: val,
        can_edit: val,
        can_delete: val,
        can_manage: val,
      }))
    )
  }

  const handleSaveRole = async () => {
    if (!token) return
    if (!roleName.trim()) {
      toast.error("Role name is required.")
      return
    }

    try {
      setIsSaving(true)
      const finalSlug = roleSlug.trim() ? generateSlug(roleSlug) : generateSlug(roleName)
      if (editingRole) {
        await updateRoleApi(token, editingRole.id, {
          role_name: editingRole.is_system ? undefined : roleName.trim(),
          slug: editingRole.is_system ? undefined : finalSlug,
          description: roleDescription.trim(),
          status: editingRole.is_system ? 1 : roleStatus,
          permissions,
        })
        toast.success(`Role "${roleName.trim()}" updated successfully.`)
      } else {
        await createRoleApi(token, {
          role_name: roleName.trim(),
          slug: finalSlug,
          description: roleDescription.trim(),
          status: roleStatus,
          permissions,
        })
        toast.success(`Role "${roleName.trim()}" created successfully.`)
      }
      setIsModalOpen(false)
      loadData()
      refreshPermissions()
    } catch (err: any) {
      toast.error(err?.message || "Failed to save role.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!token || !roleToDelete) return
    try {
      setIsDeleting(true)
      await deleteRoleApi(token, roleToDelete.id)
      toast.success(`Role "${roleToDelete.role_name}" deleted successfully.`)
      setIsDeleteOpen(false)
      setRoleToDelete(null)
      loadData()
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete role.")
    } finally {
      setIsDeleting(false)
    }
  }

  // Selected permission counters for the modal
  const permissionSummary = useMemo(() => {
    let selectedActions = 0
    let activeModules = 0
    for (const p of permissions) {
      const rowSum =
        (p.can_view ? 1 : 0) +
        (p.can_add ? 1 : 0) +
        (p.can_edit ? 1 : 0) +
        (p.can_delete ? 1 : 0) +
        (p.can_manage ? 1 : 0)
      selectedActions += rowSum
      if (rowSum > 0) activeModules += 1
    }
    return {
      selectedActions,
      totalPossibleActions: permissions.length * 5,
      activeModules,
      totalModules: permissions.length,
    }
  }, [permissions])

  const totalRoles = roles.length
  const activeRoles = roles.filter((r) => Number(r.status) === 1).length
  const totalAssignedUsers = roles.reduce(
    (sum, r) => sum + Number(r.assigned_users_count || 0),
    0
  )

  const totalPages = Math.max(1, Math.ceil(roles.length / pageSize))
  const paginatedRoles = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return roles.slice(start, start + pageSize)
  }, [roles, currentPage, pageSize])

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Shield className="size-6 text-primary shrink-0" />
            <span>Roles & Permissions</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Define custom roles and granular module permissions for sub-admin users.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 px-3 gap-1.5 cursor-pointer text-xs font-semibold"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          {canViewUsers && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/users")}
              className="h-9 px-3 gap-1.5 cursor-pointer text-xs font-semibold"
            >
              <Users className="size-3.5" />
              <span>Manage Users</span>
            </Button>
          )}
          {canCreateRole && (
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="h-9 px-3.5 gap-1.5 cursor-pointer shadow-xs text-xs font-semibold"
            >
              <Plus className="size-4" />
              <span>Create Role</span>
            </Button>
          )}
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Roles
              </p>
              <div className="text-2xl font-bold tracking-tight">
                {loading ? <Skeleton className="h-7 w-12" /> : totalRoles}
              </div>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Shield className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Roles
              </p>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {loading ? <Skeleton className="h-7 w-12" /> : activeRoles}
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
                Assigned Users
              </p>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                {loading ? <Skeleton className="h-7 w-12" /> : totalAssignedUsers}
              </div>
            </div>
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search roles by name, slug, or description..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            {(["all", "1", "0"] as const).map((tab) => (
              <Button
                key={tab}
                variant={statusFilter === tab ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStatusFilter(tab)
                  setCurrentPage(1)
                }}
                className="h-8 text-xs cursor-pointer"
              >
                {tab === "all" ? "All Roles" : tab === "1" ? "Active" : "Inactive"}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card className="border border-border/80 shadow-xs py-0 gap-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Role Name & Slug</th>
                <th className="px-5 py-3.5 font-semibold">Description</th>
                <th className="px-5 py-3.5 font-semibold text-center">Type</th>
                <th className="px-5 py-3.5 font-semibold text-center">Modules Enabled</th>
                <th className="px-5 py-3.5 font-semibold text-center">Assigned Users</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-4">
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))
              ) : paginatedRoles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    No roles found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <Shield className="size-4 text-primary shrink-0" />
                        <span>{role.role_name}</span>
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground pl-6">
                        {role.slug || generateSlug(role.role_name)}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground max-w-xs truncate">
                      {role.description || "—"}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {Number(role.is_system) === 1 ? (
                        <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30 gap-1">
                          <Lock className="size-3" /> System
                        </Badge>
                      ) : (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-muted px-2.5 py-1 rounded-md">
                        <Layers className="size-3.5 text-muted-foreground" />
                        {Number(role.is_system) === 1
                          ? `All (${modules.length || 12})`
                          : `${role.active_modules_count || 0} / ${modules.length || 12}`}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold">
                        <Users className="size-3.5 text-muted-foreground" />
                        {role.assigned_users_count || 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Badge
                        className={
                          Number(role.status) === 1
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                        }
                      >
                        {Number(role.status) === 1 ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenView(role)}
                          className="size-8 cursor-pointer"
                          title="View Role Details & Permissions"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        {canEditRole && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(role)}
                            className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
                          >
                            <Pencil className="size-3.5" />
                            <span>Permissions</span>
                          </Button>
                        )}
                        {Number(role.is_system) !== 1 && canManageRole && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleToggleStatus(role)}
                            className={`size-8 cursor-pointer ${
                              Number(role.status) === 1
                                ? "text-amber-600 hover:text-amber-700"
                                : "text-emerald-600 hover:text-emerald-700"
                            }`}
                            title={Number(role.status) === 1 ? "Deactivate Role" : "Activate Role"}
                          >
                            {Number(role.status) === 1 ? (
                              <PowerOff className="size-3.5" />
                            ) : (
                              <Power className="size-3.5" />
                            )}
                          </Button>
                        )}
                        {Number(role.is_system) !== 1 && canDeleteRole && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setRoleToDelete(role)
                              setIsDeleteOpen(true)
                            }}
                            className="size-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                            title="Delete Role"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
            <span>
              Page {currentPage} of {totalPages} ({roles.length} total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 gap-1 cursor-pointer"
              >
                <ChevronLeft className="size-3.5" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-2.5 gap-1 cursor-pointer"
              >
                Next <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create / Edit Role & Permissions Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Shield className="size-5 text-primary" />
              {editingRole ? `Edit Role: ${editingRole.role_name}` : "Create New Role"}
            </DialogTitle>
            <DialogDescription>
              Configure role details and assign module-level permissions (View, Create/Add, Edit, Delete, Manage/Approve).
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Role Details Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="role-name">Role Name *</Label>
                <Input
                  id="role-name"
                  value={roleName}
                  onChange={(e) => handleRoleNameChange(e.target.value)}
                  placeholder="e.g., Support Manager"
                  disabled={Boolean(editingRole?.is_system)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role-slug">Role Slug</Label>
                <Input
                  id="role-slug"
                  value={roleSlug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true)
                    setRoleSlug(generateSlug(e.target.value))
                  }}
                  placeholder="e.g., support_manager"
                  disabled={Boolean(editingRole?.is_system)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role-desc">Description</Label>
                <Input
                  id="role-desc"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="Brief description of responsibilities"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role-status">Status</Label>
                <select
                  id="role-status"
                  value={roleStatus}
                  onChange={(e) => setRoleStatus(Number(e.target.value))}
                  disabled={Boolean(editingRole?.is_system)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            </div>

            {Boolean(editingRole?.is_system) && (
              <div className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3.5 py-2.5 text-xs text-violet-700 dark:text-violet-300">
                <Lock className="size-4 shrink-0" />
                <span>
                  This is a protected System Role with full unrestricted platform access. Its permissions cannot be restricted.
                </span>
              </div>
            )}

            {/* Module Permissions Matrix */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2.5">
                    <h4 className="text-sm font-semibold">Module Permissions Matrix</h4>
                    <Badge variant="outline" className="text-[11px] font-semibold">
                      {permissionSummary.selectedActions} / {permissionSummary.totalPossibleActions} Permissions Selected ({permissionSummary.activeModules} / {permissionSummary.totalModules} Modules)
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Check the actions this role is allowed to perform on each module. Enabling Create, Edit, Delete, or Manage automatically enables View.
                  </p>
                </div>
                {!editingRole?.is_system && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGrantAll(1)}
                      className="h-7 text-xs gap-1 cursor-pointer"
                    >
                      <Check className="size-3.5 text-emerald-600" /> Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGrantAll(0)}
                      className="h-7 text-xs gap-1 cursor-pointer"
                    >
                      <X className="size-3.5 text-rose-600" /> Clear All
                    </Button>
                  </div>
                )}
              </div>

              {loadingRoleDetails ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((n) => (
                    <Skeleton key={n} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="border border-border/80 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border/60">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Module</th>
                        {PERM_COLUMNS.map((col) => {
                          const allColChecked =
                            permissions.length > 0 &&
                            permissions.every((p) => Boolean(p[col.key]))
                          return (
                            <th key={col.key} className="px-3 py-3 font-semibold text-center">
                              <button
                                type="button"
                                onClick={() => toggleColumnAll(col.key)}
                                disabled={Boolean(editingRole?.is_system)}
                                className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer disabled:cursor-default"
                                title={`Toggle all ${col.label}`}
                              >
                                <span>{col.label}</span>
                                {allColChecked && (
                                  <Check className="size-3 text-primary" />
                                )}
                              </button>
                            </th>
                          )
                        })}
                        <th className="px-3 py-3 font-semibold text-center">Module All</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {permissions.map((perm) => {
                        const allChecked = Boolean(
                          perm.can_view &&
                            perm.can_add &&
                            perm.can_edit &&
                            perm.can_delete &&
                            perm.can_manage
                        )
                        return (
                          <tr key={perm.module_key} className="hover:bg-muted/30">
                            <td className="px-4 py-2.5">
                              <div className="font-medium text-foreground">
                                {perm.module_name || perm.module_key}
                              </div>
                              {perm.description && (
                                <div className="text-[11px] text-muted-foreground">
                                  {perm.description}
                                </div>
                              )}
                            </td>
                            {PERM_COLUMNS.map((col) => (
                              <td key={col.key} className="px-3 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={Boolean(perm[col.key])}
                                  disabled={Boolean(editingRole?.is_system)}
                                  onChange={() => togglePermissionCell(perm.module_key, col.key)}
                                  className="size-4 rounded border-input accent-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                              </td>
                            ))}
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                disabled={Boolean(editingRole?.is_system)}
                                onChange={() => toggleModuleRowAll(perm.module_key)}
                                className="size-4 rounded border-input accent-primary cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={isSaving || loadingRoleDetails}
              className="cursor-pointer"
            >
              {isSaving ? "Saving..." : editingRole ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Role Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Shield className="size-5 text-primary" />
              Role Details: {viewingRole?.role_name}
            </DialogTitle>
            <DialogDescription>
              Assigned module permissions and configuration for this role.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {viewingRole && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/40 border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block">Role Name</span>
                  <span className="font-semibold text-foreground text-sm">
                    {viewingRole.role_name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Slug</span>
                  <span className="font-mono font-medium text-foreground">
                    {viewingRole.slug || generateSlug(viewingRole.role_name)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Assigned Users</span>
                  <span className="font-semibold text-foreground">
                    {viewingRole.assigned_users_count || 0} user(s)
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Status</span>
                  <Badge
                    className={
                      Number(viewingRole.status) === 1
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 mt-0.5"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 mt-0.5"
                    }
                  >
                    {Number(viewingRole.status) === 1 ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {viewingRole.description && (
                  <div className="sm:col-span-4 pt-1 border-t border-border/50">
                    <span className="text-muted-foreground block">Description</span>
                    <span className="text-foreground">{viewingRole.description}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned Module Permissions
              </h4>
              {loadingViewRole ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : (
                <div className="border border-border/80 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="uppercase bg-muted/50 text-muted-foreground border-b border-border/60">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Module</th>
                        {PERM_COLUMNS.map((col) => (
                          <th key={col.key} className="px-3 py-2.5 text-center font-semibold">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(viewingRole?.permissions || []).map((p) => (
                        <tr key={p.module_key}>
                          <td className="px-4 py-2.5 font-medium text-foreground">
                            {p.module_name || p.module_key}
                          </td>
                          {PERM_COLUMNS.map((col) => (
                            <td key={col.key} className="px-3 py-2.5 text-center">
                              {p[col.key] ? (
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
              onClick={() => setIsViewModalOpen(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
            {canEditRole && viewingRole && (
              <Button
                onClick={() => {
                  const target = viewingRole
                  setIsViewModalOpen(false)
                  handleOpenEdit(target)
                }}
                className="gap-1.5 cursor-pointer"
              >
                <Pencil className="size-3.5" />
                Edit Permissions
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role{" "}
              <span className="font-semibold text-foreground">
                "{roleToDelete?.role_name}"
              </span>
              ? Roles assigned to active users cannot be deleted until those users are reassigned.
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
              {isDeleting ? "Deleting..." : "Delete Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
