import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Layers,
  CreditCard,
  Cpu,
  Radio,
  Settings,
  Moon,
  Sun,
  Ticket,
  Landmark,
  ChevronDown,
  HardDrive,
  ShieldCheck,
  Shield,
  Users,
  Wallet,
  Mail,
  ShoppingBag,
  Headset,
} from "lucide-react"
import { Link, useLocation } from "react-router"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { usePermission } from "@/hooks/usePermission"
import logoLight from "@/assets/logo_light.png"
import logoDark from "@/assets/logo_dark.png"
import smallLogo from "@/assets/small_logo.jpg"

const navItems = [
  {
    title: "Coupons",
    url: "/coupons",
    icon: Ticket,
    moduleKey: "coupons",
  },
  {
    title: "Bank Accounts",
    url: "/bank-accounts",
    icon: Landmark,
    moduleKey: "bank_accounts",
  },
  {
    title: "Help & Support",
    url: "/support-tickets",
    icon: Headset,
    moduleKey: "support_tickets",
  },
  {
    title: "Roles & Permissions",
    url: "/roles",
    icon: Shield,
    moduleKey: "roles",
  },
  {
    title: "Users (Sub-Admins)",
    url: "/users",
    icon: Users,
    moduleKey: "sub_admins",
  },
]

export function AppSidebar() {
  const location = useLocation()
  const { can, getFirstAccessibleRoute } = usePermission()

  const canViewDashboard = can("dashboard", "can_view")
  const canViewSubscriptions = can(["subscriptions", "schools"], "can_view")
  const canViewPackages = can("packages", "can_view")
  const canViewAttendanceMachines = can("attendance_machines", "can_view")
  const canViewMachinesBuyers = can("machines_buyers", "can_view")
  const canViewRfidCards = can("rfid_cards", "can_view")
  const canViewRfidBuyers = can("rfid_buyers", "can_view")
  const canViewStoragePlans = can("storage_plans", "can_view")
  const canViewStorageBuyers = can("storage_buyers", "can_view")
  const canViewPaymentGateway = can("payment_gateway", "can_view")
  const canViewEmailSettings = can("email_settings", "can_view")

  const canViewAnySubscriptionSubItem = canViewSubscriptions || canViewPackages
  const canViewAnyMachineSubItem = canViewAttendanceMachines || canViewMachinesBuyers
  const canViewAnyRfidSubItem = canViewRfidCards || canViewRfidBuyers
  const canViewAnyStorageSubItem = canViewStoragePlans || canViewStorageBuyers
  const canViewAnySettingsSubItem = canViewPaymentGateway || canViewEmailSettings

  const visibleNavItems = navItems.filter((item) => can(item.moduleKey, "can_view"))

  const isSubscriptionRoute =
    location.pathname.startsWith("/subscriptions") ||
    location.pathname.startsWith("/schools-subscriptions") ||
    location.pathname.startsWith("/plans-pricing") ||
    location.pathname.startsWith("/packages")

  const isAttendanceMachineRoute = location.pathname.startsWith("/attendance-machines")
  const isRfidRoute = location.pathname.startsWith("/rfid-cards")
  const isStoragePlanRoute = location.pathname.startsWith("/storage-plans")
  const isSettingsRoute = location.pathname.startsWith("/settings")

  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(true)
  const [isRfidOpen, setIsRfidOpen] = useState(true)
  const [isAttendanceMachineOpen, setIsAttendanceMachineOpen] = useState(true)
  const [isStoragePlanOpen, setIsStoragePlanOpen] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(true)

  useEffect(() => {
    if (isSubscriptionRoute) setIsSubscriptionOpen(true)
  }, [isSubscriptionRoute])

  useEffect(() => {
    if (isAttendanceMachineRoute) setIsAttendanceMachineOpen(true)
  }, [isAttendanceMachineRoute])

  useEffect(() => {
    if (isRfidRoute) setIsRfidOpen(true)
  }, [isRfidRoute])

  useEffect(() => {
    if (isStoragePlanRoute) setIsStoragePlanOpen(true)
  }, [isStoragePlanRoute])

  useEffect(() => {
    if (isSettingsRoute) setIsSettingsOpen(true)
  }, [isSettingsRoute])

  const isApprovalsActive =
    location.pathname === "/subscriptions" ||
    location.pathname.startsWith("/subscriptions/") ||
    location.pathname.startsWith("/schools-subscriptions")

  const isPackagesActive =
    location.pathname.startsWith("/plans-pricing") ||
    location.pathname.startsWith("/packages")

  const isManageMachinesActive =
    isAttendanceMachineRoute && !location.pathname.startsWith("/attendance-machines/buyers")
  const isMachineBuyersActive = location.pathname.startsWith("/attendance-machines/buyers")

  const isManageRfidActive =
    isRfidRoute && !location.pathname.startsWith("/rfid-cards/buyers")
  const isRfidBuyersActive = location.pathname.startsWith("/rfid-cards/buyers")

  const isManageStorageActive =
    isStoragePlanRoute && !location.pathname.startsWith("/storage-plans/buyers")
  const isStorageBuyersActive = location.pathname.startsWith("/storage-plans/buyers")

  const isSubscriptionParentActive = !isSubscriptionOpen && isSubscriptionRoute
  const isAttendanceMachineParentActive = !isAttendanceMachineOpen && isAttendanceMachineRoute
  const isRfidParentActive = !isRfidOpen && isRfidRoute
  const isStoragePlanParentActive = !isStoragePlanOpen && isStoragePlanRoute

  const isPaymentGatewayActive =
    location.pathname === "/settings" ||
    location.pathname.startsWith("/settings/payment-gateway")
  const isEmailSettingsActive =
    location.pathname.startsWith("/settings/email") ||
    location.pathname.startsWith("/settings/smtp")
  const isSettingsParentActive = !isSettingsOpen && isSettingsRoute

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("growvidya-theme")
      if (saved) return saved === "dark"
      return document.documentElement.classList.contains("dark")
    }
    return false
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("growvidya-theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("growvidya-theme", "light")
    }
  }, [isDark])

  const toggleTheme = () => {
    setIsDark((prev) => !prev)
  }

  const homeUrl = getFirstAccessibleRoute()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 border-b flex items-center justify-center px-4 group-data-[collapsible=icon]:px-0">
        <Link
          to={homeUrl}
          className="flex items-center justify-center transition-opacity hover:opacity-85 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          title="Growvidya - Back to Home"
        >
          {/* Small logo for collapsed sidebar */}
          <img
            src={smallLogo}
            alt="Growvidya"
            className="hidden w-8 aspect-square object-contain rounded-md shrink-0 group-data-[collapsible=icon]:block"
          />

          {/* Full logo for expanded sidebar */}
          <div className="flex items-center justify-center group-data-[collapsible=icon]:hidden">
            <img
              src={isDark ? logoDark : logoLight}
              alt="Growvidya"
              className="w-[145px] object-contain"
            />
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-muted-foreground/75 px-3 mb-1">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {/* Overview */}
              {canViewDashboard && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location.pathname === "/overview"}
                    tooltip="Overview"
                    className="h-9 px-3 text-[14px] font-medium gap-3 transition-colors [&>svg]:size-[18px]"
                    render={<Link to="/overview" />}
                  >
                    <LayoutDashboard className="shrink-0" />
                    <span>Overview</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Subscription Dropdown (Base Subscriptions & Packages) */}
              {canViewAnySubscriptionSubItem && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setIsSubscriptionOpen((prev) => !prev)}
                    isActive={isSubscriptionParentActive}
                    tooltip="Subscription"
                    className="h-9 px-3 text-[14px] font-medium gap-3 transition-colors [&>svg]:size-[18px] cursor-pointer justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Layers className="shrink-0" />
                      <span className="truncate">Subscription</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 transition-transform duration-200 text-muted-foreground group-data-[collapsible=icon]:hidden",
                        isSubscriptionOpen && "rotate-180"
                      )}
                    />
                  </SidebarMenuButton>

                  {isSubscriptionOpen && (
                    <SidebarMenuSub>
                      {canViewSubscriptions && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={isApprovalsActive}
                            className="text-[13px] gap-2.5 h-8 font-medium cursor-pointer"
                            render={<Link to="/subscriptions" />}
                          >
                            <ShieldCheck className="size-3.5 shrink-0 text-amber-500" />
                            <span>Plan Approvals</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}

                      {canViewPackages && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={isPackagesActive}
                            className="text-[13px] gap-2.5 h-8 font-medium cursor-pointer"
                            render={<Link to="/plans-pricing" />}
                          >
                            <CreditCard className="size-3.5 shrink-0" />
                            <span>Packages & Pricing</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}

              {/* Attendance Machine Dropdown (Manage + Buyers) */}
              {canViewAnyMachineSubItem && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setIsAttendanceMachineOpen((prev) => !prev)}
                    isActive={isAttendanceMachineParentActive}
                    tooltip="Attendance Machine"
                    className="h-9 px-3 text-[14px] font-medium gap-3 transition-colors [&>svg]:size-[18px] cursor-pointer justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Cpu className="shrink-0" />
                      <span className="truncate">Attendance Machine</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 transition-transform duration-200 text-muted-foreground group-data-[collapsible=icon]:hidden",
                        isAttendanceMachineOpen && "rotate-180"
                      )}
                    />
                  </SidebarMenuButton>

                  {isAttendanceMachineOpen && (
                    <SidebarMenuSub>
                      {canViewAttendanceMachines && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={isManageMachinesActive}
                            className="text-[13px] gap-2.5 h-8 font-medium cursor-pointer"
                            render={<Link to="/attendance-machines" />}
                          >
                            <Cpu className="size-3.5 shrink-0" />
                            <span>Manage Machines</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}

                      {canViewMachinesBuyers && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={isMachineBuyersActive}
                            className="text-[13px] gap-2.5 h-8 font-medium cursor-pointer"
                            render={<Link to="/attendance-machines/buyers" />}
                          >
                            <ShoppingBag className="size-3.5 shrink-0 text-primary" />
                            <span>Machine Buyers</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}

              {/* RFID Dropdown (Manage + Buyers) */}
              {canViewAnyRfidSubItem && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setIsRfidOpen((prev) => !prev)}
                    isActive={isRfidParentActive}
                    tooltip="RFID"
                    className="h-9 px-3 text-[14px] font-medium gap-3 transition-colors [&>svg]:size-[18px] cursor-pointer justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Radio className="shrink-0" />
                      <span className="truncate">RFID</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 transition-transform duration-200 text-muted-foreground group-data-[collapsible=icon]:hidden",
                        isRfidOpen && "rotate-180"
                      )}
                    />
                  </SidebarMenuButton>

                  {isRfidOpen && (
                    <SidebarMenuSub>
                      {canViewRfidCards && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={isManageRfidActive}
                            className="text-[13px] gap-2.5 h-8 font-medium cursor-pointer"
                            render={<Link to="/rfid-cards" />}
                          >
                            <Radio className="size-3.5 shrink-0" />
                            <span>Manage RFID Cards</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}

                      {canViewRfidBuyers && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={isRfidBuyersActive}
                            className="text-[13px] gap-2.5 h-8 font-medium cursor-pointer"
                            render={<Link to="/rfid-cards/buyers" />}
                          >
                            <ShoppingBag className="size-3.5 shrink-0 text-primary" />
                            <span>RFID Buyers</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}

              {/* Storage Plan Dropdown (Manage + Buyers) */}
              {canViewAnyStorageSubItem && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setIsStoragePlanOpen((prev) => !prev)}
                    isActive={isStoragePlanParentActive}
                    tooltip="Storage Plan"
                    className="h-9 px-3 text-[14px] font-medium gap-3 transition-colors [&>svg]:size-[18px] cursor-pointer justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <HardDrive className="shrink-0" />
                      <span className="truncate">Storage Plan</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 transition-transform duration-200 text-muted-foreground group-data-[collapsible=icon]:hidden",
                        isStoragePlanOpen && "rotate-180"
                      )}
                    />
                  </SidebarMenuButton>

                  {isStoragePlanOpen && (
                    <SidebarMenuSub>
                      {canViewStoragePlans && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={isManageStorageActive}
                            className="text-[13px] gap-2.5 h-8 font-medium cursor-pointer"
                            render={<Link to="/storage-plans" />}
                          >
                            <HardDrive className="size-3.5 shrink-0" />
                            <span>Manage Storage</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}

                      {canViewStorageBuyers && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={isStorageBuyersActive}
                            className="text-[13px] gap-2.5 h-8 font-medium cursor-pointer"
                            render={<Link to="/storage-plans/buyers" />}
                          >
                            <ShoppingBag className="size-3.5 shrink-0 text-primary" />
                            <span>Storage Buyers</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}

              {/* Other Navigation Items */}
              {visibleNavItems.map((item) => {
                const isActive =
                  location.pathname === item.url ||
                  location.pathname.startsWith(`${item.url}/`)
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      className="h-9 px-3 text-[14px] font-medium gap-3 transition-colors [&>svg]:size-[18px]"
                      render={<Link to={item.url} />}
                    >
                      <Icon className="shrink-0" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}

              {/* Settings Dropdown */}
              {canViewAnySettingsSubItem && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setIsSettingsOpen((prev) => !prev)}
                    isActive={isSettingsParentActive}
                    tooltip="Settings"
                    className="h-9 px-3 text-[14px] font-medium gap-3 transition-colors [&>svg]:size-[18px] cursor-pointer justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Settings className="shrink-0" />
                      <span className="truncate">Settings</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 transition-transform duration-200 text-muted-foreground group-data-[collapsible=icon]:hidden",
                        isSettingsOpen && "rotate-180"
                      )}
                    />
                  </SidebarMenuButton>

                  {isSettingsOpen && (
                    <SidebarMenuSub>
                      {canViewPaymentGateway && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={isPaymentGatewayActive}
                            className="text-[13px] gap-2.5 h-8 font-medium cursor-pointer"
                            render={<Link to="/settings/payment-gateway" />}
                          >
                            <Wallet className="size-3.5 shrink-0 text-primary" />
                            <span>Payment Gateway</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}

                      {canViewEmailSettings && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={isEmailSettingsActive}
                            className="text-[13px] gap-2.5 h-8 font-medium cursor-pointer"
                            render={<Link to="/settings/email" />}
                          >
                            <Mail className="size-3.5 shrink-0 text-primary" />
                            <span>Email & SMTP</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleTheme}
              tooltip="Toggle Theme"
              className="h-9 px-3 text-[14px] font-medium gap-3 [&>svg]:size-[18px]"
            >
              {isDark ? (
                <>
                  <Sun className="shrink-0" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="shrink-0" />
                  <span>Dark Mode</span>
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
