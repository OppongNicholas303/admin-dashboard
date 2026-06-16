import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/lib/adminService";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { WithdrawalRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type ActionType = "approve" | "reject";

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED")
    return <Badge variant="success" className="text-[10px] gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>;
  if (status === "REJECTED")
    return <Badge variant="destructive" className="text-[10px] gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
  return <Badge variant="warning" className="text-[10px] gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
}

export default function WithdrawalsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [actionTarget, setActionTarget] = useState<{ req: WithdrawalRequest; type: ActionType } | null>(null);
  const [note, setNote] = useState("");

  const { data: withdrawals = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-withdrawals", filterStatus],
    queryFn: () => adminService.getWithdrawals(filterStatus !== "ALL" ? filterStatus : undefined),
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      adminService.approveWithdrawal(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Withdrawal approved (Manual transfer required)");
      setActionTarget(null);
      setNote("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      adminService.rejectWithdrawal(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Withdrawal rejected — wallet refunded");
      setActionTarget(null);
      setNote("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = withdrawals.filter(w => {
    const s = search.toLowerCase();
    return !s ||
      w.accountName.toLowerCase().includes(s) ||
      w.momoNumber.includes(s) ||
      w.reference.toLowerCase().includes(s);
  });

  const pendingCount = withdrawals.filter(w => w.status === "PENDING").length;
  const isActing = approveMutation.isPending || rejectMutation.isPending;

  const handleAction = () => {
    if (!actionTarget) return;
    const payload = { id: actionTarget.req.id, note };
    if (actionTarget.type === "approve") approveMutation.mutate(payload);
    else rejectMutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20 text-warning text-sm font-medium">
          <Clock className="h-4 w-4 flex-shrink-0" />
          {pendingCount} withdrawal request{pendingCount !== 1 ? "s" : ""} awaiting your approval
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, number, reference..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search withdrawals"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} request{filtered.length !== 1 ? "s" : ""}
      </p>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading withdrawals...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No withdrawal requests found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground">Agent</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">MoMo Details</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Reference</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Requested</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => (
                  <tr key={req.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <p className="font-medium">{req.accountName}</p>
                      <p className="text-xs text-muted-foreground font-mono">…{req.agentUserId.slice(-8)}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{req.momoNumber}</p>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">{req.momoProvider}</p>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{req.reference}</code>
                    </td>
                    <td className="p-4 font-bold">{formatCurrency(req.amount)}</td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <StatusBadge status={req.status} />
                        {req.adminNote && (
                          <p className="text-xs text-muted-foreground italic max-w-[140px] truncate" title={req.adminNote}>
                            "{req.adminNote}"
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground hidden lg:table-cell">
                      {formatDate(req.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        {req.status === "PENDING" ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-success hover:text-success hover:bg-success/10"
                              onClick={() => { setActionTarget({ req, type: "approve" }); setNote(""); }}
                              aria-label="Approve withdrawal"
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => { setActionTarget({ req, type: "reject" }); setNote(""); }}
                              aria-label="Reject withdrawal"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground pr-2">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={!!actionTarget} onOpenChange={open => !open && setActionTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionTarget?.type === "approve"
                ? <><CheckCircle className="h-5 w-5 text-success" />Approve Withdrawal</>
                : <><XCircle className="h-5 w-5 text-destructive" />Reject Withdrawal</>}
            </DialogTitle>
            <DialogDescription>
              {actionTarget?.type === "approve"
                ? `This will mark the request as approved. Remember to manually transfer ${formatCurrency(actionTarget?.req.amount ?? 0)} to ${actionTarget?.req.momoNumber} (${actionTarget?.req.momoProvider}) via MoMo.`
                : `This will reject the request and refund ${formatCurrency(actionTarget?.req.amount ?? 0)} back to the agent's wallet.`}
            </DialogDescription>
          </DialogHeader>

          {actionTarget && (
            <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account name</span>
                <span className="font-medium">{actionTarget.req.accountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">MoMo number</span>
                <span className="font-medium">{actionTarget.req.momoNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium uppercase">{actionTarget.req.momoProvider}</span>
              </div>
              <div className="flex justify-between border-t pt-1.5 mt-1">
                <span className="text-muted-foreground font-medium">Amount</span>
                <span className="font-bold text-foreground text-base">{formatCurrency(actionTarget.req.amount)}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="admin-note">Admin note (optional)</Label>
            <Input
              id="admin-note"
              placeholder={actionTarget?.type === "approve" ? "e.g. Verified, processed" : "e.g. Invalid account details"}
              value={note}
              onChange={e => setNote(e.target.value)}
              disabled={isActing}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActionTarget(null)} disabled={isActing} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isActing}
              className={`flex-1 ${actionTarget?.type === "approve" ? "bg-success hover:bg-success/90 text-success-foreground" : ""}`}
              variant={actionTarget?.type === "reject" ? "destructive" : "default"}
            >
              {isActing
                ? "Processing..."
                : actionTarget?.type === "approve"
                ? "Confirm & Send"
                : "Confirm Reject"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
