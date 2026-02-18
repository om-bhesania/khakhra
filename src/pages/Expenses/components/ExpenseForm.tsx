import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useExpenseOperations } from "@/hooks/use-expenseOperations";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { expenseCache } from "@/lib/expenseCache";
import type { ExpenseCategory, ExpenseFormValues } from "@/types/expense";
import { Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const ExpenseForm = () => {
  const { addExpense, getOrCreateCategory, loading } = useExpenseOperations();
  const { subscribeToCollection } = useFirestoreCRUD();

  const [formValues, setFormValues] = useState<ExpenseFormValues>({
    type: "expense", // Default to expense
    date: new Date().toISOString().split("T")[0],
    amount: "",
    category: "",
    description: "",
  });

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categorySearchOpen, setCategorySearchOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  // Load categories with real-time subscription (NO CACHE)
  useEffect(() => {
    console.log("🔥 Setting up categories subscription (ExpenseForm)");
    setIsLoadingCategories(true);

    // Direct real-time subscription - no caching
    const unsubscribe = subscribeToCollection("expenseCategories", {
      limit: 1000,
      orderBy: "name",
      orderDirection: "asc",
      onUpdate: (docs) => {
        console.log("📋 Categories loaded:", docs?.length || 0);
        setCategories(docs || []);
        setIsLoadingCategories(false);
      },
      onError: (error) => {
        console.error("❌ Error loading categories:", error);
        toast.error("Failed to load categories");
        setIsLoadingCategories(false);
      },
    });

    return () => {
      console.log("🧹 Cleaning up categories subscription (ExpenseForm)");
      unsubscribe && unsubscribe();
    };
  }, [subscribeToCollection]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCategorySelect = (categoryName: string) => {
    setFormValues((prev) => ({ ...prev, category: categoryName }));
    setCategorySearch(categoryName);
    setCategorySearchOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formValues.date) {
      toast.error("Please select a date");
      return;
    }

    const amount = parseFloat(formValues.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    if (!formValues.category.trim()) {
      toast.error("Please select or enter a category");
      return;
    }

    try {
      // Get or create category
      const categoryName = await getOrCreateCategory(formValues.category.trim());

      // Add expense
      await addExpense({
        type: formValues.type,
        date: new Date(formValues.date),
        amount,
        category: categoryName,
        description: formValues.description.trim(),
      });

      // Invalidate cache for the month
      const monthKey = new Date(formValues.date).toISOString().slice(0, 7);
      await expenseCache.invalidateExpenses(monthKey);
      await expenseCache.invalidateStats(monthKey);

      // Reset form
      setFormValues({
        type: "expense",
        date: new Date().toISOString().split("T")[0],
        amount: "",
        category: "",
        description: "",
      });
      setCategorySearch("");

      const successMessage = formValues.type === "income"
        ? "Income added successfully!"
        : "Expense added successfully!";
      toast.success(successMessage);
    } catch (error: any) {
      console.error("Error adding expense:", error);
      toast.error(error.message || "Failed to add expense");
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const showCreateNew =
    categorySearch.trim() &&
    !categories.some(
      (cat) => cat.name.toLowerCase() === categorySearch.toLowerCase()
    );

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            {formValues.type === "income" ? "Add Income" : "Add Expense"}
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            {formValues.type === "income"
              ? "Track your business income easily"
              : "Track your business expenses easily"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Transaction Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-base font-medium">
                Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formValues.type}
                onValueChange={(value: "income" | "expense") =>
                  setFormValues((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>💰 Income (Money Coming In)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="expense">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span>💸 Expense (Money Going Out)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {formValues.type === "income"
                  ? "Select this for money you received (sales, payments, etc.)"
                  : "Select this for money you spent (rent, salaries, bills, etc.)"}
              </p>
            </div>

            {/* Date Input */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-base font-medium">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                id="date"
                name="date"
                value={formValues.date}
                onChange={handleInputChange}
                max={new Date().toISOString().split("T")[0]}
                required
                className="text-base"
              />
              <p className="text-xs text-gray-500">
                {formValues.type === "income"
                  ? "When did you receive this money?"
                  : "When did you spend this money?"}
              </p>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-base font-medium">
                Amount (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                id="amount"
                name="amount"
                value={formValues.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
                className="text-base"
              />
              <p className="text-xs text-gray-500">
                {formValues.type === "income"
                  ? "How much money did you receive?"
                  : "How much money did you spend?"}
              </p>
            </div>

            {/* Category Input with Searchable Combobox */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-base font-medium">
                Category <span className="text-red-500">*</span>
              </Label>
              <Popover open={categorySearchOpen} onOpenChange={setCategorySearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categorySearchOpen}
                    className="w-full justify-between text-base font-normal"
                    type="button"
                  >
                    {formValues.category || "Select or create category..."}
                    <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search or type to create..."
                      value={categorySearch}
                      onValueChange={setCategorySearch}
                    />
                    <CommandEmpty>
                      {showCreateNew ? (
                        <div
                          className="px-2 py-3 text-sm cursor-pointer hover:bg-gray-100"
                          onClick={() => handleCategorySelect(categorySearch)}
                        >
                          <Plus className="inline h-4 w-4 mr-2" />
                          Create "{categorySearch}"
                        </div>
                      ) : (
                        "No category found."
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {isLoadingCategories ? (
                        <div className="px-2 py-3 text-sm text-gray-500">
                          <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                          Loading categories...
                        </div>
                      ) : (
                        filteredCategories.map((cat) => (
                          <CommandItem
                            key={cat.id}
                            value={cat.name}
                            onSelect={() => handleCategorySelect(cat.name)}
                          >
                            {cat.name}
                          </CommandItem>
                        ))
                      )}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-gray-500">
                {formValues.type === "income"
                  ? "What type of income? (e.g., Cash Sale, Online Payment, Service Fee, Other Income)"
                  : "What type of expense? (e.g., Rent, Utilities, Salaries, Raw Materials)"}
                <br />
                <span className="text-xs text-blue-600 dark:text-blue-400 mt-1 inline-block">
                  💡 Categories are shared between income and expenses for easy tracking
                </span>
              </p>
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-medium">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formValues.description}
                onChange={handleInputChange}
                placeholder="Add any notes about this expense..."
                rows={3}
                className="text-base resize-none"
              />
              <p className="text-xs text-gray-500">
                Any additional details you want to remember
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className={`flex-1 text-base py-6 ${
                  formValues.type === "income"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    {formValues.type === "income" ? "Add Income" : "Add Expense"}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormValues({
                    type: "expense",
                    date: new Date().toISOString().split("T")[0],
                    amount: "",
                    category: "",
                    description: "",
                  });
                  setCategorySearch("");
                }}
                className="text-base py-6"
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Quick Tips Card */}
      <Card className={`mt-6 ${
        formValues.type === "income"
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      }`}>
        <CardContent className="pt-6">
          <h3 className={`font-semibold mb-2 ${
            formValues.type === "income"
              ? "text-green-900 dark:text-green-100"
              : "text-blue-900 dark:text-blue-100"
          }`}>
            💡 Quick Tips
          </h3>
          {formValues.type === "income" ? (
            <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
              <li>• Record manual income like cash sales, service fees, or other payments</li>
              <li>• Bills from Billing module automatically count as income</li>
              <li>• Use clear category names (Cash Sale, Service Fee, Other Income)</li>
              <li>• Add notes to remember what the income was for</li>
            </ul>
          ) : (
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Add expenses as soon as you spend to track accurately</li>
              <li>• Use clear category names (Rent, Salaries, Raw Materials, etc.)</li>
              <li>• Add notes to remember why you spent the money</li>
              <li>• Review your expenses regularly to find savings</li>
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseForm;
