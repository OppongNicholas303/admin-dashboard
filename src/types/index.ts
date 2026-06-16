export interface AdminUser {
  id: string;
  username: string;
  email: string;
  phoneNumber: string;
  roles: string[];
  enabled: boolean;
  accountNonLocked: boolean;
  lastSuccessfulLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAgent {
  id: string;
  userId: string;
  businessName: string;
  referralCode: string;
  totalSales: number;
  totalProfit: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bundle {
  id: string;
  code: string;
  name: string;
  dataSize: string;
  network: string;
  costPrice: number;
  sellingPrice: number;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrder {
  id: string;
  userId: string;
  agentId: string | null;
  network: string;
  phoneNumber: string;
  bundleCode: string;
  amount: number;          // customer pays (selling price + 2% Paystack fee)
  baseAmount: number;      // selling price (what TapData charges)
  costPrice: number;       // provider cost (what TapData pays)
  commissionAmount: number;// agent commission
  platformProfit: number;  // baseAmount - costPrice - commissionAmount
  status: string;
  providerStatus: string;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Commission {
  id: string;
  agentId: string;
  orderId: string;
  baseAmount: number;
  sellingAmount: number;
  profit: number;
  status: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalAgents: number;
  totalBundles: number;
  totalOrders: number;
  completedOrders: number;
  failedOrders: number;
  pendingWithdrawals: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  phoneNumber: string;
  roles: string[];
}

export interface WithdrawalRequest {
  id: string;
  agentUserId: string;
  agentProfileId: string;
  amount: number;
  momoProvider: string;
  momoNumber: string;
  accountName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reference: string;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBundlePayload {
  code: string;
  name: string;
  dataSize: string;
  network: string;
  costPrice: number;
  sellingPrice: number;
  description: string;
}

export interface DailyAnalytics {
  date: string;
  orders: number;
  completedOrders: number;
  revenue: number;
  profit: number;
}

export interface UpdateBundlePayload {
  name?: string;
  dataSize?: string;
  costPrice?: number;
  sellingPrice?: number;
  description?: string;
}

export interface AgentBundlePricing {
  id: string;
  agentId: string;
  bundleId: string;
  basePrice: number;    // what platform earns from this agent per sale
  sellingPrice: number; // what the agent charges customers
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMashupPricing {
  id: string;
  agentId: string;
  mashupBundleId: string;
  basePrice: number;
  sellingPrice: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMashupPackage {
  id: string;
  externalId: number | null;
  specialOfferPackageId: number | null;
  slug: string | null;
  name: string;
  description: string | null;
  dataAmountMb: number | null;
  dataSize: string | null;
  network: string;
  costPrice: number | null;
  sellingPrice: number | null;
  status: string;
  available: boolean;
  purchasable: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MashupSyncResult {
  created: number;
  updated: number;
  unavailable: number;
  seen: number;
}

export interface AgentWallet {
  balance: number;
  currency: string;
  updatedAt?: string | null;
}

