import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Store, Package, ShoppingCart, TrendingUp,
  CheckCircle, XCircle, Clock, DollarSign, Wrench,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { adminService } from "@/lib/adminService";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981"];

const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [days, setDays] = useState(30);

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: adminService.getStats,
    refetchInterval: 30000,
  });

  const { data: daily = [], isLoading: loadingDaily } = useQuery({
    queryKey: ["admin-daily", days],
    queryFn: () => adminService.getDailyAnalytics(days),
    refetchInterval: 60000,
  });

  const migrationMutation = useMutation({
    mutationFn: adminService.backfillOrderCosts,
    onSuccess: (result) => {
      toast.success(`Migration done — ${result.patched} orders patched, ${result.skipped} skipped, ${result.failed} failed`);
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-daily"] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const periodRevenue   = daily.reduce((s, d) => s + Number(d.revenue), 0);
  const periodProfit    = daily.reduce((s, d) => s + Number(d.profit),  0);
  const periodOrders    = daily.reduce((s, d) => s + d.orders, 0);
  const periodCompleted = daily.reduce((s, d) => s + d.completedOrders, 0);

  const statCards = [
    { label: "Total Users",         value: stats?.totalUsers ?? 0,                   icon: Users,        color: "text-blue-500",    bg: "bg-blue-500/10" },
    { label: "Total Agents",        value: stats?.totalAgents ?? 0,                  icon: Store,        color: "text-purple-500",  bg: "bg-purple-500/10" },
    { label: "Total Bundles",       value: stats?.totalBundles ?? 0,                 icon: Package,      color: "text-amber-500",   bg: "bg-amber-500/10" },
    { label: "Total Orders",        value: stats?.totalOrders ?? 0,                  icon: ShoppingCart, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Completed",           value: stats?.completedOrders ?? 0,              icon: CheckCircle,  color: "text-success",     bg: "bg-success/10" },
    { label: "Failed",              value: stats?.failedOrders ?? 0,                 icon: XCircle,      color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Pending Withdrawals", value: stats?.pendingWithdrawals ?? 0,           icon: Clock,        color: "text-warning",     bg: "bg-warning/10", link: "/withdrawals" },
    { label: "All-time Revenue",    value: formatCurrency(stats?.totalRevenue ?? 0), icon: DollarSign,   color: "text-primary",     bg: "bg-primary/10" },
    { label: "All-time Profit",     value: formatCurrency(stats?.totalProfit ?? 0),  icon: TrendingUp,   color: "text-success",     bg: "bg-success/10" },
  ];

  const orderBreakdown = [
    { name: "Completed", value: stats?.completedOrders ?? 0 },
    { name: "Failed",    value: stats?.failedOrders ?? 0 },
    { name: "Other",     value: Math.max(0, (stats?.totalOrders ?? 0) - (stats?.completedOrders ?? 0) - (stats?.failedOrders ?? 0)) },
  ];

  return (
    <div className="space-y-6">

      {/* Migration banner — shown to backfill order data if needed */}
      {!loadingStats && (stats?.completedOrders ?? 0) > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
          <div className="flex items-start gap-3">
            <Wrench className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-warning">Profit data needs backfilling</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                If some existing orders are missing cost price data, run the migration to fix profit calculations. Safe to run multiple times.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-warning/40 text-warning hover:bg-warning/10 shrink-0"
            disabled={migrationMutation.isPending}
            onClick={() => migrationMutation.mutate()}
            aria-label="Run migration to backfill order cost prices"
          >
            <Wrench className="h-3.5 w-3.5 mr-1.5" />
            {migrationMutation.isPending ? "Running..." : "Fix Profit Data"}
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, link }) => (
          <Card
            key={label}
            className={`hover:shadow-md transition-shadow ${link ? "cursor-pointer" : ""}`}
            onClick={() => link && navigate(link)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate leading-tight">{label}</p>
                {loadingStats
                  ? <div className="h-6 w-16 bg-muted animate-pulse rounded mt-0.5" />
                  : <p className="text-xl font-bold text-foreground leading-tight truncate">{value}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Period selector + summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Daily Analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last {days} days — {periodOrders} orders · {periodCompleted} completed · {formatCurrency(periodRevenue)} revenue · <span className="text-success font-medium">{formatCurrency(periodProfit)} profit</span>
          </p>
        </div>
        <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Select date range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Daily charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Profit line chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Daily Revenue &amp; Profit (GHS)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDaily ? (
              <div className="h-52 bg-muted animate-pulse rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={daily} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 11 }} interval={Math.floor(daily.length / 6)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₵${v}`} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number, name: string) => [formatCurrency(v), name === "revenue" ? "Revenue" : "Profit"]}
                    labelFormatter={formatShortDate}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="profit"  name="Profit"  stroke="hsl(var(--success))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Daily Orders bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Daily Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDaily ? (
              <div className="h-52 bg-muted animate-pulse rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={daily} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 11 }} interval={Math.floor(daily.length / 6)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={formatShortDate} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="completedOrders" name="Completed" fill="hsl(var(--success))"      radius={[3, 3, 0, 0]} />
                  <Bar dataKey="orders"          name="Total"     fill="hsl(var(--primary)/0.35)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overview charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Platform Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { name: "Users",   count: stats?.totalUsers ?? 0 },
                  { name: "Agents",  count: stats?.totalAgents ?? 0 },
                  { name: "Bundles", count: stats?.totalBundles ?? 0 },
                  { name: "Orders",  count: stats?.totalOrders ?? 0 },
                ]}
                margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={orderBreakdown}
                  dataKey="value"
                  cx="50%" cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => percent > 0.02 ? `${name} ${(percent * 100).toFixed(0)}%` : ""}
                  labelLine={false}
                >
                  {orderBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// File updated to trigger IDE reload
