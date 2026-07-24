import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, RefreshCw, FileText } from "lucide-react";
import { getCheckerTransactions, retryCheckerTransaction, getCheckerPricing, updateCheckerPricing } from "@/lib/checkerport";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: string }> = {
    COMPLETE: { bg: "bg-green-100", text: "text-green-800", icon: "✓" },
    PENDING_INPUT: { bg: "bg-blue-100", text: "text-blue-800", icon: "⟳" },
    PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", icon: "⏳" },
    FAILED: { bg: "bg-red-100", text: "text-red-800", icon: "✕" },
  };
  const c = config[status] || { bg: "bg-gray-100", text: "text-gray-800", icon: "?" };
  return (
    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.icon} {status}
    </div>
  );
}

export function CheckerPortPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: transactionsData, isLoading: isLoadingTx, refetch: refetchTx } = useQuery({
    queryKey: ["checkerTransactions"],
    queryFn: getCheckerTransactions,
  });

  const { data: pricingData, isLoading: isLoadingPricing, refetch: refetchPricing } = useQuery({
    queryKey: ["checkerPricing"],
    queryFn: getCheckerPricing,
  });

  const retryMutation = useMutation({
    mutationFn: retryCheckerTransaction,
    onSuccess: () => {
      toast.success("Transaction synced successfully!");
      refetchTx();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to sync transaction");
    },
  });

  const priceMutation = useMutation({
    mutationFn: ({ serviceName, retailPrice }: { serviceName: string, retailPrice: number }) => 
      updateCheckerPricing(serviceName, retailPrice),
    onSuccess: () => {
      toast.success("Retail price updated successfully!");
      setEditingPrice(null);
      refetchPricing();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update price");
    },
  });

  const transactions = (transactionsData as any)?.data || [];
  const pricingList = (pricingData as any)?.data || [];

  const filteredTransactions = transactions.filter((tx: any) => 
    tx.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tx.email && tx.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Results & Vouchers (CheckerPort)</h1>
          <p className="text-sm text-gray-500 mt-1">Manage global transactions and configure retail prices.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { refetchTx(); refetchPricing(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Retail Pricing Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="bg-gray-50 border-b pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Retail Pricing Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 bg-gray-50/50 uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Service</th>
                      <th className="px-4 py-3 font-medium text-right">Cost</th>
                      <th className="px-4 py-3 font-medium text-right">Retail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pricingList.map((p: any) => (
                      <tr key={p.serviceName} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900">{p.serviceName.replace("ArcPriceWrc", "").replace("VoucherPricePlatform", "")}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(p.amount || 0)}</td>
                        <td className="px-4 py-3 text-right">
                          {editingPrice === p.serviceName ? (
                            <div className="flex items-center justify-end gap-2">
                              <Input 
                                type="number" 
                                className="w-20 h-8 text-right" 
                                value={editValue} 
                                onChange={(e) => setEditValue(e.target.value)} 
                                autoFocus
                              />
                              <Button 
                                size="sm" 
                                className="h-8 px-2"
                                onClick={() => priceMutation.mutate({ serviceName: p.serviceName, retailPrice: parseFloat(editValue) })}
                                disabled={priceMutation.isPending}
                              >
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingPrice(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2 group">
                              <span className="font-semibold text-gray-900">{formatCurrency(p.retailPrice || 0)}</span>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 opacity-0 group-hover:opacity-100 text-xs"
                                onClick={() => { setEditingPrice(p.serviceName); setEditValue((p.retailPrice || p.amount || 0).toString()); }}
                              >
                                Edit
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {pricingList.length === 0 && !isLoadingPricing && (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No pricing data found. Wait for the first transaction to sync.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Global Transactions Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="bg-gray-50 border-b pb-4">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  Global Transactions
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search reference or email..."
                    className="pl-9 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 bg-gray-50/50 uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Reference</th>
                      <th className="px-4 py-3 font-medium">Service & Details</th>
                      <th className="px-4 py-3 font-medium">Customer (Phone / Email)</th>
                      <th className="px-4 py-3 font-medium text-right">Price</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoadingTx ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading transactions...</td></tr>
                    ) : filteredTransactions.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No transactions found</td></tr>
                    ) : (
                      filteredTransactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-500">{formatDate(tx.createdAt)}</td>
                          <td className="px-4 py-3 font-medium font-mono text-xs">{tx.referenceId}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{tx.type.replace("ARC_", "").replace("_", " ")} {tx.platform ? `(${tx.platform})` : ''}</div>
                            <div className="text-xs text-gray-500">
                              {tx.qty ? `Qty: ${tx.qty}` : ''}
                              {tx.indexNumber ? `Index: ${tx.indexNumber}` : ''}
                              {tx.year ? ` | Year: ${tx.year}` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{tx.phoneNumber || '-'}</div>
                            <div className="text-xs text-gray-500">{tx.email || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 font-medium">
                            {formatCurrency(tx.price || 0)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={tx.status} />
                            {tx.statusCode && <div className="text-[10px] text-gray-500 mt-1 max-w-[120px] truncate" title={tx.statusCode}>{tx.statusCode}</div>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              disabled={retryMutation.isPending && retryMutation.variables === tx.referenceId}
                              onClick={() => retryMutation.mutate(tx.referenceId)}
                            >
                              Force Sync
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
