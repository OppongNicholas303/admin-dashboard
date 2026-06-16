import { apiClient } from "./api";
import type {
  AdminStats, AdminUser, AdminAgent, Bundle, AdminOrder,
  Commission, CreateBundlePayload, UpdateBundlePayload, WithdrawalRequest, DailyAnalytics,
  AdminMashupPackage, MashupSyncResult, AgentBundlePricing, AgentMashupPricing,
} from "@/types";

type ApiWrap<T> = { data: T };

export const adminService = {
  // Stats
  getStats: async (): Promise<AdminStats> => {
    const res = await apiClient.get("/admin/stats") as ApiWrap<AdminStats>;
    return res.data;
  },

  // Users
  getUsers: async (): Promise<AdminUser[]> => {
    const res = await apiClient.get("/admin/users") as ApiWrap<AdminUser[]>;
    return res.data;
  },
  toggleUserLock: async (id: string): Promise<AdminUser> => {
    const res = await apiClient.put(`/admin/users/${id}/toggle-lock`) as ApiWrap<AdminUser>;
    return res.data;
  },
  toggleUserEnabled: async (id: string): Promise<AdminUser> => {
    const res = await apiClient.put(`/admin/users/${id}/toggle-enabled`) as ApiWrap<AdminUser>;
    return res.data;
  },
  updateUserRoles: async (id: string, roles: string[]): Promise<AdminUser> => {
    const res = await apiClient.put(`/admin/users/${id}/roles`, { roles }) as ApiWrap<AdminUser>;
    return res.data;
  },

  // Agents
  getAgents: async (): Promise<AdminAgent[]> => {
    const res = await apiClient.get("/admin/agents") as ApiWrap<AdminAgent[]>;
    return res.data;
  },
  toggleAgentActive: async (id: string): Promise<AdminAgent> => {
    const res = await apiClient.put(`/admin/agents/${id}/toggle-active`) as ApiWrap<AdminAgent>;
    return res.data;
  },
  getAgentCommissions: async (id: string, status?: string, from?: string, to?: string): Promise<Commission[]> => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    const res = await apiClient.get(`/admin/agents/${id}/commissions${query ? `?${query}` : ''}`) as ApiWrap<Commission[]>;
    return res.data;
  },
  getAgentOrders: async (id: string, status?: string, network?: string, from?: string, to?: string): Promise<AdminOrder[]> => {
    const params = new URLSearchParams();
    if (status)  params.set('status',  status);
    if (network) params.set('network', network);
    if (from)    params.set('from',    from);
    if (to)      params.set('to',      to);
    const query = params.toString();
    const res = await apiClient.get(`/admin/agents/${id}/orders${query ? `?${query}` : ''}`) as ApiWrap<AdminOrder[]>;
    return res.data;
  },
  getAgentWithdrawals: async (id: string): Promise<WithdrawalRequest[]> => {
    const res = await apiClient.get(`/admin/agents/${id}/withdrawals`) as ApiWrap<WithdrawalRequest[]>;
    return res.data;
  },

  // Wallet
  getAgentWallet: async (agentProfileId: string): Promise<{ balance: number; currency: string; updatedAt?: string | null }> => {
    const res = await apiClient.get(`/admin/agents/${agentProfileId}/wallet`) as ApiWrap<{ balance: number; currency: string; updatedAt?: string | null }>;
    return res.data;
  },
  topUpAgentWallet: async (agentProfileId: string, amount: number, note?: string): Promise<{ balance: number; currency: string; updatedAt?: string | null }> => {
    const res = await apiClient.post(`/admin/agents/${agentProfileId}/wallet/topup`, { amount, note }) as ApiWrap<{ balance: number; currency: string; updatedAt?: string | null }>;
    return res.data;
  },

  // Bundles
  getBundles: async (): Promise<Bundle[]> => {
    const res = await apiClient.get("/admin/bundles") as ApiWrap<Bundle[]>;
    return res.data;
  },
  createBundle: async (payload: CreateBundlePayload): Promise<Bundle> => {
    const res = await apiClient.post("/admin/bundles", payload) as ApiWrap<Bundle>;
    return res.data;
  },
  updateBundle: async (id: string, payload: UpdateBundlePayload): Promise<Bundle> => {
    const res = await apiClient.put(`/admin/bundles/${id}`, payload) as ApiWrap<Bundle>;
    return res.data;
  },
  setBundleStatus: async (id: string, status: string): Promise<Bundle> => {
    const res = await apiClient.put(`/admin/bundles/${id}/status`, { status }) as ApiWrap<Bundle>;
    return res.data;
  },
  deleteBundle: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/bundles/${id}`);
  },

   // Orders
   getOrders: async (status?: string, network?: string, from?: string, to?: string): Promise<AdminOrder[]> => {
     const params = new URLSearchParams();
     if (status)  params.set("status",  status);
     if (network) params.set("network", network);
     if (from)    params.set("from",    from);
     if (to)      params.set("to",      to);
     const query = params.toString();
     const res = await apiClient.get(`/admin/orders${query ? `?${query}` : ""}`) as ApiWrap<AdminOrder[]>;
     return res.data;
   },
   markOrderComplete: async (orderId: string, providerReference?: string): Promise<AdminOrder> => {
     const res = await apiClient.post(`/admin/orders/${orderId}/mark-complete`, { providerReference }) as ApiWrap<AdminOrder>;
     return res.data;
   },
   markOrderCompleteByAdmin: async (orderId: string): Promise<AdminOrder> => {
     const res = await apiClient.post(`/admin/orders/${orderId}/mark-complete-by-admin`) as ApiWrap<AdminOrder>;
     return res.data;
   },

   // Analytics
   getDailyAnalytics: async (days = 30): Promise<DailyAnalytics[]> => {
     const res = await apiClient.get(`/admin/analytics/daily?days=${days}`) as ApiWrap<DailyAnalytics[]>;
     return res.data;
   },
   getAgentCommissionsSummary: async (agentId?: string, from?: string, to?: string): Promise<{ dailySummary: any[]; totalCommissions: number; totalOrders: number; fromDate: string; toDate: string; agentId: string }> => {
     const params = new URLSearchParams();
     if (agentId) params.set('agentId', agentId);
     if (from) params.set('from', from);
     if (to) params.set('to', to);
     const query = params.toString();
     const res = await apiClient.get(`/admin/analytics/agent-commissions${query ? `?${query}` : ''}`) as ApiWrap<any>;
     return res.data;
   },

  // Migrations
  backfillOrderCosts: async (): Promise<Record<string, number>> => {
    const res = await apiClient.post("/admin/migrations/backfill-order-costs") as ApiWrap<Record<string, number>>;
    return res.data;
  },

  // Withdrawals
  getWithdrawals: async (status?: string): Promise<WithdrawalRequest[]> => {
    const query = status ? `?status=${status}` : "";
    const res = await apiClient.get(`/admin/withdrawals${query}`) as ApiWrap<WithdrawalRequest[]>;
    return res.data;
  },
  approveWithdrawal: async (id: string, note?: string): Promise<WithdrawalRequest> => {
    const res = await apiClient.post(`/admin/withdrawals/${id}/approve`, { note }) as ApiWrap<WithdrawalRequest>;
    return res.data;
  },
  rejectWithdrawal: async (id: string, note?: string): Promise<WithdrawalRequest> => {
    const res = await apiClient.post(`/admin/withdrawals/${id}/reject`, { note }) as ApiWrap<WithdrawalRequest>;
    return res.data;
  },

  // Agent Pricing
  getAgentPricing: async (agentProfileId: string): Promise<AgentBundlePricing[]> => {
    const res = await apiClient.get(`/admin/agents/${agentProfileId}/pricing`) as ApiWrap<AgentBundlePricing[]>;
    return res.data;
  },
  getPricingForBundle: async (bundleId: string): Promise<AgentBundlePricing[]> => {
    const res = await apiClient.get(`/admin/agents/pricing/bundle/${bundleId}`) as ApiWrap<AgentBundlePricing[]>;
    return res.data;
  },
  setAgentBasePrice: async (agentProfileId: string, bundleId: string, basePrice: number, sellingPrice?: number): Promise<AgentBundlePricing> => {
    const res = await apiClient.put(`/admin/agents/pricing`, { agentProfileId, bundleId, basePrice, sellingPrice: sellingPrice ?? null }) as ApiWrap<AgentBundlePricing>;
    return res.data;
  },
  setBulkBasePrice: async (bundleId: string, basePrice: number): Promise<{ bundleId: string; basePrice: number; agentsUpdated: number }> => {
    const res = await apiClient.put(`/admin/agents/pricing/bulk`, { bundleId, basePrice }) as ApiWrap<{ bundleId: string; basePrice: number; agentsUpdated: number }>;
    return res.data;
  },
  getAgentMashupPricing: async (agentProfileId: string): Promise<AgentMashupPricing[]> => {
    const res = await apiClient.get(`/admin/agents/${agentProfileId}/mashup/pricing`) as ApiWrap<AgentMashupPricing[]>;
    return res.data;
  },
  getMashupPricingForBundle: async (mashupBundleId: string): Promise<AgentMashupPricing[]> => {
    const res = await apiClient.get(`/admin/agents/mashup/pricing/bundle/${mashupBundleId}`) as ApiWrap<AgentMashupPricing[]>;
    return res.data;
  },
  setAgentMashupBasePrice: async (agentProfileId: string, bundleId: string, basePrice: number, sellingPrice?: number): Promise<AgentMashupPricing> => {
    const res = await apiClient.put(`/admin/agents/mashup/pricing`, { agentProfileId, bundleId, basePrice, sellingPrice: sellingPrice ?? null }) as ApiWrap<AgentMashupPricing>;
    return res.data;
  },
  setBulkMashupBasePrice: async (bundleId: string, basePrice: number): Promise<{ bundleId: string; basePrice: number; agentsUpdated: number }> => {
    const res = await apiClient.put(`/admin/agents/mashup/pricing/bulk`, { bundleId, basePrice }) as ApiWrap<{ bundleId: string; basePrice: number; agentsUpdated: number }>;
    return res.data;
  },

  // Mashup Packages
  getMashupPackages: async (): Promise<AdminMashupPackage[]> => {
    const res = await apiClient.get("/admin/mashup/packages") as ApiWrap<AdminMashupPackage[]>;
    return res.data;
  },
  syncMashupPackages: async (): Promise<MashupSyncResult> => {
    const res = await apiClient.post("/admin/mashup/packages/sync") as ApiWrap<MashupSyncResult>;
    return res.data;
  },
  setMashupPrice: async (id: string, sellingPrice: number): Promise<AdminMashupPackage> => {
    const res = await apiClient.put(`/admin/mashup/packages/${id}/price`, { sellingPrice }) as ApiWrap<AdminMashupPackage>;
    return res.data;
  },
  setMashupStatus: async (id: string, status: string): Promise<AdminMashupPackage> => {
    const res = await apiClient.put(`/admin/mashup/packages/${id}/status`, { status }) as ApiWrap<AdminMashupPackage>;
    return res.data;
  },
};
