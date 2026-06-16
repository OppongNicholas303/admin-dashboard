import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, RefreshCw, Tag, Users, Package,
  ChevronDown, ChevronUp, Pencil, AlertCircle, Check,
} from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/lib/adminService";
import { formatCurrency } from "@/lib/utils";
import type { AdminAgent, Bundle, AgentBundlePricing, AdminMashupPackage, AgentMashupPricing } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type PricingItem = {
  id: string;
  type: "STANDARD" | "MASHUP";
  code: string;
  name: string;
  dataSize: string;
  network: string;
  costPrice: number;
  sellingPrice: number;
  status: string;
  minimumBasePrice: number;
};

type AgentPricing = AgentBundlePricing | AgentMashupPricing;

// ─── Set Price Dialog ──────────────────────────────────────────────────────────
function SetPriceDialog({
  open, onClose,
  agent, bundle, existing,
}: {
  open: boolean;
  onClose: () => void;
  agent: AdminAgent;
  bundle: PricingItem;
  existing: AgentPricing | undefined;
}) {
  const qc = useQueryClient();
  const [basePrice, setBasePrice] = useState(
    existing?.basePrice?.toString() ?? bundle.sellingPrice.toString()
  );
  const [sellingPrice, setSellingPrice] = useState(
    existing?.sellingPrice?.toString() ?? ""
  );

  const mutation = useMutation({
    mutationFn: () =>
      bundle.type === "MASHUP"
        ? adminService.setAgentMashupBasePrice(
            agent.id,
            bundle.id,
            parseFloat(basePrice),
            sellingPrice ? parseFloat(sellingPrice) : undefined
          )
        : adminService.setAgentBasePrice(
            agent.id,
            bundle.id,
            parseFloat(basePrice),
            sellingPrice ? parseFloat(sellingPrice) : undefined
          ),
    onSuccess: () => {
      toast.success(`Price updated for ${agent.businessName} — ${bundle.name}`);
      qc.invalidateQueries({ queryKey: ["agent-pricing", agent.id] });
      qc.invalidateQueries({ queryKey: [bundle.type === "MASHUP" ? "mashup-pricing" : "bundle-pricing", bundle.id] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const basePriceNum = parseFloat(basePrice) || 0;
  const sellingPriceNum = parseFloat(sellingPrice) || 0;
  const agentProfit = sellingPrice ? sellingPriceNum - basePriceNum : null;
  const platformProfit = basePriceNum - bundle.costPrice;
  const isValid =
    basePriceNum >= bundle.minimumBasePrice &&
    (!sellingPrice || sellingPriceNum >= basePriceNum);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Set Agent Base Price
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-foreground">{agent.businessName}</span>
            {" — "}
            <span className="font-semibold text-foreground">{bundle.name} ({bundle.dataSize})</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Info row */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">
                {bundle.type === "MASHUP" ? "Minimum base price" : "Platform cost price"}
              </p>
              <p className="font-semibold">{formatCurrency(bundle.minimumBasePrice)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Platform selling price</p>
              <p className="font-semibold">{formatCurrency(bundle.sellingPrice)}</p>
            </div>
          </div>

          {/* Base price — what platform earns */}
          <div className="space-y-1.5">
            <Label htmlFor="base-price">
              Agent Base Price (GHS)
              <span className="ml-1 text-xs text-muted-foreground">
                — platform earns this per sale
              </span>
            </Label>
            <Input
              id="base-price"
              type="number"
              step="0.01"
              min={bundle.minimumBasePrice}
              value={basePrice}
              onChange={e => setBasePrice(e.target.value)}
            />
            {basePriceNum < bundle.minimumBasePrice && basePriceNum > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Cannot be below {formatCurrency(bundle.minimumBasePrice)}
              </p>
            )}
            {basePriceNum >= bundle.minimumBasePrice && basePriceNum > 0 && (
              <p className="text-xs text-green-500 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Platform earns {formatCurrency(platformProfit)} profit per sale
              </p>
            )}
          </div>

          {/* Selling price — what agent charges customers (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="selling-price">
              Agent Selling Price (GHS)
              <span className="ml-1 text-xs text-muted-foreground">
                — optional, agent can set this themselves
              </span>
            </Label>
            <Input
              id="selling-price"
              type="number"
              step="0.01"
              min={basePriceNum}
              placeholder={`Min ${formatCurrency(basePriceNum)}`}
              value={sellingPrice}
              onChange={e => setSellingPrice(e.target.value)}
            />
            {sellingPrice && sellingPriceNum < basePriceNum && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Cannot be below base price {formatCurrency(basePriceNum)}
              </p>
            )}
            {agentProfit !== null && agentProfit >= 0 && (
              <p className="text-xs text-blue-500 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Agent earns {formatCurrency(agentProfit)} profit per sale
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1"
              disabled={!isValid || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Saving..." : "Save Price"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk Price Dialog ─────────────────────────────────────────────────────────
function BulkPriceDialog({
  open, onClose, bundle,
}: {
  open: boolean;
  onClose: () => void;
  bundle: PricingItem;
}) {
  const qc = useQueryClient();
  const [basePrice, setBasePrice] = useState(bundle.sellingPrice.toString());

  const mutation = useMutation({
    mutationFn: () => bundle.type === "MASHUP"
      ? adminService.setBulkMashupBasePrice(bundle.id, parseFloat(basePrice))
      : adminService.setBulkBasePrice(bundle.id, parseFloat(basePrice)),
    onSuccess: (result) => {
      toast.success(`Updated ${result.agentsUpdated} agents for ${bundle.name}`);
      qc.invalidateQueries({ queryKey: [bundle.type === "MASHUP" ? "mashup-pricing" : "bundle-pricing", bundle.id] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const basePriceNum = parseFloat(basePrice) || 0;
  const isValid = basePriceNum >= bundle.minimumBasePrice;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Bulk Update — All Agents
          </DialogTitle>
          <DialogDescription>
            Apply the same base price to <strong>all registered agents</strong> for{" "}
            <span className="font-semibold text-foreground">{bundle.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-amber-600 dark:text-amber-400">
              This will override existing base prices for all agents.
              Any agent whose selling price is below the new base will also be reset.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">
                {bundle.type === "MASHUP" ? "Minimum base" : "Platform cost"}
              </p>
              <p className="font-semibold">{formatCurrency(bundle.minimumBasePrice)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current selling price</p>
              <p className="font-semibold">{formatCurrency(bundle.sellingPrice)}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-base">New Base Price for All Agents (GHS)</Label>
            <Input
              id="bulk-base"
              type="number"
              step="0.01"
              min={bundle.minimumBasePrice}
              value={basePrice}
              onChange={e => setBasePrice(e.target.value)}
            />
            {!isValid && basePriceNum > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Cannot be below {formatCurrency(bundle.minimumBasePrice)}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              disabled={!isValid || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Updating..." : "Update All Agents"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bundle Row with agent pricing breakdown ───────────────────────────────────
function BundlePricingRow({
  bundle, agents,
}: {
  bundle: PricingItem;
  agents: AdminAgent[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [setPriceTarget, setSetPriceTarget] = useState<AdminAgent | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const { data: pricings = [], isLoading } = useQuery({
    queryKey: [bundle.type === "MASHUP" ? "mashup-pricing" : "bundle-pricing", bundle.id],
    queryFn: () => bundle.type === "MASHUP"
      ? adminService.getMashupPricingForBundle(bundle.id)
      : adminService.getPricingForBundle(bundle.id),
    enabled: expanded,
  });

  const pricingMap = useMemo(() => {
    const map: Record<string, AgentPricing> = {};
    pricings.forEach(p => { map[p.agentId] = p; });
    return map;
  }, [pricings]);

  const configuredCount = pricings.length;
  const networkColor =
    bundle.network?.toLowerCase() === "mtn" ? "text-yellow-500" :
    bundle.network?.toLowerCase() === "telecel" ? "text-red-500" :
    "text-blue-500";

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/20 transition-colors">
        <td className="p-4">
          <div className="flex items-center gap-3">
            <span className={`font-bold text-xs w-8 ${networkColor}`}>
              {bundle.network?.toUpperCase().slice(0, 3)}
            </span>
            <div>
              <p className="font-medium text-sm">{bundle.name}</p>
              <p className="text-xs text-muted-foreground">{bundle.dataSize}</p>
            </div>
          </div>
        </td>
        <td className="p-4 text-sm">{formatCurrency(bundle.costPrice)}</td>
        <td className="p-4 text-sm font-medium">{formatCurrency(bundle.sellingPrice)}</td>
        <td className="p-4">
          <Badge variant={configuredCount > 0 ? "success" : "muted"} className="text-[10px]">
            {configuredCount}/{agents.length} agents
          </Badge>
        </td>
        <td className="p-4">
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={() => setBulkOpen(true)}
            >
              <Users className="h-3 w-3 mr-1" /> Bulk Set
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </td>
      </tr>

      {/* Expanded agent breakdown */}
      {expanded && (
        <tr>
          <td colSpan={5} className="p-0">
            <div className="bg-muted/10 border-b px-4 py-3">
              {isLoading ? (
                <p className="text-xs text-muted-foreground py-2">Loading agent prices...</p>
              ) : agents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No agents registered yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b">
                        <th className="text-left py-2 font-medium">Agent</th>
                        <th className="text-left py-2 font-medium">Code</th>
                        <th className="text-left py-2 font-medium">Base Price</th>
                        <th className="text-left py-2 font-medium">Selling Price</th>
                        <th className="text-left py-2 font-medium">Agent Profit</th>
                        <th className="text-right py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map(agent => {
                        const p = pricingMap[agent.id];
                        const base = p?.basePrice ?? bundle.sellingPrice;
                        const selling = p?.sellingPrice ?? bundle.sellingPrice;
                        const profit = selling - base;
                        const hasCustom = !!p;

                        return (
                          <tr key={agent.id} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="py-2 pr-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                  {agent.businessName.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium">{agent.businessName}</span>
                                {!hasCustom && (
                                  <Badge variant="muted" className="text-[9px] h-3.5 px-1">default</Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-2 pr-4">
                              <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                                {agent.referralCode}
                              </code>
                            </td>
                            <td className="py-2 pr-4 font-semibold">
                              {formatCurrency(base)}
                            </td>
                            <td className="py-2 pr-4">
                              {formatCurrency(selling)}
                            </td>
                            <td className="py-2 pr-4">
                              <span className={profit > 0 ? "text-green-500 font-semibold" : "text-muted-foreground"}>
                                {profit > 0 ? `+${formatCurrency(profit)}` : formatCurrency(profit)}
                              </span>
                            </td>
                            <td className="py-2 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => setSetPriceTarget(agent)}
                              >
                                <Pencil className="h-3 w-3 mr-1" /> Edit
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}

      {/* Set price dialog */}
      {setPriceTarget && (
        <SetPriceDialog
          open={!!setPriceTarget}
          onClose={() => setSetPriceTarget(null)}
          agent={setPriceTarget}
          bundle={bundle}
          existing={pricingMap[setPriceTarget.id]}
        />
      )}

      {/* Bulk price dialog */}
      <BulkPriceDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        bundle={bundle}
      />
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AgentPricingPage() {
  const [search, setSearch] = useState("");
  const [networkFilter, setNetworkFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"by-bundle" | "by-agent">("by-bundle");
  const [selectedAgent, setSelectedAgent] = useState<string>("ALL");

  const { data: bundles = [], isLoading: loadingBundles, refetch: refetchBundles } = useQuery({
    queryKey: ["admin-bundles"],
    queryFn: adminService.getBundles,
  });

  const { data: mashupPackages = [], isLoading: loadingMashupPackages, refetch: refetchMashupPackages } = useQuery({
    queryKey: ["admin-mashup-packages"],
    queryFn: adminService.getMashupPackages,
  });

  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: adminService.getAgents,
  });

  const activeAgents = agents.filter(a => a.active);

  const pricingItems = useMemo<PricingItem[]>(() => {
    const standardItems = bundles
      .filter((bundle) => bundle.status === "ACTIVE")
      .map((bundle) => ({
        id: bundle.id,
        type: "STANDARD" as const,
        code: bundle.code,
        name: bundle.name,
        dataSize: bundle.dataSize,
        network: bundle.network,
        costPrice: bundle.costPrice,
        sellingPrice: bundle.sellingPrice,
        status: bundle.status,
        minimumBasePrice: bundle.costPrice,
      }));

    const mashupItems = mashupPackages
      .filter((pkg) => pkg.status === "ACTIVE" && pkg.available && pkg.sellingPrice != null)
      .map((pkg) => ({
        id: pkg.id,
        type: "MASHUP" as const,
        code: pkg.slug ?? String(pkg.specialOfferPackageId ?? pkg.id),
        name: pkg.name,
        dataSize: pkg.dataSize ?? (pkg.dataAmountMb != null ? `${pkg.dataAmountMb}MB` : "Mashup"),
        network: pkg.network,
        costPrice: pkg.costPrice ?? pkg.sellingPrice ?? 0,
        sellingPrice: pkg.sellingPrice ?? 0,
        status: pkg.status,
        minimumBasePrice: pkg.sellingPrice ?? 0,
      }));

    return [...standardItems, ...mashupItems];
  }, [bundles, mashupPackages]);

  const filteredBundles = useMemo(() => {
    return pricingItems
      .filter(b => networkFilter === "ALL" || b.network?.toUpperCase() === networkFilter)
      .filter(b =>
        !search ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.code.toLowerCase().includes(search.toLowerCase()) ||
        b.type.toLowerCase().includes(search.toLowerCase())
      );
  }, [pricingItems, networkFilter, search]);

  // By-agent view: show selected agent's pricings
  const { data: agentPricings = [], isLoading: loadingAgentPricings } = useQuery({
    queryKey: ["agent-pricing", selectedAgent],
    queryFn: async () => {
      const [standard, mashup] = await Promise.all([
        adminService.getAgentPricing(selectedAgent),
        adminService.getAgentMashupPricing(selectedAgent),
      ]);
      return [...standard, ...mashup];
    },
    enabled: viewMode === "by-agent" && selectedAgent !== "ALL",
  });

  const agentPricingMap = useMemo(() => {
    const map: Record<string, AgentPricing> = {};
    agentPricings.forEach(p => {
      const key = "mashupBundleId" in p ? p.mashupBundleId : p.bundleId;
      if (key) map[key] = p;
    });
    return map;
  }, [agentPricings]);

  const selectedAgentData = agents.find(a => a.id === selectedAgent);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Agent Pricing
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set different base prices per agent for standard and Mashup bundles. Agents earn everything above their base price.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "by-bundle" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("by-bundle")}
          >
            <Package className="h-4 w-4 mr-1.5" /> By Bundle
          </Button>
          <Button
            variant={viewMode === "by-agent" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("by-agent")}
          >
            <Users className="h-4 w-4 mr-1.5" /> By Agent
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Bundles", value: pricingItems.length, icon: Package },
          { label: "Active Agents", value: activeAgents.length, icon: Users },
          { label: "Price Configs", value: "—", icon: Tag },
          { label: "Networks", value: [...new Set(pricingItems.map(b => b.network?.toUpperCase()))].filter(Boolean).length, icon: RefreshCw },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── By Bundle View ── */}
      {viewMode === "by-bundle" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bundles..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Networks</SelectItem>
                <SelectItem value="MTN">MTN</SelectItem>
                <SelectItem value="TELECEL">Telecel</SelectItem>
                <SelectItem value="AIRTELTIGO">AirtelTigo</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => { refetchBundles(); refetchMashupPackages(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {loadingBundles || loadingMashupPackages || loadingAgents ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
              ) : filteredBundles.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No bundles found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-4 font-medium text-muted-foreground">Bundle</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Cost Price</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Selling Price</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Agent Configs</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBundles.map(bundle => (
                      <BundlePricingRow
                        key={`${bundle.type}-${bundle.id}`}
                        bundle={bundle}
                        agents={activeAgents}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── By Agent View ── */}
      {viewMode === "by-agent" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Select an agent..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Select an agent</SelectItem>
                {agents.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.businessName} ({a.referralCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAgent === "ALL" ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Select an agent to view their pricing configuration.</p>
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {selectedAgentData?.businessName.charAt(0).toUpperCase()}
                  </div>
                  {selectedAgentData?.businessName}
                  <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono ml-1">
                    {selectedAgentData?.referralCode}
                  </code>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {loadingAgentPricings ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-4 font-medium text-muted-foreground">Bundle</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Platform Base</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Agent Base Price</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Selling Price</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Agent Profit</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricingItems.map(bundle => {
                        const p = agentPricingMap[bundle.id];
                        const base = p?.basePrice ?? bundle.sellingPrice;
                        const selling = p?.sellingPrice ?? bundle.sellingPrice;
                        return (
                          <tr key={`${bundle.type}-${bundle.id}`} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="p-4">
                              <p className="font-medium">{bundle.name}</p>
                              <p className="text-xs text-muted-foreground">{bundle.network?.toUpperCase()} · {bundle.dataSize}</p>
                            </td>
                            <td className="p-4 text-sm">{formatCurrency(bundle.sellingPrice)}</td>
                            <td className="p-4 font-semibold text-sm">
                              {formatCurrency(base)}
                              {!p && <Badge variant="muted" className="ml-1.5 text-[9px]">default</Badge>}
                            </td>
                            <td className="p-4 text-sm">{formatCurrency(selling)}</td>
                            <td className="p-4 text-sm">
                              <span className={selling - base > 0 ? "text-green-500 font-semibold" : "text-muted-foreground"}>
                                {selling - base > 0 ? `+${formatCurrency(selling - base)}` : formatCurrency(selling - base)}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {selectedAgentData && (
                                <SetPriceDialogTrigger
                                  agent={selectedAgentData}
                                  bundle={bundle}
                                  existing={p}
                                  onSaved={() => {}}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// Inline trigger button that opens SetPriceDialog
function SetPriceDialogTrigger({ agent, bundle, existing, onSaved }: {
  agent: AdminAgent;
  bundle: PricingItem;
  existing: AgentPricing | undefined;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>
        <Pencil className="h-3 w-3 mr-1" /> Edit
      </Button>
      {open && (
        <SetPriceDialog
          open={open}
          onClose={() => { setOpen(false); onSaved(); }}
          agent={agent}
          bundle={bundle}
          existing={existing}
        />
      )}
    </>
  );
}
