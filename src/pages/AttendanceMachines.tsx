import { useState, useEffect } from "react"
import { useAppSelector } from "@/store/store"
import {
  fetchAttendanceMachinesApi,
  toggleAttendanceMachineStatusApi,
  deleteAttendanceMachineApi,
} from "@/services/attendanceMachineService"
import type { AttendanceMachine } from "@/types/attendanceMachine"
import { getFullImageUrl } from "@/config/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Cpu,
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle,
  Trash2,
  Power,
  Users,
  Wifi,
  Layers,
  X,
} from "lucide-react"
import { toast } from "sonner"

export default function AttendanceMachines() {
  const token = useAppSelector((state) => state.auth.token)
  const [machines, setMachines] = useState<AttendanceMachine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<AttendanceMachine | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Status toggle in-progress ID
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Fetch machines
  const loadMachines = async (showLoadingState = true) => {
    if (!token) return
    if (showLoadingState) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const data = await fetchAttendanceMachinesApi(token, {
        search: debouncedSearch,
        status: statusFilter === "all" ? undefined : statusFilter === "active" ? 1 : 0,
      })
      setMachines(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load attendance machines."
      toast.error(message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadMachines(true)
  }, [token, debouncedSearch, statusFilter])

  // Toggle status
  const handleToggleStatus = async (machine: AttendanceMachine) => {
    if (!token || togglingId !== null) return
    const newStatus = machine.status === 1 ? 0 : 1
    setTogglingId(machine.id)

    try {
      await toggleAttendanceMachineStatusApi(token, machine.id, newStatus)
      setMachines((prev) =>
        prev.map((m) => (m.id === machine.id ? { ...m, status: newStatus } : m))
      )
      toast.success(
        `Machine "${machine.machine_name}" marked as ${newStatus === 1 ? "Active" : "Inactive"}.`
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update machine status."
      toast.error(message)
    } finally {
      setTogglingId(null)
    }
  }

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!token || !selectedMachine) return
    setIsSubmitting(true)
    try {
      await deleteAttendanceMachineApi(token, selectedMachine.id)
      setMachines((prev) => prev.filter((m) => m.id !== selectedMachine.id))
      toast.success(`Machine "${selectedMachine.machine_name}" deleted successfully.`)
      setIsDeleteOpen(false)
      setSelectedMachine(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete machine."
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Summary counts
  const totalCount = machines.length
  const activeCount = machines.filter((m) => m.status === 1).length
  const inactiveCount = machines.filter((m) => m.status === 0).length

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Cpu className="size-6 text-primary" />
            Attendance Machines
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage biometric, facial, and RFID attendance devices and integrations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMachines(false)}
            disabled={isRefreshing || isLoading}
            className="gap-2 cursor-pointer"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-xs border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Devices
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? <Skeleton className="h-8 w-14" /> : totalCount}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Cpu className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Active Devices
              </p>
              <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {isLoading ? <Skeleton className="h-8 w-14" /> : activeCount}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Inactive
              </p>
              <p className="text-2xl font-bold tracking-tight text-muted-foreground">
                {isLoading ? <Skeleton className="h-8 w-14" /> : inactiveCount}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
              <XCircle className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/60 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by machine name, model, brand, connectivity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status Tabs */}
          <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === "all"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === "active"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                statusFilter === "inactive"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Inactive
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-1">
            <button
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="Table View"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "table"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-border/60">
              <Skeleton className="h-44 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full mt-4" />
              </div>
            </Card>
          ))}
        </div>
      ) : machines.length === 0 ? (
        <Card className="border-dashed border-2 p-12 text-center">
          <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
            <div className="p-3 rounded-full bg-muted text-muted-foreground">
              <Cpu className="size-8" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              No Attendance Machines Found
            </h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "No machines match the selected filter criteria."
                : "No attendance machines have been registered in the system yet."}
            </p>
          </div>
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {machines.map((machine) => {
            const imageUrl = getFullImageUrl(machine.machine_image)
            const isToggling = togglingId === machine.id

            return (
              <Card
                key={machine.id}
                className="overflow-hidden border-border/60 hover:border-primary/40 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  {/* Image / Header Banner */}
                  <div className="relative h-44 bg-muted/40 overflow-hidden flex items-center justify-center border-b border-border/60">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={machine.machine_name}
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Hide broken image placeholder
                          ;(e.target as HTMLElement).style.display = "none"
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                        <Cpu className="size-10 stroke-1 text-muted-foreground/60" />
                        <span className="text-xs">No preview image</span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <Badge
                        variant="secondary"
                        className={`text-xs font-semibold px-2 py-0.5 shadow-xs ${
                          machine.status === 1
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {machine.status === 1 ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {/* Type Badge */}
                    <div className="absolute bottom-3 left-3">
                      <Badge
                        variant="outline"
                        className="text-[11px] font-medium bg-background/90 backdrop-blur-xs uppercase tracking-wider"
                      >
                        {machine.machine_type}
                      </Badge>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-medium text-primary uppercase tracking-wider">
                          {machine.brand || "Growvidya"}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {machine.model_number}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-foreground line-clamp-1 mt-0.5">
                        {machine.machine_name}
                      </h3>
                    </div>

                    {machine.specifications && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {machine.specifications}
                      </p>
                    )}

                    {/* Hardware Specs Pills */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="size-3.5 text-foreground/70 shrink-0" />
                        <span className="truncate">
                          {machine.user_capacity
                            ? `${Number(machine.user_capacity).toLocaleString()} Users`
                            : "Standard"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Wifi className="size-3.5 text-foreground/70 shrink-0" />
                        <span className="truncate">{machine.connectivity || "LAN, Wi-Fi"}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Layers className="size-3.5 text-foreground/70 shrink-0" />
                        <span className="truncate">{machine.push_protocol || "Cloud Push"}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-foreground font-semibold">
                        <span>
                          ₹{Number(machine.unit_price || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(machine)}
                    disabled={isToggling}
                    className={`h-8 px-2.5 text-xs gap-1.5 cursor-pointer ${
                      machine.status === 1
                        ? "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                        : "text-emerald-600 hover:bg-emerald-500/10"
                    }`}
                  >
                    <Power className={`size-3.5 ${isToggling ? "animate-spin" : ""}`} />
                    {machine.status === 1 ? "Deactivate" : "Activate"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedMachine(machine)
                      setIsDeleteOpen(true)
                    }}
                    className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="border-border/60 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Machine Name & Model</TableHead>
                  <TableHead>Brand & Type</TableHead>
                  <TableHead>Capacities</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.map((machine) => {
                  const imageUrl = getFullImageUrl(machine.machine_image)
                  const isToggling = togglingId === machine.id

                  return (
                    <TableRow key={machine.id}>
                      <TableCell>
                        <div className="size-12 rounded-lg bg-muted border border-border/60 overflow-hidden flex items-center justify-center shrink-0">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={machine.machine_name}
                              className="size-full object-contain p-1"
                              onError={(e) => {
                                ;(e.target as HTMLElement).style.display = "none"
                              }}
                            />
                          ) : (
                            <Cpu className="size-5 text-muted-foreground/50" />
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground text-sm">
                            {machine.machine_name}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {machine.model_number}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium text-foreground">
                            {machine.brand || "—"}
                          </p>
                          <Badge variant="outline" className="text-[11px] capitalize">
                            {machine.machine_type}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>
                            <span className="font-medium text-foreground">Users:</span>{" "}
                            {machine.user_capacity
                              ? Number(machine.user_capacity).toLocaleString()
                              : "—"}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">Conn:</span>{" "}
                            {machine.connectivity || "LAN"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs">
                          <span className="font-semibold text-foreground">
                            ₹{Number(machine.unit_price || 0).toLocaleString("en-IN")}
                          </span>
                          {machine.amc_price && (
                            <p className="text-[11px] text-muted-foreground">
                              AMC: ₹{Number(machine.amc_price).toLocaleString("en-IN")}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs font-semibold px-2 py-0.5 ${
                            machine.status === 1
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {machine.status === 1 ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={machine.status === 1 ? "Deactivate" : "Activate"}
                            onClick={() => handleToggleStatus(machine)}
                            disabled={isToggling}
                            className={`size-8 cursor-pointer ${
                              machine.status === 1
                                ? "text-muted-foreground hover:text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            <Power className={`size-4 ${isToggling ? "animate-spin" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => {
                              setSelectedMachine(machine)
                              setIsDeleteOpen(true)
                            }}
                            className="size-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <Trash2 className="size-5" />
              Delete Attendance Machine
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">
                {selectedMachine?.machine_name}
              </strong>
              ? This device specification will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
              className="cursor-pointer gap-2"
            >
              {isSubmitting && <RefreshCw className="size-4 animate-spin" />}
              Delete Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
