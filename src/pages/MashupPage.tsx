import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, RefreshCw, RotateCcw, DollarSign, TrendingUp,
  CheckCircle2, XCircle, AlertCircle, Zap, PackageSearch,
} from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/lib/adminService";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AdminMashupPackage } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const NETWORKS = ["ALL", "MTN", "TELECEL", "AIRTELTIGO"];
const MASHUP_STATUSES = ["ACTIVE", "INACTIVE"];

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ pkg }: { pkg: AdminMashupPackage }) {
  if (!pkg.available) return <Badge variant="destructive" className="text-[10px] gap-1"><XCircle className="h-3 w-3" />Unavailable</Badge>;
  if (pkg.status === "ACTIVE" && pkg.purchasable) return <Badge variant="success" className="text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" />Active</Badge>;
  if (pkg.status === "ACTIVE") return <Badge variant="warning" className="text-[10px] gap-1"><AlertCircle className="h-3 w-3" />No Price</Badge>;
  return <Badge variant="muted" className="text-[10px] gap-1"><XCircle className="h-3 w-3" />Inactive</Badge>;
}

// ── Network pill ──────────────────────────────────────────────────────────────
function NetworkPill({ network }: { network: string }) {
  const colours: Record<string, string> = {
    MTN: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
    TELECEL: "bg-red-500/15 text-red-600 dark:text-red-400",
    AIRTELTIGO: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${colours[network] ?? "bg-muted text-muted-foreground"}`}>
      {network}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, colour }: { label: string; value: string | number; icon: React.ElementType; colour: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colour}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-bold text-lg leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MashupPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterNetwork, setFilterNetwork] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterAvailable, setFilterAvailable] = useState("ALL");
  const [priceTarget, setPriceTarget] = useState<AdminMashupPackage | null>(null);

  const { data: packages = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-mashup-packages"],
    queryFn: adminService.getMashupPackages,
  });

  const syncMutation = useMutation({
    mutationFn: adminService.syncMashupPackages,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["admin-mashup-packages"] });
      toast.success(`Synced — ${result.created} created, ${result.updated} updated, ${result.unavailable} unavailable`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminService.setMashupStatus(id, status),
    onSuccess: (updated) => {
      qc.setQueryData<AdminMashupPackage[]>(["admin-mashup-packages"], old =>
        old?.map(p => p.id === updated.id ? updated : p) ?? []);
      toast.success("Status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = useMemo(() => packages.filter(p => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      (p.slug ?? "").toLowerCase().includes(q) ||
      (p.network ?? "").toLowerCase().includes(q) ||
      String(p.specialOfferPackageId ?? "").includes(q);
    const matchNetwork = filterNetwork === "ALL" || p.network === filterNetwork;
    const matchStatus  = filterStatus === "ALL"  || p.status === filterStatus;
    const matchAvail   = filterAvailable === "ALL"
      || (filterAvailable === "YES" && p.available)
      || (filterAvailable === "NO"  && !p.available);
    return matchSearch && matchNetwork && matchStatus && matchAvail;
  }), [packages, search, filterNetwork, filterStatus, filterAvailable]);

  // ── Summary stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:       packages.length,
    active:      packages.filter(p => p.status === "ACTIVE" && p.available).length,
    purchasable: packages.filter(p => p.purchasable).length,
    noPrice:     packages.filter(p => p.available && p.sellingPrice == null).length,
  }), [packages]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Mashup Packages
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            External special-offer bundles — set prices &amp; manage availability
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending || isFetching}
          className="gap-2 shrink-0"
          id="mashup-sync-btn"
        >
          <RotateCcw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          {syncMutation.isPending ? "Syncing…" : "Sync from External"}
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Packages"   value={stats.total}       icon={PackageSearch} colour="bg-primary/10 text-primary" />
        <StatCard label="Active & Live"    value={stats.active}      icon={CheckCircle2}  colour="bg-green-500/10 text-green-600 dark:text-green-400" />
        <StatCard label="Purchasable"      value={stats.purchasable} icon={TrendingUp}    colour="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
        <StatCard label="Needs Price"      value={stats.noPrice}     icon={AlertCircle}   colour="bg-orange-500/10 text-orange-600 dark:text-orange-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="mashup-search"
            placeholder="Search by name, slug, network, ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search mashup packages"
          />
        </div>

        <Select value={filterNetwork} onValueChange={setFilterNetwork}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by network">
            <SelectValue placeholder="Network" />
          </SelectTrigger>
          <SelectContent>
            {NETWORKS.map(n => <SelectItem key={n} value={n}>{n === "ALL" ? "All Networks" : n}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {MASHUP_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterAvailable} onValueChange={setFilterAvailable}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by availability">
            <SelectValue placeholder="Available" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="YES">Available</SelectItem>
            <SelectItem value="NO">Unavailable</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Refresh list">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} package{filtered.length !== 1 ? "s" : ""} found
      </p>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading mashup packages…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <PackageSearch className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground text-sm">No packages found. Try syncing from external.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground">Package</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Network</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Cost</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Selling Price</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Margin</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Avail.</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden xl:table-cell">Last Seen</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(pkg => {
                  const margin = pkg.sellingPrice != null && pkg.costPrice != null
                    ? pkg.sellingPrice - pkg.costPrice
                    : null;
                  const marginPct = margin != null && pkg.costPrice && pkg.costPrice > 0
                    ? ((margin / pkg.costPrice) * 100).toFixed(1)
                    : null;

                  return (
                    <tr key={pkg.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      {/* Package */}
                      <td className="p-4">
                        <div>
                          <p className="font-medium leading-tight">{pkg.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {pkg.slug && <span className="text-[10px] text-muted-foreground font-mono">{pkg.slug}</span>}
                            {pkg.specialOfferPackageId != null && (
                              <span className="text-[10px] text-muted-foreground">#{pkg.specialOfferPackageId}</span>
                            )}
                            {pkg.dataSize && (
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium">{pkg.dataSize}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Network */}
                      <td className="p-4 hidden sm:table-cell">
                        <NetworkPill network={pkg.network} />
                      </td>

                      {/* Cost */}
                      <td className="p-4 hidden md:table-cell text-muted-foreground text-xs">
                        {pkg.costPrice != null ? formatCurrency(pkg.costPrice) : <span className="text-muted-foreground/50">—</span>}
                      </td>

                      {/* Selling Price */}
                      <td className="p-4">
                        {pkg.sellingPrice != null ? (
                          <span className="font-semibold">{formatCurrency(pkg.sellingPrice)}</span>
                        ) : (
                          <span className="text-xs text-orange-500 font-medium">Not set</span>
                        )}
                      </td>

                      {/* Margin */}
                      <td className="p-4 hidden md:table-cell">
                        {margin != null ? (
                          <div>
                            <span className={`text-xs font-semibold ${margin >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                              {formatCurrency(margin)}
                            </span>
                            {marginPct && (
                              <span className="text-[10px] text-muted-foreground ml-1">({marginPct}%)</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">—</span>
                        )}
                      </td>

                      {/* Status toggle */}
                      <td className="p-4">
                        <Select
                          value={pkg.status}
                          onValueChange={status => statusMutation.mutate({ id: pkg.id, status })}
                          disabled={!pkg.available || statusMutation.isPending}
                        >
                          <SelectTrigger
                            className="h-7 w-28 text-xs"
                            id={`mashup-status-${pkg.id}`}
                            aria-label="Change mashup status"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MASHUP_STATUSES.map(s => (
                              <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Available */}
                      <td className="p-4 hidden lg:table-cell">
                        <StatusBadge pkg={pkg} />
                      </td>

                      {/* Last seen */}
                      <td className="p-4 text-xs text-muted-foreground hidden xl:table-cell">
                        {pkg.lastSeenAt ? formatDate(pkg.lastSeenAt) : "—"}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => setPriceTarget(pkg)}
                          id={`set-price-${pkg.id}`}
                          aria-label={`Set selling price for ${pkg.name}`}
                        >
                          <DollarSign className="h-3 w-3" />
                          Set Price
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Set Price Dialog */}
      <SetPriceDialog
        pkg={priceTarget}
        onClose={() => setPriceTarget(null)}
        onSaved={(updated) => {
          qc.setQueryData<AdminMashupPackage[]>(["admin-mashup-packages"], old =>
            old?.map(p => p.id === updated.id ? updated : p) ?? []);
          setPriceTarget(null);
        }}
      />
    </div>
  );
}

// ── Set Price Dialog ──────────────────────────────────────────────────────────
function SetPriceDialog({
  pkg, onClose, onSaved,
}: {
  pkg: AdminMashupPackage | null;
  onClose: () => void;
  onSaved: (updated: AdminMashupPackage) => void;
}) {
  const [price, setPrice] = useState("");

  const mutation = useMutation({
    mutationFn: ({ id, sellingPrice }: { id: string; sellingPrice: number }) =>
      adminService.setMashupPrice(id, sellingPrice),
    onSuccess: (updated) => {
      toast.success("Selling price updated — package is now Active");
      onSaved(updated);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleOpen = (open: boolean) => { if (!open) onClose(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(price);
    if (!pkg || isNaN(num) || num <= 0) { toast.error("Enter a valid price greater than 0"); return; }
    mutation.mutate({ id: pkg.id, sellingPrice: num });
  };

  const costPrice  = pkg?.costPrice ?? null;
  const previewNum = parseFloat(price);
  const margin     = !isNaN(previewNum) && costPrice != null ? previewNum - costPrice : null;

  return (
    <Dialog open={!!pkg} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" /> Set Selling Price
          </DialogTitle>
          <DialogDescription>
            {pkg ? (
              <>
                <strong>{pkg.name}</strong>
                {pkg.network && <> · <NetworkPill network={pkg.network} /></>}
              </>
            ) : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info row */}
          {pkg && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Cost Price</p>
                <p className="font-semibold">
                  {costPrice != null ? formatCurrency(costPrice) : <span className="text-muted-foreground">Hidden</span>}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Current Price</p>
                <p className="font-semibold">
                  {pkg.sellingPrice != null ? formatCurrency(pkg.sellingPrice) : <span className="text-muted-foreground/60">Not set</span>}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="mashup-price-input">New Selling Price (GHS)</Label>
            <Input
              id="mashup-price-input"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 12.50"
              value={price}
              onChange={e => setPrice(e.target.value)}
              autoFocus
            />
          </div>

          {/* Live margin preview */}
          {margin !== null && (
            <div className={`text-sm rounded-lg px-3 py-2 flex items-center justify-between ${margin >= 0 ? "bg-green-500/10" : "bg-destructive/10"}`}>
              <span className="text-muted-foreground text-xs">Profit margin</span>
              <span className={`font-semibold ${margin >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                {formatCurrency(margin)}
                {costPrice && costPrice > 0 && (
                  <span className="text-xs font-normal ml-1">
                    ({((margin / costPrice) * 100).toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="flex-1">
              {mutation.isPending ? "Saving…" : "Save Price"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
