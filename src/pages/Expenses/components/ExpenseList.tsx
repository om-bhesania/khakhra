import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { useExpenseOperations } from "@/hooks/use-expenseOperations";
import type { Expense, ExpenseCategory } from "@/types/expense";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Trash2,
  X,
  Calendar,
  IndianRupee,
  Tag,
  FileText,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ITEMS_PER_PAGE = 20;

const ExpenseList = () => {
  const { subscribeToCollection } = useFirestoreCRUD();
  const { deleteExpense, loading: operationLoading } = useExpenseOperations();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all"); // NEW: Type filter

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  // Load expenses with real-time subscription (NO CACHE)
  useEffect(() => {
    console.log("🔥 Setting up expenses subscription (ExpenseList)");
    setIsLoading(true);

    // Direct real-time subscription - no caching
    const unsubscribe = subscribeToCollection("expenses", {
      limit: 1000,
      orderBy: "date",
      orderDirection: "desc",
      onUpdate: (docs) => {
        console.log("💰 Expenses list updated:", docs?.length || 0, "transactions");
        setExpenses(docs || []);
        setIsLoading(false);
      },
      onError: (error) => {
        console.error("❌ Error loading expenses:", error);
        toast.error("Failed to load expenses");
        setIsLoading(false);
      },
    });

    return () => {
      console.log("🧹 Cleaning up expenses subscription (ExpenseList)");
      unsubscribe && unsubscribe();
    };
  }, [subscribeToCollection]);

  // Load categories with real-time subscription (NO CACHE)
  useEffect(() => {
    console.log("🔥 Setting up categories subscription");

    const unsubscribe = subscribeToCollection("expenseCategories", {
      limit: 1000,
      orderBy: "name",
      orderDirection: "asc",
      onUpdate: (docs) => {
        console.log("📋 Categories updated:", docs?.length || 0, "categories");
        setCategories(docs || []);
      },
      onError: (error) => {
        console.error("❌ Error loading categories:", error);
      },
    });

    return () => {
      console.log("🧹 Cleaning up categories subscription");
      unsubscribe && unsubscribe();
    };
  }, [subscribeToCollection]);

  // Apply filters (client-side)
  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    // Type filter
    if (selectedType && selectedType !== "all") {
      filtered = filtered.filter((exp) => exp.type === selectedType);
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom).getTime();
      filtered = filtered.filter((exp) => {
        const expDate = exp.date.toDate().getTime();
        return expDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo).getTime() + 86400000; // Add 1 day
      filtered = filtered.filter((exp) => {
        const expDate = exp.date.toDate().getTime();
        return expDate < toDate;
      });
    }

    // Category filter
    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter((exp) => exp.category === selectedCategory);
    }

    return filtered;
  }, [expenses, dateFrom, dateTo, selectedCategory, selectedType]);

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);
  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredExpenses, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, selectedCategory, selectedType]);

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedCategory("all");
    setSelectedType("all");
  };

  const handleDeleteClick = (expenseId: string) => {
    setExpenseToDelete(expenseId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return;

    try {
      await deleteExpense(expenseToDelete);
      setDeleteConfirmOpen(false);
      setExpenseToDelete(null);

      // Invalidate cache
      const expense = expenses.find((e) => e.id === expenseToDelete);
      if (expense) {
        await expenseCache.invalidateExpenses(expense.monthKey);
        await expenseCache.invalidateStats(expense.monthKey);
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const formatDate = (timestamp: any) => {
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const activeFiltersCount =
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (selectedCategory !== "all" ? 1 : 0) +
    (selectedType !== "all" ? 1 : 0);

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Transaction History
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          View and manage all your income and expenses
        </p>
      </div>

      {/* Filters Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-semibold bg-blue-500 text-white rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </CardTitle>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-sm"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Transaction Type Filter */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Income
                    </div>
                  </SelectItem>
                  <SelectItem value="expense">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Expense
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                type="date"
                id="dateFrom"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                max={dateTo || new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                type="date"
                id="dateTo"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Transactions ({filteredExpenses.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-500">Loading transactions...</span>
            </div>
          ) : paginatedExpenses.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-lg">
                {expenses.length === 0
                  ? "No transactions recorded yet"
                  : "No transactions match your filters"}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {expenses.length === 0
                  ? "Start tracking income and expenses to see them here"
                  : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        Category
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        Description
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        Amount
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedExpenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-3 px-4">
                          {expense.type === "income" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              💰 Income
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                              💸 Expense
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                          {formatDate(expense.date)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {expense.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {expense.description || "—"}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${
                          expense.type === "income"
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-900 dark:text-white"
                        }`}>
                          {expense.type === "income" ? "+" : ""}
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(expense.id)}
                            disabled={operationLoading}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {paginatedExpenses.map((expense) => (
                  <Card key={expense.id} className={`border-2 ${
                    expense.type === "income"
                      ? "border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/10"
                      : "border-gray-200 dark:border-gray-700"
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="mb-2">
                            {expense.type === "income" ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                💰 Income
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                💸 Expense
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(expense.date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Tag className="h-4 w-4 text-blue-500" />
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              {expense.category}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`flex items-center justify-end gap-1 text-lg font-bold mb-2 ${
                            expense.type === "income"
                              ? "text-green-600 dark:text-green-400"
                              : "text-gray-900 dark:text-white"
                          }`}>
                            <span>{expense.type === "income" ? "+" : ""}</span>
                            <IndianRupee className="h-4 w-4" />
                            {formatCurrency(expense.amount).slice(1)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(expense.id)}
                            disabled={operationLoading}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {expense.description && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                          {expense.description}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredExpenses.length)}{" "}
                    of {filteredExpenses.length} transactions
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This transaction will be permanently deleted
              and removed from your records and financial dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {operationLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpenseList;
