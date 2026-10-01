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
  Receipt,
  BarChart3,
  Settings,
  Moon,
  Sun,
  Ticket,
  Landmark,
  ChevronDown,
  HardDrive,
  ShieldCheck,
} from "lucide-react"
import { Link, useLocation } from "react-router"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import logoLight from "@/assets/logo_light.png"
import logoDark from "@/assets/logo_dark.png"
import smallLogo from "@/assets/small_logo.jpg"

const navItems = [
  {
    title: "Coupons",
    url: "/coupons",
    icon: Ticket,
  },
  {
    title: "Billing & Invoices",
    url: "/billing-invoices",
    icon: Receipt,
  },
  {
    title: "Bank Accounts",
    url: "/bank-accounts",
    icon: Landmark,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const location = useLocation()

  const isSubscriptionRoute =
    location.pathname.startsWith("/subscriptions") ||
    location.pathname.startsWith("/schools-subscriptions") ||
    location.pathname.startsWith("/plans-pricing") ||
    location.pathname.startsWith("/packages") ||
    location.pathname.startsWith("/attendance-machines") ||
    location.pathname.startsWith("/rfid-cards") ||
    location.pathname.startsWith("/storage-plans")

  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(true)

  useEffect(() => {
    if (isSubscriptionRoute) {
      setIsSubscriptionOpen(true)
    }
  }, [isSubscriptionRoute])

  const isApprovalsActive =
    location.pathname === "/subscriptions" ||
    location.pathname.startsWith("/schools-subscriptions")

  const isPackagesActive =
    location.pathname.startsWith("/plans-pricing") ||
    location.pathname.startsWith("/packages")

  const isAttendanceMachineActive = location.pathname.startsWith("/attendance-machines")
  const isRfidActive = location.pathname.startsWith("/rfid-cards")
  const isStoragePlanActive = location.pathname.startsWith("/storage-plans")
  const isSubscriptionParentActive = !isSubscriptionOpen && isSubscriptionRoute

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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 border-b flex items-center justify-center px-4 group-data-[collapsible=icon]:px-0">
        <Link
          to="/overview"
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

              {/* Subscription Dropdown */}
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
                    {/* Plan Approvals Submenu */}
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

                    {/* Packages & Pricing Submenu */}
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

                    {/* Attendance Machine Submenu */}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={isAttendanceMachineActive}
                        className="text-[13px] gap-2.5 h-8 font-medium cursor-pointer"
                        render={<Link to="/attendance-machines" />}
                      >
                        <Cpu className="size-3.5 shrink-0" />
                        <span>Attendance Machine</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>

                    {/* RFID Submenu */}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={isRfidActive}
                        className="text-[13px] gap-2.5 h-8 font-medium cursor-pointer"
                        render={<Link to="/rfid-cards" />}
                      >
                        <Radio className="size-3.5 shrink-0" />
                        <span>RFID</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>

                    {/* Storage Plan Submenu */}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={isStoragePlanActive}
                        className="text-[13px] gap-2.5 h-8 font-medium cursor-pointer"
                        render={<Link to="/storage-plans" />}
                      >
                        <HardDrive className="size-3.5 shrink-0" />
                        <span>Storage Plan</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Other Navigation Items */}
              {navItems.map((item) => {
                const isActive = location.pathname === item.url
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
