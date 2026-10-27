import { useCallback, useMemo } from "react"
import { useAppDispatch, useAppSelector } from "@/store/store"
import { fetchAdminProfile } from "@/store/authSlice"
import type { PermissionItem } from "@/types/auth"

export type PermissionAction =
  | "can_view"
  | "can_add"
  | "can_edit"
  | "can_delete"
  | "can_manage"
  | "view"
  | "create"
  | "add"
  | "edit"
  | "update"
  | "delete"
  | "manage"
  | "approve"

export function normalizeAction(action: PermissionAction = "can_view"): keyof Pick<
  PermissionItem,
  "can_view" | "can_add" | "can_edit" | "can_delete" | "can_manage"
> {
  switch (action) {
    case "can_view":
    case "view":
      return "can_view"
    case "can_add":
    case "create":
    case "add":
      return "can_add"
    case "can_edit":
    case "edit":
    case "update":
      return "can_edit"
    case "can_delete":
    case "delete":
      return "can_delete"
    case "can_manage":
    case "manage":
    case "approve":
      return "can_manage"
    default:
      return "can_view"
  }
}

export function checkUserPermission(
  role: string | undefined | null,
  permissions: PermissionItem[] | undefined | null,
  moduleOrPermission: string | string[],
  action: PermissionAction | PermissionAction[] = "can_view"
): boolean {
  if (role === "superadmin") {
    return true
  }

  if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
    return false
  }

  // Support dot notation like 'coupons.create', 'roles.view', 'payment_gateway.view', 'payment_gateway.update'
  if (typeof moduleOrPermission === "string" && moduleOrPermission.includes(".")) {
    const [modPart, actPart] = moduleOrPermission.split(".")
    return checkUserPermission(role, permissions, modPart, (actPart as PermissionAction) || "can_view")
  }

  const moduleKeys = Array.isArray(moduleOrPermission) ? moduleOrPermission : [moduleOrPermission]
  const actions = Array.isArray(action) ? action : [action]

  for (const modKey of moduleKeys) {
    const perm = permissions.find(
      (p) =>
        p.module_key === modKey ||
        (modKey === "email_delivery" && p.module_key === "email_settings") ||
        (modKey === "email_settings" && p.module_key === "email_delivery")
    )
    if (!perm) continue

    for (const act of actions) {
      const col = normalizeAction(act)
      if (col === "can_view") {
        if (
          Number(perm.can_view) === 1 ||
          Number(perm.can_add) === 1 ||
          Number(perm.can_edit) === 1 ||
          Number(perm.can_delete) === 1 ||
          Number(perm.can_manage) === 1
        ) {
          return true
        }
      } else if (col === "can_edit") {
        // Can edit or update if can_edit = 1, can_manage = 1, or can_add = 1
        if (
          Number(perm.can_edit) === 1 ||
          Number(perm.can_manage) === 1 ||
          Number(perm.can_add) === 1
        ) {
          return true
        }
      } else if (Number(perm[col]) === 1) {
        return true
      }
    }
  }

  return false
}

const ROUTE_PRIORITY: Array<{ path: string; modules: string | string[] }> = [
  { path: "/overview", modules: "dashboard" },
  { path: "/subscriptions", modules: ["subscriptions", "schools"] },
  { path: "/plans-pricing", modules: "packages" },
  { path: "/attendance-machines", modules: "attendance_machines" },
  { path: "/rfid-cards", modules: "rfid_cards" },
  { path: "/storage-plans", modules: "storage_plans" },
  { path: "/coupons", modules: "coupons" },
  { path: "/bank-accounts", modules: "bank_accounts" },
  { path: "/support-tickets", modules: "support_tickets" },
  { path: "/roles", modules: "roles" },
  { path: "/users", modules: "sub_admins" },
  { path: "/settings/payment-gateway", modules: "payment_gateway" },
  { path: "/settings/email-delivery", modules: ["email_delivery", "email_settings"] },
]

export function resolveFirstAccessibleRoute(
  role: string | undefined | null,
  permissions: PermissionItem[] | undefined | null
): string {
  if (role === "superadmin") {
    return "/overview"
  }
  for (const item of ROUTE_PRIORITY) {
    if (checkUserPermission(role, permissions, item.modules, "can_view")) {
      return item.path
    }
  }
  return "/profile"
}

export function usePermission() {
  const dispatch = useAppDispatch()
  const { user, profile, isLoadingProfile, isAuthenticated } = useAppSelector((state) => state.auth)

  const effectiveRole = profile?.role || user?.role || null
  const isSuperAdmin = effectiveRole === "superadmin"

  const permissions: PermissionItem[] = useMemo(() => {
    return profile?.permissions || user?.permissions || []
  }, [profile?.permissions, user?.permissions])

  // True while profile/permissions haven't been loaded yet on initial page load
  const isLoadingPermissions = Boolean(
    isAuthenticated && (isLoadingProfile || (!profile && !user))
  )

  const can = useCallback(
    (
      moduleKey: string | string[],
      action: PermissionAction | PermissionAction[] = "can_view"
    ): boolean => {
      return checkUserPermission(effectiveRole, permissions, moduleKey, action)
    },
    [effectiveRole, permissions]
  )

  const hasPermission = useCallback(
    (
      permissionOrModule: string | string[],
      action: PermissionAction | PermissionAction[] = "can_view"
    ): boolean => {
      return checkUserPermission(effectiveRole, permissions, permissionOrModule, action)
    },
    [effectiveRole, permissions]
  )

  const getFirstAccessibleRoute = useCallback((): string => {
    return resolveFirstAccessibleRoute(effectiveRole, permissions)
  }, [effectiveRole, permissions])

  const refreshPermissions = useCallback(() => {
    return dispatch(fetchAdminProfile())
  }, [dispatch])

  return {
    permissions,
    isSuperAdmin,
    isLoadingPermissions,
    can,
    hasPermission,
    getFirstAccessibleRoute,
    refreshPermissions,
  }
}
