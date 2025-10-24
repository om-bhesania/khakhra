import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import {
  IndianRupee,
  Loader2,
  Package,
  Percent,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
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
  const { readDocuments, loading, error } = useFirestoreCRUD();
  const [timeFilter, setTimeFilter] = useState("today");
  const [invoices, setInvoices] = useState([]);
  const [inventory, setInventory] = useState([]);
  console.log("inventory", inventory);
  const timeFilters = [
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "all", label: "All Time" },
  ];

  // Fetch invoices and inventory on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const invoicesData: any = await readDocuments("bills", { limit: 1000 });
        const inventoryData: any = await readDocuments("inventory", {
          limit: 1000,
        });
        setInvoices(invoicesData || []);
        setInventory(inventoryData || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();
  }, []);

  // Filter invoices based on selected time period
  const filteredInvoices = useMemo(() => {
    if (!invoices.length) return [];

    const now = Date.now() / 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime() / 1000;

    return invoices.filter((invoice: any) => {
      const invoiceTime = invoice.createdAt?.seconds || 0;

      switch (timeFilter) {
        case "today":
          return invoiceTime >= todayStart;
        case "week":
          return invoiceTime >= now - 7 * 24 * 60 * 60;
        case "month":
          return invoiceTime >= now - 30 * 24 * 60 * 60;
        case "all":
        default:
          return true;
      }
    });
  }, [invoices, timeFilter]);

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
          name: `₹${item.price || item.sellingPrice}`, // Using price as name
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

        totalRevenue += revenue;
        totalCost += cost;
        totalProfit += profit;
        totalItemsSold += quantity;

        if (!categoryData[categoryKey]) {
          categoryData[categoryKey] = {
            category: `₹${categoryKey}`,
            price: categoryKey,
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
    name: cat.category,
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

  if (loading && !invoices.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 mx-auto" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800 font-semibold">Error loading data</p>
          <p className="text-red-600 text-sm mt-2">{error}</p>
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
            <h1 className="text-3xl font-bold text-gray-900">
              Sales Dashboard
            </h1>
            <p className="text-gray-500 mt-1">Profit & Loss Analytics</p>
          </div>

          {/* Time Filter Buttons */}
          <div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm">
            {timeFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTimeFilter(filter.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  timeFilter === filter.value
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Revenue
              </CardTitle>
              <IndianRupee className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ₹{analytics.totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total money received from customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Cost
              </CardTitle>
              <Package className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ₹{analytics.totalCost.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Money spent on making products
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Profit
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
                ₹{analytics.totalProfit.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Money you earned after expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Profit Margin
              </CardTitle>
              <Percent className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {analytics.profitMargin}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Profit percentage on each sale
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Items Sold
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {analytics.totalItemsSold}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Number of products sold
              </p>
            </CardContent>
          </Card>
          <Card className="!gap-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Inventory Value
              </CardTitle>
              <Package className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ₹{analytics.totalInventoryValue}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total value of remaining stock
              </p>
            </CardContent>
          </Card>
        </div>
        {/* Low Stock Alerts */}
        {analytics.lowStockItems?.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-orange-900 flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Low Stock Alert
                  </CardTitle>
                  <p className="text-sm text-orange-700 mt-1">
                    Items need restocking
                  </p>
                </div>
                <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
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
                          <p className="text-xs text-gray-600 mt-1">
                            {item.status === "outofstock"
                              ? "Out of Stock"
                              : `Only ${item.quantity} left`}
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
              <CardTitle>Revenue by Category</CardTitle>
              <p className="text-sm text-gray-500">
                Distribution across price points
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
              <CardTitle>Profit Analysis by Category</CardTitle>
              <p className="text-sm text-gray-500">
                Revenue, Cost & Profit comparison
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
            <CardTitle>Category Performance Details</CardTitle>
            <p className="text-sm text-gray-500">
              Detailed breakdown by price category
            </p>
          </CardHeader>
          <CardContent>
            {analytics.categories.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Category
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">
                        Qty Sold
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">
                        Revenue
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">
                        Cost
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">
                        Profit
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">
                        Margin
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.categories.map((cat: any, index: any) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-gray-50"
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
                          {/* <div className="text-xs text-gray-500 mt-1">
                            {Object.keys(cat.flavors || {}).join(', ')}
                          </div> */}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700">
                          {cat.quantity}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700">
                          ₹{cat.revenue.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700">
                          ₹{cat.cost.toFixed(2)}
                        </td>
                        <td
                          className={`text-right py-3 px-4 font-semibold ${
                            cat.profit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          ₹{cat.profit.toFixed(2)}
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
            <CardTitle>Recent Sales Activity</CardTitle>
            <p className="text-sm text-gray-500">Latest transactions</p>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length > 0 ? (
              <div className="space-y-3">
                {filteredInvoices
                  .slice(0, 10)
                  .map((invoice: any, index: any) => {
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
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">
                              {invoice.name || "Customer"}
                            </p>
                            {isToday && (
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                Today
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {invoice.invoiceId || "N/A"} •{" "}
                            {invoice.lineItems?.length || 0} items •{" "}
                            {invoice.paymentMode || "Cash"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            ₹{(invoice.total || 0).toFixed(2)}
                          </p>
                          <p
                            className={`text-xs font-medium ${
                              invoiceProfit >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            Profit: ₹{invoiceProfit.toFixed(2)}
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
        {/* Summary Insights */}
        {analytics.categories.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Key Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">
                    Best Selling Category
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    {analytics.categories[0]?.category}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analytics.categories[0]?.quantity} units sold
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">
                    Most Profitable Category
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    {
                      analytics.categories.reduce(
                        (max: any, cat: any) =>
                          cat.profit > max.profit ? cat : max,
                        analytics.categories[0]
                      )?.category
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ₹
                    {analytics.categories
                      .reduce(
                        (max: any, cat: any) =>
                          cat.profit > max.profit ? cat : max,
                        analytics.categories[0]
                      )
                      ?.profit.toFixed(2)}{" "}
                    profit
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">
                    Average Order Value
                  </p>
                  <p className="text-xl font-bold text-purple-600">
                    ₹
                    {(analytics.totalRevenue / filteredInvoices.length).toFixed(
                      2
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {filteredInvoices.length} total orders
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Home;
