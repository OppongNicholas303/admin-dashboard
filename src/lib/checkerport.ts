import { apiClient } from "./api";

// 1. Get all CheckerPort Transactions
export const getCheckerTransactions = async () => {
  return apiClient.get("/admin/results-checker/transactions");
};

// 2. Retry a transaction manually
export const retryCheckerTransaction = async (referenceId: string) => {
  return apiClient.post(`/admin/results-checker/transactions/${referenceId}/retry`);
};

// 3. Get all Pricing Configurations
export const getCheckerPricing = async () => {
  return apiClient.get("/admin/results-checker/pricing");
};

// 4. Update Retail Price for a Service
export const updateCheckerPricing = async (serviceName: string, retailPrice: number) => {
  return apiClient.put(`/admin/results-checker/pricing/${serviceName}`, { retailPrice });
};

// 5. Get Agent Checker Pricing
export const getAgentCheckerPricing = async (agentId: string) => {
  return apiClient.get(`/admin/agent-pricing/checker/${agentId}`);
};

// 6. Update Single Agent Checker Price
export const updateAgentCheckerPricing = async (agentId: string, serviceName: string, sellingPrice: number) => {
  return apiClient.put(`/admin/agent-pricing/checker/${agentId}/${serviceName}`, { sellingPrice });
};

// 7. Bulk Update Agent Checker Prices
export const bulkUpdateAgentCheckerPricing = async (agentId: string, updates: { serviceName: string; sellingPrice: number }[]) => {
  return apiClient.put(`/admin/agent-pricing/checker/${agentId}/bulk`, updates);
};
