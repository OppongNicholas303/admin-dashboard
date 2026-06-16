import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw, Calendar, X, CheckCircle2, AlertCircle } from "lucide-react";
import { adminService } from "@/lib/adminService";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUSES = ["CREATED", "PENDING_PAYMENT", "PAID", "PROCESSING", "COMPLETED", "COMPLETE_BY_ADMIN", "FAILED", "REFUNDED"];
const NETWORKS = ["mtn", "telecel", "airteltigo"];

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    COMPLETED: { bg: "bg-green-100", text: "text-green-800", icon: "✓" },
    COMPLETE_BY_ADMIN: { bg: "bg-emerald-100", text: "text-emerald-800", icon: "✓✓" },
    PROCESSING: { bg: "bg-blue-100", text: "text-blue-800", icon: "⟳" },
    PENDING_PAYMENT: { bg: "bg-yellow-100", text: "text-yellow-800", icon: "⏳" },
    PAID: { bg: "bg-blue-100", text: "text-blue-800", icon: "💳" },
    CREATED: { bg: "bg-gray-100", text: "text-gray-800", icon: "+" },
    FAILED: { bg: "bg-red-100", text: "text-red-800", icon: "✕" },
    REFUNDED: { bg: "bg-orange-100", text: "text-orange-800", icon: "↺" },
  };
  const c = config[status] || { bg: "bg-gray-100", text: "text-gray-800", icon: "?" };
  return (
    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.icon}
      {status.replace(/_/g, " ")}
    </div>
  );
}

function MarkCompleteDialog({ orderId, currentStatus, onSuccess }: { orderId: string; currentStatus: string; onSuccess: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [completeType, setCompleteType] = useState<"auto" | "admin">(currentStatus === "COMPLETED" ? "admin" : "auto");

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      if (completeType === "admin") {
        await adminService.markOrderCompleteByAdmin(orderId);
      } else {
        await adminService.markOrderComplete(orderId);
      }
      setIsOpen(false);
      onSuccess();
      toast.success("Order marked as complete");
    } catch (error: any) {
      console.error("Failed to mark order as complete:", error);
      toast.error(error.message || "Failed to mark order as complete");
    } finally {
      setIsLoading(false);
    }
  };

  const canMarkComplete = currentStatus === "PROCESSING" || currentStatus === "COMPLETED";

  if (!canMarkComplete) return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1"
        onClick={() => setIsOpen(true)}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Mark Done
      </Button>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="text-lg">Mark Order as Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {currentStatus !== "COMPLETED" && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30" onClick={() => setCompleteType("auto")}>
                    <input type="radio" checked={completeType === "auto"} onChange={() => setCompleteType("auto")} />
                    <div>
                      <p className="text-sm font-medium">Auto Complete</p>
                      <p className="text-xs text-muted-foreground">Provider confirmed (status: COMPLETED)</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30" onClick={() => setCompleteType("admin")}>
                  <input type="radio" checked={completeType === "admin"} onChange={() => setCompleteType("admin")} />
                  <div>
                    <p className="text-sm font-medium">Admin Complete (Manual)</p>
                    <p className="text-xs text-muted-foreground">Manually verified by you (status: COMPLETE_BY_ADMIN)</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleComplete} disabled={isLoading}>
                  {isLoading ? "Marking..." : "Confirm"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export default function OrdersPage() {
  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState("ALL");
  const [filterNetwork, setFilterNetwork] = useState("ALL");
  const today = new Date().toISOString().split("T")[0];
  const [fromDate,      setFromDate]      = useState(today);
  const [toDate,        setToDate]        = useState(today);
  const [tab, setTab] = useState<"orders" | "commissions">("orders");

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-orders", filterStatus, filterNetwork, fromDate, toDate],
    queryFn: () => adminService.getOrders(
      filterStatus  !== "ALL" ? filterStatus  : undefined,
      filterNetwork !== "ALL" ? filterNetwork : undefined,
      fromDate || undefined,
      toDate   || undefined,
    ),
  });

  const { data: commissionData } = useQuery({
    queryKey: ["agent-commissions", fromDate, toDate],
    queryFn: () => adminService.getAgentCommissionsSummary(undefined, fromDate, toDate),
    enabled: tab === "commissions"
  });

  const filtered = useMemo(() => orders.filter(o => {
    const s = search.toLowerCase();
    return !s || o.phoneNumber.includes(s) || o.bundleCode.toLowerCase().includes(s) ||
      o.id.includes(s) || o.userId.includes(s);
  }), [orders, search]);

  const totalRevenue   = filtered.filter(o => o.status === "COMPLETED" || o.status === "COMPLETE_BY_ADMIN").reduce((s, o) => s + o.amount, 0);
  const totalProfit    = filtered.filter(o => o.status === "COMPLETED" || o.status === "COMPLETE_BY_ADMIN").reduce((s, o) => s + o.platformProfit, 0);
  const totalCommission = filtered.reduce((s, o) => s + (o.commissionAmount || 0), 0);
  const completedCount = filtered.filter(o => o.status === "COMPLETED" || o.status === "COMPLETE_BY_ADMIN").length;
  const failedCount    = filtered.filter(o => o.status === "FAILED").length;
  const processingCount = filtered.filter(o => o.status === "PROCESSING").length;
  const hasDateFilter  = fromDate || toDate;
  const hasAnyFilter   = hasDateFilter || filterStatus !== "ALL" || filterNetwork !== "ALL";

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <Button
          variant={tab === "orders" ? "default" : "ghost"}
          className="rounded-none"
          onClick={() => setTab("orders")}
        >
          Orders
        </Button>
        <Button
          variant={tab === "commissions" ? "default" : "ghost"}
          className="rounded-none"
          onClick={() => setTab("commissions")}
        >
          Commissions
        </Button>
      </div>

      {tab === "orders" && (
        <>
          {/* Filter Section */}
          <Card className="bg-muted/20">
            <CardContent className="pt-6 space-y-4">
              {/* Row 1 — search + status + network + refresh */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search phone, bundle, order ID, user..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                    aria-label="Search orders"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterNetwork} onValueChange={setFilterNetwork}>
                  <SelectTrigger className="w-full sm:w-40" aria-label="Filter by network">
                    <SelectValue placeholder="Network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Networks</SelectItem>
                    {NETWORKS.map(n => <SelectItem key={n} value={n}>{n.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Refresh">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Row 2 — date range */}
              <div className="flex flex-col sm:flex-row items-end gap-2">
                <div className="flex items-center gap-1.5 self-start sm:self-end pb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Date range:</span>
                </div>
                <div className="flex flex-1 flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Label htmlFor="from-date" className="text-xs text-muted-foreground">From</Label>
                    <Input
                      id="from-date"
                      type="date"
                      value={fromDate}
                      onChange={e => setFromDate(e.target.value)}
                      max={toDate || undefined}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="to-date" className="text-xs text-muted-foreground">To</Label>
                    <Input
                      id="to-date"
                      type="date"
                      value={toDate}
                      onChange={e => setToDate(e.target.value)}
                      min={fromDate || undefined}
                      className="h-9 text-sm"
                    />
                  </div>
                  {hasDateFilter && (
                    <div className="flex items-end">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => { setFromDate(""); setToDate(""); }}
                        className="h-9 text-muted-foreground hover:text-foreground gap-1"
                        aria-label="Clear dates"
                      >
                        <X className="h-3.5 w-3.5" />Clear
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{filtered.length}</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-lg font-bold text-green-600">{completedCount}</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Processing</p>
                <p className="text-lg font-bold text-blue-600">{processingCount}</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="text-lg font-bold text-red-600">{failedCount}</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Commission</p>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(totalCommission)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Active filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {hasDateFilter && (
              <Badge variant="outline" className="text-xs gap-1">
                <Calendar className="h-3 w-3" />
                {fromDate && toDate ? `${fromDate} → ${toDate}` : fromDate ? `From ${fromDate}` : `Until ${toDate}`}
              </Badge>
            )}
            {filterStatus  !== "ALL" && <Badge variant="outline" className="text-xs">{filterStatus.replace(/_/g, " ")}</Badge>}
            {filterNetwork !== "ALL" && <Badge variant="outline" className="text-xs">{filterNetwork.toUpperCase()}</Badge>}
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading orders...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No orders found for the selected filters.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-4 font-medium text-muted-foreground">Order</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Phone</th>
                      <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Bundle</th>
                      <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Network</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Commission</th>
                      <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Profit</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(order => (
                      <tr key={order.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="font-mono text-xs text-muted-foreground">…{order.id.slice(-8)}</p>
                            {order.agentId && <span className="inline-block text-[10px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded">Agent</span>}
                          </div>
                        </td>
                        <td className="p-4 font-medium">{order.phoneNumber}</td>
                        <td className="p-4 hidden sm:table-cell text-muted-foreground text-sm">{order.bundleCode}</td>
                        <td className="p-4 hidden md:table-cell">
                          <span className="uppercase text-xs font-semibold bg-muted px-2 py-1 rounded">{order.network}</span>
                        </td>
                        <td className="p-4 font-semibold">{formatCurrency(order.amount)}</td>
                        <td className="p-4 hidden md:table-cell text-muted-foreground text-sm">
                          {order.commissionAmount > 0 ? formatCurrency(order.commissionAmount) : <span className="text-muted-foreground/50">—</span>}
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <span className={`font-semibold text-sm ${order.platformProfit > 0 ? 'text-green-600' : order.platformProfit < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {formatCurrency(order.platformProfit)}
                          </span>
                        </td>
                        <td className="p-4"><StatusBadge status={order.status} /></td>
                        <td className="p-4 text-xs text-muted-foreground hidden lg:table-cell">{formatDate(order.createdAt)}</td>
                        <td className="p-4">
                          <MarkCompleteDialog
                            orderId={order.id}
                            currentStatus={order.status}
                            onSuccess={() => refetch()}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === "commissions" && (
        <CommissionsTab fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} data={commissionData} />
      )}
    </div>
  );
}

function CommissionsTab({ fromDate, toDate, setFromDate, setToDate, data }: any) {
  const hasDateFilter = fromDate || toDate;

  if (!data) {
    return <div className="p-8 text-center text-muted-foreground">Loading commissions...</div>;
  }

  const totalCommissions = data.totalCommissions || 0;
  const totalOrders = data.totalOrders || 0;
  const dailySummary = data.dailySummary || [];

  return (
    <div className="space-y-4">
      {/* Filter Section */}
      <Card className="bg-muted/20">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-end gap-2">
            <div className="flex items-center gap-1.5 self-start sm:self-end pb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Filter by date:</span>
            </div>
            <div className="flex flex-1 flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Label htmlFor="comm-from-date" className="text-xs text-muted-foreground">From</Label>
                <Input
                  id="comm-from-date"
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  max={toDate || undefined}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="comm-to-date" className="text-xs text-muted-foreground">To</Label>
                <Input
                  id="comm-to-date"
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  min={fromDate || undefined}
                  className="h-9 text-sm"
                />
              </div>
              {hasDateFilter && (
                <div className="flex items-end">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => { setFromDate(""); setToDate(""); }}
                    className="h-9 text-muted-foreground hover:text-foreground gap-1"
                  >
                    <X className="h-3.5 w-3.5" />Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Commissions</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">{formatCurrency(totalCommissions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Avg Commission</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {totalOrders > 0 ? formatCurrency(totalCommissions / totalOrders) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Orders</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Commission</th>
                </tr>
              </thead>
              <tbody>
                {dailySummary.length > 0 ? (
                  dailySummary.map((day: any) => (
                    <tr key={day.date} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-medium">{day.date}</td>
                      <td className="p-3 text-muted-foreground">{day.count}</td>
                      <td className="p-3 font-semibold text-orange-600">{formatCurrency(day.totalCommission)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                      No commission data for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
