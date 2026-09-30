import { useEffect } from "react"
import { Provider } from "react-redux"
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router"
import { store, useAppDispatch, useAppSelector } from "@/store/store"
import { fetchAdminProfile } from "@/store/authSlice"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/AppSidebar"
import { ProfileDropdown } from "@/components/ProfileDropdown"

// Pages
import Login from "@/pages/Login"
import Overview from "@/pages/Overview"
import Subscriptions from "@/pages/Subscriptions"
import Coupons from "@/pages/Coupons"
import CreateCoupon from "@/pages/CreateCoupon"
import EditCoupon from "@/pages/EditCoupon"
import CouponDetails from "@/pages/CouponDetails"
import BillingInvoices from "@/pages/BillingInvoices"
import BankAccounts from "@/pages/BankAccounts"
import CreateBankAccount from "@/pages/CreateBankAccount"
import EditBankAccount from "@/pages/EditBankAccount"
import BankAccountDetails from "@/pages/BankAccountDetails"
import AttendanceMachines from "@/pages/AttendanceMachines"
import RfidCards from "@/pages/RfidCards"

import PlansPricing from "@/pages/PlansPricing"
import CreatePackage from "@/pages/CreatePackage"
import EditPackage from "@/pages/EditPackage"
import PackageItems from "@/pages/PackageItems"
import Reports from "@/pages/Reports"
import Settings from "@/pages/Settings"
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
  if (isAuthenticated) {
    return <Navigate to="/overview" replace />
  }
  return <>{children}</>
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchAdminProfile())
    }
  }, [dispatch, isAuthenticated])

  const getPageTitle = (pathname: string) => {
    if (pathname === "/coupons/create") {
      return "Create Coupon"
    }
    if (pathname.includes("/coupons") && pathname.includes("/edit")) {
      return "Edit Coupon"
    }
    if (pathname.startsWith("/coupons/")) {
      return "Coupon Details"
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
      case "/plans-pricing":
      case "/packages":
      case "/saas-admin/packages":
        return "Plans & Packages"
      case "/attendance-machines":
        return "Attendance Machines"
      case "/rfid-cards":
        return "RFID Cards"
      case "/coupons":
        return "Coupons"
      case "/billing-invoices":
        return "Billing & Invoices"
      case "/bank-accounts":
        return "Bank Accounts"
      case "/reports":
        return "Reports"
      case "/profile":
        return "Admin Profile"
      case "/profile/edit":
        return "Edit Profile"
      case "/settings":
        return "Settings"
      default:
        return "Dashboard"
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6 bg-background/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="h-4 w-px bg-border/60" />
              <span className="text-sm font-semibold text-foreground">
                {getPageTitle(location.pathname)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <ProfileDropdown />
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-background">
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
                <Route path="/" element={<Navigate to="/overview" replace />} />
                <Route path="/overview" element={<Overview />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/schools-subscriptions" element={<Navigate to="/subscriptions" replace />} />
                <Route path="/attendance-machines" element={<AttendanceMachines />} />
                <Route path="/rfid-cards" element={<RfidCards />} />
                <Route path="/coupons" element={<Coupons />} />
                <Route path="/coupons/create" element={<CreateCoupon />} />
                <Route path="/coupons/:id" element={<CouponDetails />} />
                <Route path="/coupons/:id/edit" element={<EditCoupon />} />
                <Route path="/coupons/edit/:id" element={<EditCoupon />} />
                <Route path="/billing-invoices" element={<BillingInvoices />} />
                <Route path="/bank-accounts" element={<BankAccounts />} />
                <Route path="/bank-accounts/create" element={<CreateBankAccount />} />
                <Route path="/bank-accounts/:id" element={<BankAccountDetails />} />
                <Route path="/bank-accounts/:id/edit" element={<EditBankAccount />} />
                <Route path="/bank-accounts/edit/:id" element={<EditBankAccount />} />

                <Route path="/plans-pricing" element={<PlansPricing />} />
                <Route path="/plans-pricing/create" element={<CreatePackage />} />
                <Route path="/plans-pricing/:id/edit" element={<EditPackage />} />
                <Route path="/plans-pricing/edit/:id" element={<EditPackage />} />
                <Route path="/plans-pricing/:id/items" element={<PackageItems />} />

                <Route path="/packages" element={<PlansPricing />} />
                <Route path="/packages/create" element={<CreatePackage />} />
                <Route path="/packages/:id/edit" element={<EditPackage />} />
                <Route path="/packages/edit/:id" element={<EditPackage />} />
                <Route path="/packages/:id/items" element={<PackageItems />} />

                <Route path="/saas-admin/packages" element={<PlansPricing />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/edit" element={<EditProfile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/overview" replace />} />
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