import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import {
  IndianRupee,
  Loader2,
  Package,
  Percent,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Calendar,
  Clock,
  BarChart3,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const Home = () => {
  const { subscribeToCollection, error } = useFirestoreCRUD();
  const [timeFilter, setTimeFilter] = useState("today");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isBillsReady, setIsBillsReady] = useState(false);
  const [isInventoryReady, setIsInventoryReady] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const timeFilters = [
    { value: "today", label: "Today", icon: Calendar },
    { value: "yesterday", label: "Yesterday", icon: Clock },
    { value: "week", label: "This Week", icon: BarChart3 },
    { value: "month", label: "This Month", icon: BarChart3 },
    { value: "all", label: "All Time", icon: BarChart3 },
  ];

  // Helper function to format numbers with commas
  const formatCurrency = (amount: number): string => {
    return `₹${Math.round(amount).toLocaleString("en-IN")}`;
  };

  // Helper function to format numbers
  const formatNumber = (num: number): string => {
    return Math.round(num).toLocaleString("en-IN");
  };

  // Real-time bills subscription
  useEffect(() => {
    setIsBillsReady(false);
    const unsubscribe = subscribeToCollection("bills", {
      limit: 1000,
      orderBy: "createdAt",
      orderDirection: "desc",
      onUpdate: (docs) => {
        setInvoices(docs || []);
        setIsBillsReady(true);
      },
      onError: (errMsg) => {
        console.error("Bills subscription error:", errMsg);
        setSubscriptionError(errMsg);
      },
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [subscribeToCollection]);

  // Real-time inventory subscription
  useEffect(() => {
    setIsInventoryReady(false);
    const unsubscribe = subscribeToCollection("inventory", {
      limit: 1000,
      orderBy: "createdAt",
      orderDirection: "desc",
      onUpdate: (docs) => {
        setInventory(docs || []);
        setIsInventoryReady(true);
      },
      onError: (errMsg) => {
        console.error("Inventory subscription error:", errMsg);
        setSubscriptionError(errMsg);
      },
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [subscribeToCollection]);

  const dashboardError = subscriptionError || error;
  const isDashboardReady = isBillsReady && isInventoryReady;

  // Helper function to get dateKey from a date string (YYYY-MM-DD format)
  const getDateKeyFromDate = (dateString: string): string | null => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      const yy = String(date.getFullYear()).slice(-2);
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yy}${mm}${dd}`;
    } catch {
      return null;
    }
  };

  // Filter invoices based on selected time period
  const filteredInvoices = useMemo(() => {
    if (!invoices.length) return [];

    const now = Date.now() / 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime() / 1000;
    const yesterdayStart = todayStart - 24 * 60 * 60; // 24 hours ago (start of yesterday)
    const yesterdayEnd = todayStart; // End of yesterday (start of today)

    return invoices
      .filter((invoice: any) => {
        const invoiceTime = invoice.createdAt?.seconds || 0;

        switch (timeFilter) {
          case "today":
            return invoiceTime >= todayStart;
          case "yesterday":
            return invoiceTime >= yesterdayStart && invoiceTime < yesterdayEnd;
          case "week":
            return invoiceTime >= now - 7 * 24 * 60 * 60;
          case "month":
            return invoiceTime >= now - 30 * 24 * 60 * 60;
          case "all":
          default:
            return true;
        }
      })
      .filter((invoice: any) => {
        // Apply date filter if a date is selected
        if (selectedDate) {
          const targetDateKey = getDateKeyFromDate(selectedDate);
          return invoice.dateKey === targetDateKey;
        }
        return true;
      });
  }, [invoices, timeFilter, selectedDate]);

  // Get most recent 5 invoices sorted by date (newest first)
  const recentInvoices = useMemo(() => {
    if (!filteredInvoices.length) return [];

    return [...filteredInvoices]
      .sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA; // Sort descending (newest first)
      })
      .slice(0, 5); // Get top 5 most recent
  }, [filteredInvoices]);

  // Calculate yesterday's data for comparison
  const yesterdayAnalytics = useMemo(() => {
    if (!invoices.length) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime() / 1000;
    const yesterdayStart = todayStart - 24 * 60 * 60;
    const yesterdayEnd = todayStart;

    const yesterdayInvoices = invoices.filter((invoice: any) => {
      const invoiceTime = invoice.createdAt?.seconds || 0;
      return invoiceTime >= yesterdayStart && invoiceTime < yesterdayEnd;
    });

    if (!yesterdayInvoices.length) return null;

    let revenue = 0;
    let cost = 0;
    let profit = 0;
    let itemsSold = 0;

    yesterdayInvoices.forEach((invoice: any) => {
      if (!invoice.lineItems || !Array.isArray(invoice.lineItems)) return;
      invoice.lineItems.forEach((item: any) => {
        if (!item.fullItem) return;
        const { quantity, fullItem } = item;
        revenue += (fullItem.sellingPrice || fullItem.price || 0) * quantity;
        cost += (fullItem.costPrice || 0) * quantity;
        itemsSold += quantity;
      });
    });

    profit = revenue - cost;

    return { revenue, cost, profit, itemsSold };
  }, [invoices]);

  // Calculate comparison with yesterday
  const getComparison = (current: number, yesterday: number | null) => {
    if (!yesterday || yesterday === 0) return null;
    const diff = current - yesterday;
    const percent = ((diff / yesterday) * 100).toFixed(1);
    return {
      diff,
      percent: Math.abs(parseFloat(percent)),
      isPositive: diff >= 0,
    };
  };

  // Calculate metrics and category data
  const analytics: any = useMemo(() => {
    // Calculate inventory value and low stock items
    let totalInventoryValue = 0;
    const lowStockItems: any = [];

    inventory.forEach((item: any) => {
      const itemValue = (item.costPrice || 0) * (item.quantity || 0);
      totalInventoryValue += itemValue;

      // Check for low stock (threshold: 10 units)
      if (item.quantity < 10) {
        lowStockItems.push({
          id: item.id,
          name: item.name, // Using price as name
          quantity: item.quantity,
          price: item.price || item.sellingPrice,
          status:
            item.quantity === 0
              ? "outofstock"
              : item.quantity < 5
              ? "critical"
              : "low",
        });
      }
    });

    // Sort low stock items by quantity (lowest first)
    lowStockItems.sort((a: any, b: any) => a.quantity - b.quantity);
    if (!filteredInvoices.length) {
      return {
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        profitMargin: 0,
        totalItemsSold: 0,
        categories: [],
      };
    }

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let totalItemsSold = 0;
    const categoryData: any = {};

    filteredInvoices.forEach((invoice: any) => {
      if (!invoice.lineItems || !Array.isArray(invoice.lineItems)) return;

      invoice.lineItems.forEach((item: any) => {
        if (!item.fullItem) return;

        const { quantity, fullItem } = item;
        const revenue =
          (fullItem.sellingPrice || fullItem.price || 0) * quantity;
        const cost = (fullItem.costPrice || 0) * quantity;
        const profit = revenue - cost;
        const categoryKey = fullItem.price || fullItem.sellingPrice || 0;
        // Use item name for display, fallback to price if name doesn't exist
        const itemName = fullItem.name || `₹${categoryKey}`;

        totalRevenue += revenue;
        totalCost += cost;
        totalProfit += profit;
        totalItemsSold += quantity;

        if (!categoryData[categoryKey]) {
          categoryData[categoryKey] = {
            category: itemName, // Use name for display
            name: itemName, // Store name separately
            price: categoryKey, // Keep price for categorization logic
            revenue: 0,
            cost: 0,
            profit: 0,
            quantity: 0,
            profitMargin: 0,
            // Future implementation: Track individual flavors
            // This will store flavor-wise breakdown when implemented
            // flavors: {
            //   'Masala': { quantity: 5, profit: 100 },
            //   'Jeera': { quantity: 3, profit: 60 }
            // }
          };
        } else {
          // If category already exists but name is just a price, update it with the actual name
          // This handles cases where first item had no name but subsequent items do
          if (
            categoryData[categoryKey].name?.startsWith("₹") &&
            !itemName.startsWith("₹")
          ) {
            categoryData[categoryKey].category = itemName;
            categoryData[categoryKey].name = itemName;
          }
        }

        categoryData[categoryKey].revenue += revenue;
        categoryData[categoryKey].cost += cost;
        categoryData[categoryKey].profit += profit;
        categoryData[categoryKey].quantity += quantity;

        // Calculate profit margin for each category
        if (categoryData[categoryKey].revenue > 0) {
          categoryData[categoryKey].profitMargin = (
            (categoryData[categoryKey].profit /
              categoryData[categoryKey].revenue) *
            100
          ).toFixed(1);
        }

        // Future: Track flavors per category when flavor field is added
        // if (fullItem.flavor) {
        //   if (!categoryData[categoryKey].flavors[fullItem.flavor]) {
        //     categoryData[categoryKey].flavors[fullItem.flavor] = { quantity: 0, profit: 0 };
        //   }
        //   categoryData[categoryKey].flavors[fullItem.flavor].quantity += quantity;
        //   categoryData[categoryKey].flavors[fullItem.flavor].profit += profit;
        // }
      });
    });

    const profitMargin =
      totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      totalItemsSold,
      totalInventoryValue, // ADD THIS
      lowStockItems, // ADD THIS
      categories: Object.values(categoryData).sort(
        (a: any, b: any) => b.revenue - a.revenue
      ),
    };
  }, [filteredInvoices]);

  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
  ];

  // Prepare data for pie chart (Revenue by Category)
  const pieData = analytics.categories.map((cat: any, index: any) => ({
    name: cat.name,
    value: cat.revenue,
    color: COLORS[index % COLORS.length],
  }));

  // Prepare data for profit comparison bar chart
  const profitChartData = analytics.categories.map((cat: any, index: any) => ({
    category: cat.category,
    revenue: cat.revenue,
    cost: cat.cost,
    profit: cat.profit,
    color: COLORS[index % COLORS.length],
  }));

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{label}</p>
          {payload.map((entry: any, index: any) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ₹{entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (dashboardError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800 font-semibold">Error loading data</p>
          <p className="text-red-600 text-sm mt-2">{dashboardError}</p>
        </div>
      </div>
    );
  }

  if (!isDashboardReady && !invoices.length && !inventory.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 mx-auto" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen container py-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Your Business Dashboard
              </h1>
            </div>
            <p className="text-gray-500 mt-1">See how your business is doing</p>
          </div>

          {/* Time Filter Buttons - Bigger with Icons */}
          <div className="flex flex-wrap gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            {timeFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <button
                  key={filter.value}
                  onClick={() => setTimeFilter(filter.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                    timeFilter === filter.value
                      ? "bg-blue-500 text-white shadow-md"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {filter.label}
                </button>
              );
            })}
            {/* Date Filter - Separate and Always Visible */}
            <div className="flex items-center justify-end gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer w-full shrink-0"
                onFocus={(e) => {
                  if (e.target.showPicker) {
                    e.target.showPicker();
                  }
                }}
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate("")}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Today's Summary Card - Simple Language */}
        {timeFilter === "today" && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-100 text-xl">
                Today's Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Money Earned Today
                  </p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(analytics.totalRevenue)}
                  </p>
                  {yesterdayAnalytics && (
                    <p className="text-xs mt-2">
                      {(() => {
                        const comp = getComparison(
                          analytics.totalRevenue,
                          yesterdayAnalytics.revenue
                        );
                        if (!comp) return null;
                        return (
                          <span
                            className={
                              comp.isPositive
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {comp.isPositive ? "↑" : "↓"}{" "}
                            {formatCurrency(Math.abs(comp.diff))} (
                            {comp.percent}%) vs Yesterday
                          </span>
                        );
                      })()}
                    </p>
                  )}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Profit Today
                  </p>
                  <p
                    className={`text-3xl font-bold ${
                      analytics.totalProfit >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatCurrency(analytics.totalProfit)}
                  </p>
                  {yesterdayAnalytics && (
                    <p className="text-xs mt-2">
                      {(() => {
                        const comp = getComparison(
                          analytics.totalProfit,
                          yesterdayAnalytics.profit
                        );
                        if (!comp) return null;
                        return (
                          <span
                            className={
                              comp.isPositive
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {comp.isPositive ? "↑" : "↓"}{" "}
                            {formatCurrency(Math.abs(comp.diff))} (
                            {comp.percent}%) vs Yesterday
                          </span>
                        );
                      })()}
                    </p>
                  )}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Items Sold Today
                  </p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {formatNumber(analytics.totalItemsSold)}
                  </p>
                  {yesterdayAnalytics && (
                    <p className="text-xs mt-2">
                      {(() => {
                        const comp = getComparison(
                          analytics.totalItemsSold,
                          yesterdayAnalytics.itemsSold
                        );
                        if (!comp) return null;
                        return (
                          <span
                            className={
                              comp.isPositive
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {comp.isPositive ? "↑" : "↓"}{" "}
                            {formatNumber(Math.abs(comp.diff))} ({comp.percent}
                            %) vs Yesterday
                          </span>
                        );
                      })()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics Cards - Simplified Language */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-white">
                Money Earned
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(analytics.totalRevenue)}
              </div>
              <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                Money received from customers
              </p>
              {timeFilter === "today" && yesterdayAnalytics && (
                <p className="text-xs mt-1">
                  {(() => {
                    const comp = getComparison(
                      analytics.totalRevenue,
                      yesterdayAnalytics.revenue
                    );
                    if (!comp) return null;
                    return (
                      <span
                        className={
                          comp.isPositive
                            ? "text-green-600 font-medium"
                            : "text-red-600 font-medium"
                        }
                      >
                        {comp.isPositive ? "↑" : "↓"} {comp.percent}% vs
                        Yesterday
                      </span>
                    );
                  })()}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-white">
                Money Spent
              </CardTitle>
              <Package className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(analytics.totalCost)}
              </div>
              <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                Cost of making products
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-white">
                Profit
              </CardTitle>
              {analytics.totalProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  analytics.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(analytics.totalProfit)}
              </div>
              <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                Money you keep after costs
              </p>
              {timeFilter === "today" && yesterdayAnalytics && (
                <p className="text-xs mt-1">
                  {(() => {
                    const comp = getComparison(
                      analytics.totalProfit,
                      yesterdayAnalytics.profit
                    );
                    if (!comp) return null;
                    return (
                      <span
                        className={
                          comp.isPositive
                            ? "text-green-600 font-medium"
                            : "text-red-600 font-medium"
                        }
                      >
                        {comp.isPositive ? "↑" : "↓"} {comp.percent}% vs
                        Yesterday
                      </span>
                    );
                  })()}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-white">
                Profit %
              </CardTitle>
              <Percent className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.profitMargin}%
              </div>
              <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                Profit on each sale
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-white">
                Items Sold
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(analytics.totalItemsSold)}
              </div>
              <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                Products sold
              </p>
              {timeFilter === "today" && yesterdayAnalytics && (
                <p className="text-xs mt-1">
                  {(() => {
                    const comp = getComparison(
                      analytics.totalItemsSold,
                      yesterdayAnalytics.itemsSold
                    );
                    if (!comp) return null;
                    return (
                      <span
                        className={
                          comp.isPositive
                            ? "text-green-600 font-medium"
                            : "text-red-600 font-medium"
                        }
                      >
                        {comp.isPositive ? "↑" : "↓"} {comp.percent}% vs
                        Yesterday
                      </span>
                    );
                  })()}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-white">
                Stock Worth
              </CardTitle>
              <Package className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(analytics.totalInventoryValue)}
              </div>
              <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                Value of remaining stock
              </p>
            </CardContent>
          </Card>
        </div>
        {/* Low Stock Alerts - Simplified Language */}
        {analytics.lowStockItems?.length > 0 && (
          <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-orange-900 dark:text-orange-100 flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    ⚠️ Action Needed: Restock These Items
                  </CardTitle>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    These items are running low - time to order more!
                  </p>
                </div>
                <span className="bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded-full">
                  {analytics.lowStockItems.length} Items
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {analytics.lowStockItems
                  .slice(0, 6)
                  .map((item: any, index: any) => (
                    <div
                      key={item.id || index}
                      className={`p-3 rounded-lg border-2 ${
                        item.status === "outofstock"
                          ? "bg-red-100 border-red-300"
                          : item.status === "critical"
                          ? "bg-orange-100 border-orange-300"
                          : "bg-yellow-100 border-yellow-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            {item.status === "outofstock"
                              ? "❌ Out of Stock - Order Now!"
                              : `⚠️ Only ${item.quantity} left - Order Soon!`}
                          </p>
                        </div>
                        <div
                          className={`text-2xl font-bold ${
                            item.status === "outofstock"
                              ? "text-red-600"
                              : "text-orange-600"
                          }`}
                        >
                          {item.quantity}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              {analytics.lowStockItems.length > 6 && (
                <p className="text-sm text-orange-700 mt-3 text-center">
                  + {analytics.lowStockItems.length - 6} more items need
                  attention
                </p>
              )}
            </CardContent>
          </Card>
        )}
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Which Items Sell Most</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This chart shows which items bring in the most money
              </p>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry: any, index: any) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => `₹${value.toFixed(2)}`}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profit vs Cost Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Money Made vs Money Spent</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                See how much you earned vs spent for each item
              </p>
            </CardHeader>
            <CardContent>
              {profitChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={profitChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="revenue"
                      fill="#3b82f6"
                      name="Revenue"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="cost"
                      fill="#f59e0b"
                      name="Cost"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="profit"
                      fill="#10b981"
                      name="Profit"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>Item-wise Details</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              See exactly how much each item made and cost
            </p>
          </CardHeader>
          <CardContent>
            {analytics.categories.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-white">
                        Category
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-white">
                        Qty Sold
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-white">
                        Revenue
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-white">
                        Cost
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-white">
                        Profit
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-white">
                        Margin
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.categories.map((cat: any, index: any) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:hover:bg-gray-500 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <span className="font-medium">{cat.category}</span>
                          </div>
                          {/* Future: Display flavors here */}
                          {/* <div className="text-xs text-gray-500 mt-1 dark:text-white">
                            {Object.keys(cat.flavors || {}).join(', ')}
                          </div> */}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700 dark:text-white dark:text-gray-300">
                          {formatNumber(cat.quantity)}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700 dark:text-white dark:text-gray-300">
                          {formatCurrency(cat.revenue)}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700 dark:text-white dark:text-gray-300">
                          {formatCurrency(cat.cost)}
                        </td>
                        <td
                          className={`text-right py-3 px-4 font-semibold ${
                            cat.profit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatCurrency(cat.profit)}
                        </td>
                        <td className="text-right py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              parseFloat(cat.profitMargin) >= 40
                                ? "bg-green-100 text-green-800"
                                : parseFloat(cat.profitMargin) >= 20
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {cat.profitMargin}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>
        {/* Recent Sales Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your latest 5 sales
            </p>
          </CardHeader>
          <CardContent>
            {recentInvoices.length > 0 ? (
              <div className="space-y-3">
                {recentInvoices.map((invoice: any, index: any) => {
                  const invoiceProfit =
                    invoice.lineItems?.reduce((sum: any, item: any) => {
                      const profit =
                        ((item.fullItem?.sellingPrice ||
                          item.fullItem?.price ||
                          0) -
                          (item.fullItem?.costPrice || 0)) *
                        item.quantity;
                      return sum + profit;
                    }, 0) || 0;

                  const invoiceDate = new Date(
                    (invoice.createdAt?.seconds || 0) * 1000
                  );
                  const isToday =
                    invoiceDate.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={invoice.id || index}
                      className="flex items-center justify-between p-3 rounded-lg transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {invoice.name || "Customer"}
                          </p>
                          {isToday && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium">
                              Today
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 dark:text-white">
                          {invoice.invoiceId || "N/A"} •{" "}
                          {invoice.lineItems?.length || 0} items •{" "}
                          {invoice.paymentMode || "Cash"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(invoice.total || 0)}
                        </p>
                        <p
                          className={`text-xs font-medium ${
                            invoiceProfit >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          Profit: {formatCurrency(invoiceProfit)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No recent transactions
              </div>
            )}
          </CardContent>
        </Card>
        {/* Summary Insights - Simplified Language */}
        {analytics.categories.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-100">
                Quick Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    🏆 Best Seller
                  </p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {analytics.categories[0]?.category}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatNumber(analytics.categories[0]?.quantity)} items sold
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    💰 Most Profitable
                  </p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {
                      analytics.categories.reduce(
                        (max: any, cat: any) =>
                          cat.profit > max.profit ? cat : max,
                        analytics.categories[0]
                      )?.category
                    }
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatCurrency(
                      analytics.categories.reduce(
                        (max: any, cat: any) =>
                          cat.profit > max.profit ? cat : max,
                        analytics.categories[0]
                      )?.profit || 0
                    )}{" "}
                    profit
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    📊 Average Sale
                  </p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {filteredInvoices.length > 0
                      ? formatCurrency(
                          analytics.totalRevenue / filteredInvoices.length
                        )
                      : formatCurrency(0)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatNumber(filteredInvoices.length)} total orders
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Payment Modes Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>How Customers Paid</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              See which payment methods customers used most
            </p>
          </CardHeader>
          <CardContent>
            {(() => {
              // Calculate payment mode totals
              const paymentModes: any = {};

              filteredInvoices.forEach((invoice: any) => {
                const mode = invoice.paymentMode || "Cash";
                const total = invoice.total || 0;

                if (!paymentModes[mode]) {
                  paymentModes[mode] = {
                    mode: mode,
                    total: 0,
                    count: 0,
                  };
                }

                paymentModes[mode].total += total;
                paymentModes[mode].count += 1;
              });

              const paymentData: any = Object.values(paymentModes).sort(
                (a: any, b: any) => b.total - a.total
              );

              const totalPayments: any = paymentData.reduce(
                (sum: any, item: any) => sum + item.total,
                0
              );

              return paymentData.length > 0 ? (
                <div className="space-y-4">
                  {/* Visual Bars */}
                  <div className="space-y-3">
                    {paymentData.map((payment: any, index: any) => {
                      const percentage =
                        totalPayments > 0
                          ? (payment.total / totalPayments) * 100
                          : 0;

                      return (
                        <div key={payment.mode} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    COLORS[index % COLORS.length],
                                }}
                              />
                              <span className="font-medium text-gray-900">
                                {payment.mode}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({payment.count} transactions)
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900 dark:text-white">
                                {formatCurrency(payment.total)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {percentage.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full transition-all duration-300"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                        Total Collected
                      </p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {formatCurrency(totalPayments)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
                      <p className="text-sm text-green-700 dark:text-green-300 mb-1">
                        Most Used Payment
                      </p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {paymentData[0]?.mode}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                        {formatNumber(paymentData[0]?.count || 0)} transactions
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No payment data available
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
