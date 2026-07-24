import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const queryClient = useQueryClient();

  // Fetch all feature flags
  const { data: featureFlags, isLoading, error } = useQuery({
    queryKey: ["featureFlags"],
    queryFn: () => apiClient.get("/admin/feature-flags") as Promise<any[]>,
  });

  const toggleFlagMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      apiClient.put(`/admin/feature-flags/${key}`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featureFlags"] });
      toast.success("Settings updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update setting");
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Icon name="progress_activity" className="animate-spin text-4xl text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center flex-col gap-4 text-center">
        <Icon name="error" className="text-4xl text-red-500" />
        <div>
          <h2 className="text-xl font-bold">Failed to load settings</h2>
          <p className="text-on-surface-variant text-sm mt-1">Please try again later.</p>
        </div>
      </div>
    );
  }

  // Find the randy flag if it exists
  const randyFlag = featureFlags?.find((f) => f.key === "bot.useRandyOnly");
  const isRandyEnabled = randyFlag ? randyFlag.enabled : false;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-on-surface">Platform Settings</h1>
          <p className="text-sm text-on-surface-variant font-medium mt-1">
            Manage system-wide configuration and feature flags
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="bg-surface rounded-3xl p-6 md:p-8 border border-outline-variant shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-container text-primary flex items-center justify-center shrink-0">
              <Icon name="router" className="!text-2xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Data Bundle API Provider</h3>
              <p className="text-sm text-on-surface-variant mt-1 leading-relaxed max-w-xl">
                Choose the primary API provider for processing Data Bundle orders. 
                When disabled, orders are routed to <strong>MyDataGigs</strong> by default.
                When enabled, orders are routed to the <strong>Randy API</strong>.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-2 shrink-0 bg-surface-container-low p-4 rounded-2xl border border-outline-variant">
            <Switch
              checked={isRandyEnabled}
              onCheckedChange={(checked) => toggleFlagMutation.mutate({ key: "bot.useRandyOnly", enabled: checked })}
              disabled={toggleFlagMutation.isPending}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              {isRandyEnabled ? "Randy API" : "MyDataGigs"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
