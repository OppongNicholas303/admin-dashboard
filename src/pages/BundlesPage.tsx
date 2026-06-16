import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Pencil, Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/lib/adminService";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Bundle } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const NETWORKS = ["mtn", "telecel", "airteltigo"];
const STATUSES = ["ACTIVE", "INACTIVE", "OUT_OF_STOCK"];

const bundleSchema = z.object({
  code: z.string().min(1, "Code is required").toUpperCase(),
  name: z.string().min(1, "Name is required"),
  dataSize: z.string().min(1, "Data size is required"),
  network: z.string().min(1, "Network is required"),
  costPrice: z.coerce.number().positive("Must be positive"),
  sellingPrice: z.coerce.number().positive("Must be positive"),
  description: z.string().default(""),
});

type BundleForm = z.infer<typeof bundleSchema>;

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <Badge variant="success" className="text-[10px]">Active</Badge>;
  if (status === "OUT_OF_STOCK") return <Badge variant="warning" className="text-[10px]">Out of Stock</Badge>;
  return <Badge variant="muted" className="text-[10px]">Inactive</Badge>;
}

export default function BundlesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterNetwork, setFilterNetwork] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [editBundle, setEditBundle] = useState<Bundle | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bundle | null>(null);

  const { data: bundles = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-bundles"],
    queryFn: adminService.getBundles,
  });

  const createMutation = useMutation({
    mutationFn: adminService.createBundle,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bundles"] }); toast.success("Bundle created"); setIsCreateOpen(false); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<BundleForm> }) =>
      adminService.updateBundle(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData<Bundle[]>(["admin-bundles"], old => old?.map(b => b.id === updated.id ? updated : b) ?? []);
      toast.success("Bundle updated");
      setEditBundle(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminService.setBundleStatus(id, status),
    onSuccess: (updated) => {
      qc.setQueryData<Bundle[]>(["admin-bundles"], old => old?.map(b => b.id === updated.id ? updated : b) ?? []);
      toast.success("Status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteBundle(id),
    onSuccess: () => {
      qc.setQueryData<Bundle[]>(["admin-bundles"], old => old?.filter(b => b.id !== deleteTarget?.id) ?? []);
      toast.success("Bundle deleted");
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = useMemo(() => bundles.filter(b => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase());
    const matchNetwork = filterNetwork === "ALL" || b.network === filterNetwork;
    const matchStatus = filterStatus === "ALL" || b.status === filterStatus;
    return matchSearch && matchNetwork && matchStatus;
  }), [bundles, search, filterNetwork, filterStatus]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search bundles..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" aria-label="Search bundles" />
        </div>
        <Select value={filterNetwork} onValueChange={setFilterNetwork}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by network">
            <SelectValue placeholder="Network" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Networks</SelectItem>
            {NETWORKS.map(n => <SelectItem key={n} value={n}>{n.toUpperCase()}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add Bundle</Button>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} bundle{filtered.length !== 1 ? "s" : ""} found</p>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading bundles...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No bundles found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground">Bundle</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Network</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Cost</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Price</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Updated</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(bundle => (
                  <tr key={bundle.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{bundle.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{bundle.code} · {bundle.dataSize}</p>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span className="uppercase text-xs font-semibold">{bundle.network}</span>
                    </td>
                    <td className="p-4 hidden md:table-cell text-muted-foreground">{formatCurrency(bundle.costPrice)}</td>
                    <td className="p-4 font-semibold">{formatCurrency(bundle.sellingPrice)}</td>
                    <td className="p-4">
                      <Select
                        value={bundle.status}
                        onValueChange={status => statusMutation.mutate({ id: bundle.id, status })}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs" aria-label="Change status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground hidden lg:table-cell">{formatDate(bundle.updatedAt)}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditBundle(bundle)} aria-label="Edit bundle">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(bundle)} aria-label="Delete bundle">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <BundleFormDialog
        open={isCreateOpen || !!editBundle}
        bundle={editBundle}
        onClose={() => { setIsCreateOpen(false); setEditBundle(null); }}
        onSubmit={data => {
          if (editBundle) updateMutation.mutate({ id: editBundle.id, payload: data });
          else createMutation.mutate(data);
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Delete Bundle
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="flex-1"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BundleFormDialog({ open, bundle, onClose, onSubmit, isLoading }: {
  open: boolean;
  bundle: Bundle | null;
  onClose: () => void;
  onSubmit: (data: BundleForm) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BundleForm>({
    resolver: zodResolver(bundleSchema),
    defaultValues: bundle ?? { code: "", name: "", dataSize: "", network: "mtn", costPrice: 0, sellingPrice: 0, description: "" },
  });

  // Reset form when bundle changes
  useState(() => { reset(bundle ?? { code: "", name: "", dataSize: "", network: "mtn", costPrice: 0, sellingPrice: 0, description: "" }); });

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bundle ? "Edit Bundle" : "Create Bundle"}</DialogTitle>
          <DialogDescription>Fill in the bundle details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...register("code")} placeholder="e.g. 1GB" disabled={!!bundle} aria-describedby={errors.code ? "code-err" : undefined} />
              {errors.code && <p id="code-err" className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataSize">Data Size</Label>
              <Input id="dataSize" {...register("dataSize")} placeholder="e.g. 1GB" aria-describedby={errors.dataSize ? "ds-err" : undefined} />
              {errors.dataSize && <p id="ds-err" className="text-xs text-destructive">{errors.dataSize.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} placeholder="e.g. MTN 1GB Daily" aria-describedby={errors.name ? "name-err" : undefined} />
            {errors.name && <p id="name-err" className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="network">Network</Label>
            <select id="network" {...register("network")} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {NETWORKS.map(n => <option key={n} value={n}>{n.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="costPrice">Cost Price (GHS)</Label>
              <Input id="costPrice" type="number" step="0.01" {...register("costPrice")} aria-describedby={errors.costPrice ? "cp-err" : undefined} />
              {errors.costPrice && <p id="cp-err" className="text-xs text-destructive">{errors.costPrice.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sellingPrice">Selling Price (GHS)</Label>
              <Input id="sellingPrice" type="number" step="0.01" {...register("sellingPrice")} aria-describedby={errors.sp ? "sp-err" : undefined} />
              {errors.sellingPrice && <p id="sp-err" className="text-xs text-destructive">{errors.sellingPrice.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register("description")} placeholder="Optional description" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Saving..." : bundle ? "Save Changes" : "Create Bundle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
