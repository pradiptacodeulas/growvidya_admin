import { useEffect } from "react"
import { Provider } from "react-redux"
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router"
import { store, useAppDispatch, useAppSelector } from "@/store/store"
import { fetchAdminProfile } from "@/store/authSlice"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/AppSidebar"
import { ProfileDropdown } from "@/components/ProfileDropdown"
import { NotificationDropdown } from "@/components/NotificationDropdown"
import { RoutePermissionGuard } from "@/components/PermissionGuard"
import { usePermission } from "@/hooks/usePermission"
import { toast } from "sonner"
import {
  getNotificationPermission,
  playNotificationChime,
  registerSaasServiceWorker,
  subscribeSaasWebPush,
} from "@/services/webPushService"
import { Loader2 } from "lucide-react"

// Pages
import Login from "@/pages/Login"
import Overview from "@/pages/Overview"
import Subscriptions from "@/pages/Subscriptions"
import SubscriptionDetails from "@/pages/SubscriptionDetails"
import Coupons from "@/pages/Coupons"
import CreateCoupon from "@/pages/CreateCoupon"
import EditCoupon from "@/pages/EditCoupon"
import CouponDetails from "@/pages/CouponDetails"
import BankAccounts from "@/pages/BankAccounts"
import CreateBankAccount from "@/pages/CreateBankAccount"
import EditBankAccount from "@/pages/EditBankAccount"
import BankAccountDetails from "@/pages/BankAccountDetails"
import AttendanceMachines from "@/pages/AttendanceMachines"
import AttendanceMachineBuyers from "@/pages/AttendanceMachineBuyers"
import CreateAttendanceMachine from "@/pages/CreateAttendanceMachine"
import EditAttendanceMachine from "@/pages/EditAttendanceMachine"
import AttendanceMachineDetails from "@/pages/AttendanceMachineDetails"
import RfidCards from "@/pages/RfidCards"
import RfidCardBuyers from "@/pages/RfidCardBuyers"
import CreateRfidCard from "@/pages/CreateRfidCard"
import EditRfidCard from "@/pages/EditRfidCard"
import StoragePlans from "@/pages/StoragePlans"
import StoragePlanBuyers from "@/pages/StoragePlanBuyers"
import CreateStoragePlan from "@/pages/CreateStoragePlan"
import EditStoragePlan from "@/pages/EditStoragePlan"

import PlansPricing from "@/pages/PlansPricing"
import CreatePackage from "@/pages/CreatePackage"
import EditPackage from "@/pages/EditPackage"
import PackageItems from "@/pages/PackageItems"
import RolesPermissions from "@/pages/RolesPermissions"
import SubAdmins from "@/pages/SubAdmins"
import SupportTickets from "@/pages/SupportTickets"
import SupportTicketDetails from "@/pages/SupportTicketDetails"
import PaymentGatewaySettings from "@/pages/PaymentGatewaySettings"
import EmailDeliverySettings from "@/pages/EmailDeliverySettings"
import Profile from "@/pages/Profile"
import EditProfile from "@/pages/EditProfile"
import { Toaster } from "@/components/ui/sonner"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const { isLoadingPermissions, getFirstAccessibleRoute } = usePermission()

  if (isAuthenticated) {
    if (isLoadingPermissions) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      )
    }
    return <Navigate to={getFirstAccessibleRoute()} replace />
  }
  return <>{children}</>
}

function DefaultRouteRedirect() {
  const { isLoadingPermissions, getFirstAccessibleRoute } = usePermission()
  if (isLoadingPermissions) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    )
  }
  return <Navigate to={getFirstAccessibleRoute()} replace />
}

function SettingsRedirect() {
  const { can, getFirstAccessibleRoute, isLoadingPermissions } = usePermission()
  if (isLoadingPermissions) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    )
  }
  if (can("payment_gateway", "can_view")) {
    return <Navigate to="/settings/payment-gateway" replace />
  }
  if (can("email_delivery", "can_view") || can("email_settings", "can_view")) {
    return <Navigate to="/settings/email-delivery" replace />
  }
  return <Navigate to={getFirstAccessibleRoute()} replace />
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const token = useAppSelector((state) => state.auth.token)

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchAdminProfile())
    }
  }, [dispatch, isAuthenticated])

  // Register Service Worker & Web Push subscription for SaaS Admin
  useEffect(() => {
    if (!isAuthenticated || !token) return
    const perm = getNotificationPermission()
    if (perm === "granted") {
      subscribeSaasWebPush(token, false).catch(() => { })
    } else {
      registerSaasServiceWorker().catch(() => { })
    }

    if ("serviceWorker" in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data?.type === "GROWVIDYA_SAAS_PUSH_RECEIVED") {
          const payload = event.data.payload
          const targetUrl = payload?.data?.url
          playNotificationChime()
          toast.info(payload?.title || "Support Notification", {
            description: payload?.body || "",
            action: targetUrl
              ? {
                label: "View",
                onClick: () => navigate(targetUrl),
              }
              : undefined,
          })
          window.dispatchEvent(
            new CustomEvent("growvidya:saas_support_ticket_push", { detail: payload })
          )
        }
      }
      navigator.serviceWorker.addEventListener("message", handleSwMessage)
      return () => navigator.serviceWorker.removeEventListener("message", handleSwMessage)
    }
  }, [isAuthenticated, token, navigate])

  // Keep effective permissions synchronized when window regains focus
  useEffect(() => {
    if (!isAuthenticated) return
    const handleFocus = () => {
      dispatch(fetchAdminProfile())
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [dispatch, isAuthenticated])

  const getPageTitle = (pathname: string) => {
    if (pathname.startsWith("/subscriptions/") || pathname.startsWith("/schools-subscriptions/")) {
      return "Subscription Details"
    }
    if (pathname === "/coupons/create") {
      return "Create Coupon"
    }
    if (pathname.includes("/coupons") && pathname.includes("/edit")) {
      return "Edit Coupon"
    }
    if (pathname.startsWith("/coupons/")) {
      return "Coupon Details"
    }
    if (pathname.startsWith("/support-tickets/")) {
      return "Support Ticket Details"
    }
    if (pathname.startsWith("/bank-accounts/") && !pathname.includes("/create") && !pathname.includes("/edit")) {
      return "Bank Account Details"
    }
    if (pathname === "/bank-accounts/create") {
      return "Add New Bank Account"
    }
    if (pathname.includes("/bank-accounts") && pathname.includes("/edit")) {
      return "Edit Bank Account"
    }
    if (pathname === "/attendance-machines/buyers") {
      return "Attendance Machine Buyers"
    }
    if (pathname.startsWith("/attendance-machines/") && !pathname.includes("/create") && !pathname.includes("/edit")) {
      return "Attendance Machine Details"
    }
    if (pathname === "/attendance-machines/create") {
      return "Add New Attendance Machine"
    }
    if (pathname.includes("/attendance-machines") && pathname.includes("/edit")) {
      return "Edit Attendance Machine"
    }
    if (pathname === "/rfid-cards/buyers") {
      return "RFID Card Buyers"
    }
    if (pathname === "/rfid-cards/create") {
      return "Add New RFID Card"
    }
    if (pathname.includes("/rfid-cards") && pathname.includes("/edit")) {
      return "Edit RFID Card"
    }
    if (pathname === "/storage-plans/buyers") {
      return "Storage Plan Buyers"
    }
    if (pathname === "/storage-plans/create") {
      return "Add New Storage Plan"
    }
    if (pathname.includes("/storage-plans") && pathname.includes("/edit")) {
      return "Edit Storage Plan"
    }
    if (pathname.includes("/packages/create") || pathname.includes("/plans-pricing/create")) {
      return "Create Package"
    }
    if (pathname.includes("/edit") && (pathname.includes("/packages") || pathname.includes("/plans-pricing"))) {
      return "Edit Package"
    }
    if (pathname.includes("/items") && (pathname.includes("/packages") || pathname.includes("/plans-pricing"))) {
      return "Features & Add-ons"
    }
    switch (pathname) {
      case "/overview":
        return "Overview"
      case "/subscriptions":
      case "/schools-subscriptions":
        return "Plan Approvals & Subscriptions"
      case "/plans-pricing":
      case "/packages":
      case "/saas-admin/packages":
        return "Packages & Pricing"
      case "/attendance-machines":
        return "Manage Attendance Machines"
      case "/rfid-cards":
        return "Manage RFID Cards"
      case "/storage-plans":
        return "Manage Storage Plans"
      case "/coupons":
        return "Coupons"
      case "/bank-accounts":
        return "Bank Accounts"
      case "/support-tickets":
        return "Help & Support Tickets"
      case "/roles":
      case "/roles-permissions":
        return "Roles & Permissions"
      case "/users":
      case "/sub-admins":
        return "Users & Sub-Admins"
      case "/profile":
        return "Admin Profile"
      case "/profile/edit":
        return "Edit Profile"
      case "/settings":
      case "/settings/payment-gateway":
        return "Settings — Payment Gateway"
      case "/settings/email-delivery":
      case "/settings/email":
      case "/settings/smtp":
      case "/settings/email-smtp":
        return "Settings — Email Delivery"
      default:
        return "Dashboard"
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col min-w-0">
          <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6 bg-background/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="h-4 w-px bg-border/60" />
              <span className="text-sm font-semibold text-foreground">
                {getPageTitle(location.pathname)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <NotificationDropdown />
              <ProfileDropdown />
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background min-w-0">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Routes>
                <Route path="/" element={<DefaultRouteRedirect />} />
                <Route
                  path="/overview"
                  element={
                    <RoutePermissionGuard module="dashboard" action="can_view">
                      <Overview />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/subscriptions"
                  element={
                    <RoutePermissionGuard module={["subscriptions", "schools"]} action="can_view">
                      <Subscriptions />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/subscriptions/:id"
                  element={
                    <RoutePermissionGuard module={["subscriptions", "schools"]} action="can_view">
                      <SubscriptionDetails />
                    </RoutePermissionGuard>
                  }
                />
                <Route path="/schools-subscriptions" element={<Navigate to="/subscriptions" replace />} />
                <Route
                  path="/schools-subscriptions/:id"
                  element={
                    <RoutePermissionGuard module={["subscriptions", "schools"]} action="can_view">
                      <SubscriptionDetails />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/attendance-machines"
                  element={
                    <RoutePermissionGuard module="attendance_machines" action="can_view">
                      <AttendanceMachines />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/attendance-machines/buyers"
                  element={
                    <RoutePermissionGuard module="machines_buyers" action="can_view">
                      <AttendanceMachineBuyers />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/attendance-machines/create"
                  element={
                    <RoutePermissionGuard module="attendance_machines" action="can_add">
                      <CreateAttendanceMachine />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/attendance-machines/:id"
                  element={
                    <RoutePermissionGuard module="attendance_machines" action="can_view">
                      <AttendanceMachineDetails />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/attendance-machines/:id/edit"
                  element={
                    <RoutePermissionGuard module="attendance_machines" action="can_edit">
                      <EditAttendanceMachine />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/attendance-machines/edit/:id"
                  element={
                    <RoutePermissionGuard module="attendance_machines" action="can_edit">
                      <EditAttendanceMachine />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/rfid-cards"
                  element={
                    <RoutePermissionGuard module="rfid_cards" action="can_view">
                      <RfidCards />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/rfid-cards/buyers"
                  element={
                    <RoutePermissionGuard module="rfid_buyers" action="can_view">
                      <RfidCardBuyers />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/rfid-cards/create"
                  element={
                    <RoutePermissionGuard module="rfid_cards" action="can_add">
                      <CreateRfidCard />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/rfid-cards/:id/edit"
                  element={
                    <RoutePermissionGuard module="rfid_cards" action="can_edit">
                      <EditRfidCard />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/rfid-cards/edit/:id"
                  element={
                    <RoutePermissionGuard module="rfid_cards" action="can_edit">
                      <EditRfidCard />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/storage-plans"
                  element={
                    <RoutePermissionGuard module="storage_plans" action="can_view">
                      <StoragePlans />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/storage-plans/buyers"
                  element={
                    <RoutePermissionGuard module="storage_buyers" action="can_view">
                      <StoragePlanBuyers />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/storage-plans/create"
                  element={
                    <RoutePermissionGuard module="storage_plans" action="can_add">
                      <CreateStoragePlan />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/storage-plans/:id/edit"
                  element={
                    <RoutePermissionGuard module="storage_plans" action="can_edit">
                      <EditStoragePlan />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/storage-plans/edit/:id"
                  element={
                    <RoutePermissionGuard module="storage_plans" action="can_edit">
                      <EditStoragePlan />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/coupons"
                  element={
                    <RoutePermissionGuard module="coupons" action="can_view">
                      <Coupons />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/coupons/create"
                  element={
                    <RoutePermissionGuard module="coupons" action="can_add">
                      <CreateCoupon />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/coupons/:id"
                  element={
                    <RoutePermissionGuard module="coupons" action="can_view">
                      <CouponDetails />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/coupons/:id/edit"
                  element={
                    <RoutePermissionGuard module="coupons" action="can_edit">
                      <EditCoupon />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/coupons/edit/:id"
                  element={
                    <RoutePermissionGuard module="coupons" action="can_edit">
                      <EditCoupon />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/bank-accounts"
                  element={
                    <RoutePermissionGuard module="bank_accounts" action="can_view">
                      <BankAccounts />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/bank-accounts/create"
                  element={
                    <RoutePermissionGuard module="bank_accounts" action="can_add">
                      <CreateBankAccount />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/bank-accounts/:id"
                  element={
                    <RoutePermissionGuard module="bank_accounts" action="can_view">
                      <BankAccountDetails />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/bank-accounts/:id/edit"
                  element={
                    <RoutePermissionGuard module="bank_accounts" action="can_edit">
                      <EditBankAccount />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/bank-accounts/edit/:id"
                  element={
                    <RoutePermissionGuard module="bank_accounts" action="can_edit">
                      <EditBankAccount />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/support-tickets"
                  element={
                    <RoutePermissionGuard module="support_tickets" action="can_view">
                      <SupportTickets />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/support-tickets/:id"
                  element={
                    <RoutePermissionGuard module="support_tickets" action="can_view">
                      <SupportTicketDetails />
                    </RoutePermissionGuard>
                  }
                />

                <Route
                  path="/plans-pricing"
                  element={
                    <RoutePermissionGuard module="packages" action="can_view">
                      <PlansPricing />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/plans-pricing/create"
                  element={
                    <RoutePermissionGuard module="packages" action="can_add">
                      <CreatePackage />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/plans-pricing/:id/edit"
                  element={
                    <RoutePermissionGuard module="packages" action="can_edit">
                      <EditPackage />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/plans-pricing/edit/:id"
                  element={
                    <RoutePermissionGuard module="packages" action="can_edit">
                      <EditPackage />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/plans-pricing/:id/items"
                  element={
                    <RoutePermissionGuard module="packages" action="can_view">
                      <PackageItems />
                    </RoutePermissionGuard>
                  }
                />

                <Route
                  path="/packages"
                  element={
                    <RoutePermissionGuard module="packages" action="can_view">
                      <PlansPricing />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/packages/create"
                  element={
                    <RoutePermissionGuard module="packages" action="can_add">
                      <CreatePackage />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/packages/:id/edit"
                  element={
                    <RoutePermissionGuard module="packages" action="can_edit">
                      <EditPackage />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/packages/edit/:id"
                  element={
                    <RoutePermissionGuard module="packages" action="can_edit">
                      <EditPackage />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/packages/:id/items"
                  element={
                    <RoutePermissionGuard module="packages" action="can_view">
                      <PackageItems />
                    </RoutePermissionGuard>
                  }
                />

                <Route
                  path="/saas-admin/packages"
                  element={
                    <RoutePermissionGuard module="packages" action="can_view">
                      <PlansPricing />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/roles"
                  element={
                    <RoutePermissionGuard module="roles" action="can_view">
                      <RolesPermissions />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/roles-permissions"
                  element={
                    <RoutePermissionGuard module="roles" action="can_view">
                      <RolesPermissions />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <RoutePermissionGuard module="sub_admins" action="can_view">
                      <SubAdmins />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/sub-admins"
                  element={
                    <RoutePermissionGuard module="sub_admins" action="can_view">
                      <SubAdmins />
                    </RoutePermissionGuard>
                  }
                />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/edit" element={<EditProfile />} />

                <Route path="/settings" element={<SettingsRedirect />} />
                <Route
                  path="/settings/payment-gateway"
                  element={
                    <RoutePermissionGuard module="payment_gateway" action="can_view">
                      <PaymentGatewaySettings />
                    </RoutePermissionGuard>
                  }
                />
                <Route
                  path="/settings/email-delivery"
                  element={
                    <RoutePermissionGuard module={["email_delivery", "email_settings"]} action="can_view">
                      <EmailDeliverySettings />
                    </RoutePermissionGuard>
                  }
                />
                <Route path="/settings/email" element={<Navigate to="/settings/email-delivery" replace />} />
                <Route path="/settings/smtp" element={<Navigate to="/settings/email-delivery" replace />} />
                <Route path="/settings/email-smtp" element={<Navigate to="/settings/email-delivery" replace />} />
                <Route path="*" element={<DefaultRouteRedirect />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <TooltipProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </TooltipProvider>
    </Provider>
  )
}
