import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ChevronDown, ChevronUp, RefreshCw, TrendingUp, ShoppingCart, Wallet } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/lib/adminService";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AdminAgent } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

function AgentDetail({ agent }: { agent: AdminAgent }) {
  const qc = useQueryClient();
  const [period, setPeriod] = useState<"TODAY" | "7D" | "ALL">("TODAY");
  const [orderStatus, setOrderStatus] = useState<string | undefined>(undefined);
  const [commissionStatus, setCommissionStatus] = useState<string | undefined>(undefined);

  const computeRange = (p: "TODAY" | "7D" | "ALL") => {
    if (p === "ALL") return { from: undefined, to: undefined };
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    if (p === "TODAY") return { from: to, to };
    const fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 6); // last 7 days
    const from = fromDate.toISOString().slice(0, 10);
    return { from, to };
  };
  const { from, to } = computeRange(period);
  const { data: commissions = [], isLoading: loadingC } = useQuery({
    queryKey: ["agent-commissions", agent.id, period, commissionStatus],
    queryFn: () => adminService.getAgentCommissions(agent.id, commissionStatus, from, to),
  });
  const { data: orders = [], isLoading: loadingO } = useQuery({
    queryKey: ["agent-orders", agent.id, period, orderStatus],
    queryFn: () => adminService.getAgentOrders(agent.id, orderStatus, undefined, from, to),
  });
  const { data: withdrawals = [], isLoading: loadingW } = useQuery({
    queryKey: ["agent-withdrawals", agent.id],
    queryFn: () => adminService.getAgentWithdrawals(agent.id),
  });

  const { data: wallet, isLoading: loadingWallet } = useQuery({
    queryKey: ["agent-wallet", agent.id],
    queryFn: () => adminService.getAgentWallet(agent.id),
  });

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const topUpMutation = useMutation({
    mutationFn: () => adminService.topUpAgentWallet(agent.id, parseFloat(topUpAmount || "0"), adminNote),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["agent-wallet", agent.id] });
      qc.invalidateQueries({ queryKey: ["admin-agents"] });
      toast.success("Top-up successful");
      setTopUpOpen(false);
      setTopUpAmount("");
      setAdminNote("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <tr>
      <td colSpan={6} className="p-0">
        <div className="bg-muted/20 border-b p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Commissions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Period</label>
                <select value={period} onChange={e => setPeriod(e.target.value as any)} className="text-sm rounded px-2 py-1">
                  <option value="TODAY">Today</option>
                  <option value="7D">Last 7 days</option>
                  <option value="ALL">All</option>
                </select>
                <label className="text-xs text-muted-foreground">Commission status</label>
                <select value={commissionStatus ?? ""} onChange={e => setCommissionStatus(e.target.value || undefined)} className="text-sm rounded px-2 py-1">
                  <option value="">All</option>
                  <option value="PENDING">PENDING</option>
                  <option value="SETTLED">SETTLED</option>
                  <option value="REVERSED">REVERSED</option>
                </select>
              </div>
              <div>
                <Button size="sm" onClick={() => {
                  qc.invalidateQueries({ queryKey: ["agent-commissions", agent.id] });
                }}>Refresh</Button>
              </div>
            </div>
            <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-success" /> Commissions
            </p>
            {loadingC ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : commissions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No commissions yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-hide">
                {commissions.map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs bg-card rounded-lg px-3 py-2">
                    <span className="text-muted-foreground truncate">{c.orderId.slice(-8)}</span>
                    <span className="font-semibold text-success">{formatCurrency(c.profit)}</span>
                    <span className={c.status === "SETTLED" ? "status-completed" : "status-pending"}>{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Orders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Period</label>
                <select value={period} onChange={e => setPeriod(e.target.value as any)} className="text-sm rounded px-2 py-1">
                  <option value="TODAY">Today</option>
                  <option value="7D">Last 7 days</option>
                  <option value="ALL">All</option>
                </select>
                <label className="text-xs text-muted-foreground">Order status</label>
                <select value={orderStatus ?? ""} onChange={e => setOrderStatus(e.target.value || undefined)} className="text-sm rounded px-2 py-1">
                  <option value="">All</option>
                  <option value="PENDING">PENDING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>
              <div>
                <Button size="sm" onClick={() => {
                  qc.invalidateQueries({ queryKey: ["agent-orders", agent.id] });
                }}>Refresh</Button>
              </div>
            </div>
            <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <ShoppingCart className="h-4 w-4 text-primary" /> Orders
            </p>
            {loadingO ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : orders.length === 0 ? (
              <p className="text-xs text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-hide">
                {orders.map(o => (
                  <div key={o.id} className="flex items-center justify-between text-xs bg-card rounded-lg px-3 py-2">
                    <span className="font-medium">{o.bundleCode} ({o.network.toUpperCase()})</span>
                    <span className="text-muted-foreground">{o.phoneNumber}</span>
                    <span className={`status-${o.status.toLowerCase()}`}>{o.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Withdrawals & Wallet */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-warning" /> Withdrawals
              </p>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Wallet balance</p>
                  {loadingWallet ? (
                    <p className="font-semibold">Loading...</p>
                  ) : wallet ? (
                    <p className="font-semibold">{formatCurrency(wallet.balance)}</p>
                  ) : (
                    <p className="font-semibold">—</p>
                  )}
                </div>
                <Button size="sm" onClick={() => setTopUpOpen(true)}>Top Up</Button>
              </div>
            </div>

            {loadingW ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : withdrawals.length === 0 ? (
              <p className="text-xs text-muted-foreground">No withdrawals yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-hide">
                {withdrawals.map(w => (
                  <div key={w.id} className="flex flex-col gap-1 text-xs bg-card rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{formatCurrency(w.amount)}</span>
                      <span className={`status-${w.status.toLowerCase() === 'approved' ? 'completed' : w.status.toLowerCase() === 'rejected' ? 'failed' : 'pending'}`}>
                        {w.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>{w.momoProvider} - {w.momoNumber}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Top-up dialog */}
            <Dialog open={topUpOpen} onOpenChange={open => !open && setTopUpOpen(false)}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">Top Up Wallet — {agent.businessName}</DialogTitle>
                  <DialogDescription>Enter the amount to credit to the agent's wallet. This will add funds immediately.</DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="topup-amount">Amount (GHS)</Label>
                    <Input id="topup-amount" type="number" step="0.01" min="0.01" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="topup-note">Admin note (optional)</Label>
                    <Input id="topup-note" placeholder="e.g. Manual credit" value={adminNote} onChange={e => setAdminNote(e.target.value)} />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => setTopUpOpen(false)} disabled={topUpMutation.isPending}>Cancel</Button>
                    <Button className="flex-1" onClick={() => topUpMutation.mutate()} disabled={topUpMutation.isPending || !topUpAmount || parseFloat(topUpAmount) <= 0}>
                      {topUpMutation.isPending ? "Processing..." : "Top Up"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function AgentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: agents = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: adminService.getAgents,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminService.toggleAgentActive(id),
    onSuccess: (updated) => {
      qc.setQueryData<AdminAgent[]>(["admin-agents"], old =>
        old?.map(a => a.id === updated.id ? updated : a) ?? []
      );
      toast.success(updated.active ? "Agent activated" : "Agent deactivated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = useMemo(() => agents.filter(a => {
    const matchSearch =
      a.businessName.toLowerCase().includes(search.toLowerCase()) ||
      a.referralCode.toLowerCase().includes(search.toLowerCase()) ||
      a.userId.includes(search);
    const matchStatus =
      filterStatus === "ALL" ||
      (filterStatus === "ACTIVE" && a.active) ||
      (filterStatus === "INACTIVE" && !a.active);
    return matchSearch && matchStatus;
  }), [agents, search, filterStatus]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by business name or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search agents"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} agent{filtered.length !== 1 ? "s" : ""} found</p>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading agents...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No agents found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground">Business</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Code</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Total Sales</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Total Profit</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(agent => (
                  <>
                    <tr key={agent.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{agent.businessName}</p>
                          <p className="text-xs text-muted-foreground hidden sm:block">{formatDate(agent.createdAt)}</p>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{agent.referralCode}</code>
                      </td>
                      <td className="p-4 hidden lg:table-cell font-semibold">{formatCurrency(agent.totalSales)}</td>
                      <td className="p-4 hidden lg:table-cell text-success font-semibold">{formatCurrency(agent.totalProfit)}</td>
                      <td className="p-4">
                        {agent.active ? (
                          <Badge variant="success" className="text-[10px]">Active</Badge>
                        ) : (
                          <Badge variant="muted" className="text-[10px]">Inactive</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleMutation.mutate(agent.id)}
                            disabled={toggleMutation.isPending}
                            className="h-8 px-2 text-xs"
                            aria-label={agent.active ? "Deactivate agent" : "Activate agent"}
                          >
                            {agent.active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setExpandedId(expandedId === agent.id ? null : agent.id)}
                            aria-label={expandedId === agent.id ? "Collapse details" : "Expand details"}
                          >
                            {expandedId === agent.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === agent.id && <AgentDetail key={`detail-${agent.id}`} agent={agent} />}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
