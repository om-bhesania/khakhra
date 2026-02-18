import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import type {
  Expense,
  FinanceStats,
  RevenueVsExpenseData,
  ProfitTrendData,
  ExpenseByCategoryData,
  ExpenseDashboardSummary,
} from "@/types/expense";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Percent,
  Calendar,
  DollarSign,
  Receipt,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const ExpenseDashboard = () => {
  const { subscribeToCollection } = useFirestoreCRUD();

  const [isLoading, setIsLoading] = useState(true);
  const [financeStats, setFinanceStats] = useState<Record<string, FinanceStats>>({});
  const [currentMonthExpenses, setCurrentMonthExpenses] = useState<Expense[]>([]);
  const [indexError, setIndexError] = useState<string | null>(null);

  const currentMonthKey = useMemo(() => {
    return new Date().toISOString().slice(0, 7);
  }, []);

  // Get last 6 month keys
  const last6MonthKeys = useMemo(() => {
    const keys: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(date.toISOString().slice(0, 7));
    }
    return keys;
  }, []);

  /**
   * Subscribe to ALL financeStats in real-time
   * This ensures dashboard always has latest data
   */
  useEffect(() => {
    console.log("🔥 Setting up financeStats subscription");
    
    const unsubscribe = subscribeToCollection("financeStats", {
      limit: 100,
      onUpdate: (docs) => {
        console.log("📊 FinanceStats updated:", docs.length, "documents");
        
        // Convert array to map for easy lookup
        const statsMap: Record<string, FinanceStats> = {};
        docs.forEach((doc: any) => {
          statsMap[doc.monthKey || doc.id] = {
            id: doc.id,
            monthKey: doc.monthKey || doc.id,
            totalRevenue: doc.totalRevenue || 0,
            totalExpenses: doc.totalExpenses || 0,
            transactionCount: doc.transactionCount || 0,
            updatedAt: doc.updatedAt,
          };
        });
        
        // Fill in empty months if they don't exist
        last6MonthKeys.forEach(monthKey => {
          if (!statsMap[monthKey]) {
            statsMap[monthKey] = {
              id: monthKey,
              monthKey,
              totalRevenue: 0,
              totalExpenses: 0,
              transactionCount: 0,
              updatedAt: new Date() as any,
            };
          }
        });
        
        setFinanceStats(statsMap);
        setIsLoading(false);
      },
      onError: (error) => {
        console.error("❌ Error loading finance stats:", error);
        if (error.includes("index")) {
          setIndexError(error);
        }
        setIsLoading(false);
      },
    });

    return () => {
      console.log("🧹 Cleaning up financeStats subscription");
      unsubscribe && unsubscribe();
    };
  }, [subscribeToCollection, last6MonthKeys]);

  /**
   * Subscribe to ALL expenses in real-time
   * Filter to current month client-side
   */
  useEffect(() => {
    console.log("🔥 Setting up expenses subscription");
    
    const unsubscribe = subscribeToCollection("expenses", {
      limit: 1000,
      orderBy: "date",
      orderDirection: "desc",
      onUpdate: (docs) => {
        console.log("💰 Expenses updated:", docs.length, "total expenses");
        
        // Filter to current month only
        const currentMonth = (docs || []).filter(
          (exp: Expense) => exp.monthKey === currentMonthKey
        );
        
        console.log("📅 Current month expenses:", currentMonth.length);
        setCurrentMonthExpenses(currentMonth);
      },
      onError: (error) => {
        console.error("❌ Error loading expenses:", error);
        setCurrentMonthExpenses([]);
      },
    });

    return () => {
      console.log("🧹 Cleaning up expenses subscription");
      unsubscribe && unsubscribe();
    };
  }, [subscribeToCollection, currentMonthKey]);

  // Calculate current month summary from real-time stats
  const currentMonthSummary: ExpenseDashboardSummary = useMemo(() => {
    const currentStats = financeStats[currentMonthKey];

    if (!currentStats) {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        profit: 0,
        profitMargin: 0,
      };
    }

    const profit = currentStats.totalRevenue - currentStats.totalExpenses;
    const profitMargin =
      currentStats.totalRevenue > 0
        ? (profit / currentStats.totalRevenue) * 100
        : 0;

    return {
      totalRevenue: currentStats.totalRevenue,
      totalExpenses: currentStats.totalExpenses,
      profit,
      profitMargin,
    };
  }, [financeStats, currentMonthKey]);

  // Revenue vs Expenses chart data
  const revenueVsExpenseData: RevenueVsExpenseData[] = useMemo(() => {
    return last6MonthKeys.map((monthKey) => {
      const stat = financeStats[monthKey] || {
        totalRevenue: 0,
        totalExpenses: 0,
      };
      
      const [year, month] = monthKey.split("-");
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
        "en-US",
        { month: "short", year: "2-digit" }
      );

      return {
        month: monthName,
        revenue: stat.totalRevenue,
        expenses: stat.totalExpenses,
      };
    }).reverse(); // Oldest to newest for chart
  }, [financeStats, last6MonthKeys]);

  // Profit trend chart data
  const profitTrendData: ProfitTrendData[] = useMemo(() => {
    return last6MonthKeys.map((monthKey) => {
      const stat = financeStats[monthKey] || {
        totalRevenue: 0,
        totalExpenses: 0,
      };
      
      const [year, month] = monthKey.split("-");
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
        "en-US",
        { month: "short", year: "2-digit" }
      );

      return {
        month: monthName,
        profit: stat.totalRevenue - stat.totalExpenses,
      };
    }).reverse(); // Oldest to newest for chart
  }, [financeStats, last6MonthKeys]);

  // Expense by category (current month) - client-side aggregation
  const expenseByCategoryData: ExpenseByCategoryData[] = useMemo(() => {
    const categoryTotals: Record<string, number> = {};

    // Only count actual expenses, not income
    currentMonthExpenses
      .filter((exp) => exp.type === "expense")
      .forEach((expense) => {
        categoryTotals[expense.category] =
          (categoryTotals[expense.category] || 0) + expense.amount;
      });

    const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

    return Object.entries(categoryTotals)
      .map(([category, amount], index) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [currentMonthExpenses]);

  const formatCurrency = (amount: number): string => {
    return `₹${Math.round(amount).toLocaleString("en-IN")}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry: any, index: any) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Show index creation prompt if there's an error
  if (indexError) {
    const indexUrl = indexError.match(/https:\/\/[^\s]+/)?.[0];

    return (
      <div className="container mx-auto py-6">
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
              <AlertCircle className="h-5 w-5" />
              Firestore Index Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-orange-800 dark:text-orange-200">
              To use the expense dashboard, you need to create a Firestore index. This is a one-time setup.
            </p>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-orange-300 dark:border-orange-700">
              <p className="font-semibold mb-2 text-gray-900 dark:text-white">Steps to create the index:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>Click the button below to open Firebase Console</li>
                <li>Review the index configuration</li>
                <li>Click "Create Index"</li>
                <li>Wait 1-2 minutes for the index to build</li>
                <li>Refresh this page</li>
              </ol>
            </div>

            {indexUrl && (
              <Button
                onClick={() => window.open(indexUrl, "_blank")}
                className="w-full md:w-auto"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Create Index in Firebase Console
              </Button>
            )}

            <p className="text-xs text-orange-700 dark:text-orange-300">
              Note: The index only needs to be created once. After creation, the dashboard will work normally.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 mx-auto text-blue-500" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading financial dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Show empty state if no data at all
  const hasAnyData = Object.values(financeStats).some(
    (s) => s.totalRevenue > 0 || s.totalExpenses > 0
  );

  if (!hasAnyData) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Financial Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time income, expenses, and profitability tracking
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Financial Data Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Start by creating bills or adding expenses to see your dashboard
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => (window.location.href = "/billing/add")}>
                Create a Bill
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/expenses/add")}
              >
                Add Expense
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Financial Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time income, expenses, and profitability tracking
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live Data
        </div>
      </div>

      {/* Summary Cards - Current Month */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Revenue
            </CardTitle>
            <Receipt className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(currentMonthSummary.totalRevenue)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This month's income
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Expenses
            </CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(currentMonthSummary.totalExpenses)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This month's spending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Profit / Loss
            </CardTitle>
            {currentMonthSummary.profit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                currentMonthSummary.profit >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(currentMonthSummary.profit)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {currentMonthSummary.profit >= 0
                ? "You're in profit!"
                : "Operating at a loss"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Profit Margin
            </CardTitle>
            <Percent className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentMonthSummary.profitMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Profit per rupee earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Compare income and spending over last 6 months
            </p>
          </CardHeader>
          <CardContent>
            {revenueVsExpenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueVsExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
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
                    dataKey="expenses"
                    fill="#f59e0b"
                    name="Expenses"
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

        {/* Profit Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Profit Trend</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track profitability over time
            </p>
          </CardHeader>
          <CardContent>
            {profitTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={profitTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 4 }}
                    name="Profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown Section */}
      {expenseByCategoryData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current month breakdown
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseByCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }: any) =>
                      `${category} (${percentage.toFixed(0)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {expenseByCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Details */}
          <Card>
            <CardHeader>
              <CardTitle>Category Details</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Spending by category this month
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expenseByCategoryData.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {cat.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(cat.amount)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {cat.percentage.toFixed(1)}% of total
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Month Summary Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            This Month's Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                💰 Money In
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(currentMonthSummary.totalRevenue)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                From bills & manual income
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                💸 Money Out
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(currentMonthSummary.totalExpenses)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                From tracked expenses
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {currentMonthSummary.profit >= 0 ? "✅ Profit" : "❌ Loss"}
              </p>
              <p
                className={`text-2xl font-bold ${
                  currentMonthSummary.profit >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatCurrency(Math.abs(currentMonthSummary.profit))}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {currentMonthSummary.profitMargin.toFixed(1)}% margin
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseDashboard;
