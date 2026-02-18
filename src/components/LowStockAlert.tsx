import { useEffect, useState, useMemo } from "react";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  maxStock: number;
  percentage: number;
  status: "critical" | "low" | "outofstock";
}

export function LowStockAlert() {
  const { subscribeToCollection } = useFirestoreCRUD();
  const [inventory, setInventory] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  // Real-time inventory subscription
  useEffect(() => {
    const unsubscribe = subscribeToCollection("inventory", {
      limit: 1000,
      orderBy: "createdAt",
      orderDirection: "desc",
      onUpdate: (docs) => {
        setInventory(docs || []);
      },
      onError: (errMsg) => {
        console.error("Low stock alert - Inventory subscription error:", errMsg);
      },
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [subscribeToCollection]);

  // Calculate low stock items based on 15% threshold
  const lowStockItems = useMemo(() => {
    const items: LowStockItem[] = [];

    inventory.forEach((item: any) => {
      const currentQty = Number(item.quantity) || 0;
      
      // Strategy for determining if stock is low (15% threshold):
      // 1. If minStockAlertLevel is set, use that as the threshold
      // 2. Otherwise, use a simple rule: items with quantity <= 15 are considered low stock
      //    (This assumes that having less than 15 units means you're at or below 15% of normal stock)
      
      const minAlertLevel = Number(item.minStockAlertLevel) || 0;
      
      let shouldAlert = false;
      let percentage = 0;
      let maxStock = 100; // Default for display purposes
      
      if (minAlertLevel > 0) {
        // If alert level is explicitly set, use it
        shouldAlert = currentQty <= minAlertLevel;
        maxStock = Math.round(minAlertLevel / 0.15); // Estimate max stock (alert level = 15% of max)
        percentage = maxStock > 0 ? Math.round((currentQty / maxStock) * 100) : 0;
      } else {
        // Simple fallback: Any item with 15 or fewer units is considered low stock
        shouldAlert = currentQty <= 15;
        
        // For percentage display, estimate that "normal" stock is around 100 units
        // or 6-7x the current quantity if it's very low
        maxStock = Math.max(currentQty < 10 ? 100 : currentQty * 7, 50);
        percentage = Math.round((currentQty / maxStock) * 100);
      }

      if (shouldAlert) {
        items.push({
          id: item.id,
          name: item.name || item.price || "Unknown Item",
          quantity: currentQty,
          maxStock: maxStock,
          percentage: percentage,
          status:
            currentQty === 0
              ? "outofstock"
              : currentQty <= 5 || percentage <= 5
              ? "critical"
              : "low",
        });
      }
    });

    // Sort by severity: out of stock first, then by percentage (lowest first), then by quantity
    items.sort((a, b) => {
      // Out of stock items always first
      if (a.status === "outofstock" && b.status !== "outofstock") return -1;
      if (a.status !== "outofstock" && b.status === "outofstock") return 1;
      
      // Then critical items
      if (a.status === "critical" && b.status === "low") return -1;
      if (a.status === "low" && b.status === "critical") return 1;
      
      // Within same severity, sort by quantity (lowest first)
      return a.quantity - b.quantity;
    });

    return items;
  }, [inventory]);

  // Show popup when low stock items are detected
  useEffect(() => {
    // Check session storage to avoid showing multiple times per session
    const sessionKey = "lowStockAlertShown";
    const alreadyShown = sessionStorage.getItem(sessionKey);

    if (lowStockItems.length > 0 && !dismissed && !alreadyShown) {
      // Small delay to avoid showing immediately on page load
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem(sessionKey, "true");
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [lowStockItems, dismissed]);

  const handleDismiss = () => {
    setIsOpen(false);
    setDismissed(true);
  };

  const handleViewInventory = () => {
    setIsOpen(false);
    setDismissed(true);
    navigate("/inventory/add");
  };

  if (lowStockItems.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-2xl">
        {/* Professional Header */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-8 py-6 border-b-4 border-red-600">
          <button
            onClick={handleDismiss}
            className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0 mt-1">
              <div className="relative">
                <div className="absolute inset-0 bg-red-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-red-600 p-3 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              <DialogTitle className="text-2xl font-semibold text-white mb-1 tracking-tight">
                Inventory Stock Alert
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-base">
                {lowStockItems.length} {lowStockItems.length === 1 ? "item requires" : "items require"} immediate attention
              </DialogDescription>
              
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 border border-red-500/30 rounded-md">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-red-200">
                    {lowStockItems.filter(i => i.status === "outofstock").length} Out of Stock
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-600/20 border border-orange-500/30 rounded-md">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-orange-200">
                    {lowStockItems.filter(i => i.status === "critical").length} Critical
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
          {/* Alert Banner */}
          <div className="mb-6 p-4 bg-white dark:bg-slate-800 border-l-4 border-red-600 rounded-r-lg shadow-sm">
            <p className="text-slate-700 dark:text-slate-200 font-medium">
              Immediate action required to prevent stockouts and maintain service levels.
            </p>
          </div>

          {/* Low stock items grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className={`group p-5 rounded-lg border transition-all hover:shadow-lg bg-white dark:bg-slate-800 ${
                  item.status === "outofstock"
                    ? "border-red-300 dark:border-red-800 hover:border-red-400"
                    : item.status === "critical"
                    ? "border-orange-300 dark:border-orange-800 hover:border-orange-400"
                    : "border-slate-300 dark:border-slate-700 hover:border-slate-400"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${
                        item.status === "outofstock"
                          ? "bg-red-100 dark:bg-red-950"
                          : item.status === "critical"
                          ? "bg-orange-100 dark:bg-orange-950"
                          : "bg-slate-100 dark:bg-slate-900"
                      }`}>
                        <Package className={`h-5 w-5 ${
                          item.status === "outofstock"
                            ? "text-red-600 dark:text-red-400"
                            : item.status === "critical"
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-slate-600 dark:text-slate-400"
                        }`} />
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white text-base truncate">
                        {item.name}
                      </h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold uppercase tracking-wide ${
                          item.status === "outofstock"
                            ? "text-red-700 dark:text-red-400"
                            : item.status === "critical"
                            ? "text-orange-700 dark:text-orange-400"
                            : "text-slate-600 dark:text-slate-400"
                        }`}>
                          {item.status === "outofstock"
                            ? "Out of Stock"
                            : item.status === "critical"
                            ? "Critical Level"
                            : "Low Stock"}
                        </span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {item.percentage}% remaining
                        </span>
                      </div>
                      
                      <div className="relative">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              item.status === "outofstock"
                                ? "bg-gradient-to-r from-red-600 to-red-500"
                                : item.status === "critical"
                                ? "bg-gradient-to-r from-orange-600 to-orange-500"
                                : "bg-gradient-to-r from-slate-600 to-slate-500"
                            }`}
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Current Stock
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.quantity} units
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end justify-between h-full">
                    <div
                      className={`text-4xl font-bold tabular-nums ${
                        item.status === "outofstock"
                          ? "text-red-600 dark:text-red-400"
                          : item.status === "critical"
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {item.quantity}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleViewInventory}
              className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-semibold py-6 text-base shadow-lg hover:shadow-xl transition-all"
            >
              <Package className="mr-2 h-5 w-5" />
              Manage Inventory
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="sm:w-auto px-8 py-6 text-base border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Dismiss
            </Button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-500 text-center mt-5">
            This alert appears once per session. Access inventory management anytime from the navigation menu.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
