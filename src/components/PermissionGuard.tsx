import React from "react"
import { useNavigate } from "react-router"
import { usePermission, type PermissionAction } from "@/hooks/usePermission"
import { Button } from "@/components/ui/button"
import { ShieldAlert, ArrowLeft, Loader2 } from "lucide-react"

interface PermissionGuardProps {
  /** Module key(s) such as 'coupons', 'roles', or ['subscriptions', 'schools'] */
  module?: string | string[]
  /** Action permission(s) such as 'can_view', 'can_add', 'can_edit', 'can_delete', 'can_manage' */
  action?: PermissionAction | PermissionAction[]
  /** Optional dot-notation permission such as 'coupons.create' */
  permission?: string
  /** Optional fallback element when user lacks permission */
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGuard({
  module,
  action = "can_view",
  permission,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission } = usePermission()
  
  const target = permission || module
  
  if (!target) {
    return <>{children}</>
  }

  const allowed = hasPermission(target, action)
  if (!allowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface RoutePermissionGuardProps {
  module: string | string[]
  action?: PermissionAction | PermissionAction[]
  children: React.ReactNode
}

export function RoutePermissionGuard({
  module,
  action = "can_view",
  children,
}: RoutePermissionGuardProps) {
  const navigate = useNavigate()
  const { can, isLoadingPermissions, getFirstAccessibleRoute } = usePermission()

  if (isLoadingPermissions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-3 text-muted-foreground">
        <Loader2 className="size-7 animate-spin text-primary" />
        <p className="text-sm font-medium">Verifying access permissions...</p>
      </div>
    )
  }

  const allowed = can(module, action)
  if (!allowed) {
    const safeRoute = getFirstAccessibleRoute()
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
        <div className="max-w-md w-full rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm space-y-5">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
            <ShieldAlert className="size-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Access Restricted
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You do not have the required role permissions to view or perform actions on this module. Please contact your Super Administrator if you need access.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(safeRoute, { replace: true })}
              className="gap-2"
            >
              <ArrowLeft className="size-4" />
              Go to Permitted Area
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
