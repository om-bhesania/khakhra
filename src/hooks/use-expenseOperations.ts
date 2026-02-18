import { useCallback, useState } from "react";
import { Timestamp, writeBatch, doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { getAuth } from "firebase/auth";
import type { Expense, ExpenseCategory, FinanceStats } from "@/types/expense";
import { toast } from "sonner";

/**
 * Custom hook for expense operations
 * SIMPLIFIED - No caching, just direct Firestore operations
 */
export const useExpenseOperations = () => {
  const auth = getAuth();
  const [loading, setLoading] = useState(false);

  /**
   * Generate monthKey from date
   * Format: YYYY-MM
   */
  const getMonthKey = useCallback((date: Date | Timestamp): string => {
    const d = date instanceof Timestamp ? date.toDate() : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }, []);

  /**
   * Add expense OR income with automatic financeStats update
   * Uses batched write for atomicity
   */
  const addExpense = useCallback(
    async (expenseData: {
      type: "income" | "expense";
      date: Date;
      amount: number;
      category: string;
      description: string;
    }): Promise<void> => {
      setLoading(true);
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("No authenticated user");

        const now = Timestamp.now();
        const expenseDate = Timestamp.fromDate(expenseData.date);
        const monthKey = getMonthKey(expenseDate);

        // Create batch
        const batch = writeBatch(db);

        // Add expense/income document
        const expenseRef = doc(
          db,
          `users/${currentUser.uid}/expenses`,
          crypto.randomUUID()
        );
        
        const expense: Omit<Expense, "id"> = {
          type: expenseData.type,
          date: expenseDate,
          amount: expenseData.amount,
          category: expenseData.category,
          description: expenseData.description,
          monthKey,
          createdAt: now,
          updatedAt: now,
        };
        batch.set(expenseRef, expense);

        // Update financeStats based on type
        const statsRef = doc(
          db,
          `users/${currentUser.uid}/financeStats`,
          monthKey
        );

        // Get existing stats directly
        const statsSnap = await getDoc(statsRef);
        const existingStats = statsSnap.exists() ? statsSnap.data() as FinanceStats : null;

        if (existingStats) {
          // Increment existing stats based on type
          if (expenseData.type === "expense") {
            batch.update(statsRef, {
              totalExpenses: existingStats.totalExpenses + expenseData.amount,
              transactionCount: existingStats.transactionCount + 1,
              updatedAt: now,
            });
          } else {
            // It's income
            batch.update(statsRef, {
              totalRevenue: existingStats.totalRevenue + expenseData.amount,
              transactionCount: existingStats.transactionCount + 1,
              updatedAt: now,
            });
          }
        } else {
          // Create new stats document
          const newStats: Omit<FinanceStats, "id"> = {
            monthKey,
            totalRevenue: expenseData.type === "income" ? expenseData.amount : 0,
            totalExpenses: expenseData.type === "expense" ? expenseData.amount : 0,
            transactionCount: 1,
            updatedAt: now,
          };
          batch.set(statsRef, newStats);
        }

        // Commit batch
        await batch.commit();
        
        const successMessage = expenseData.type === "income" 
          ? "Income added successfully! Dashboard will update automatically." 
          : "Expense added successfully! Dashboard will update automatically.";
        toast.success(successMessage);
      } catch (error: any) {
        console.error("Error adding transaction:", error);
        toast.error(error.message || "Failed to add transaction");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [auth.currentUser, getMonthKey]
  );

  /**
   * Update revenue in financeStats (called when bill is created)
   */
  const updateRevenueStats = useCallback(
    async (amount: number, date: Timestamp): Promise<void> => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("No authenticated user");

        const monthKey = getMonthKey(date);
        const now = Timestamp.now();

        const batch = writeBatch(db);
        const statsRef = doc(
          db,
          `users/${currentUser.uid}/financeStats`,
          monthKey
        );

        // Get existing stats directly
        const statsSnap = await getDoc(statsRef);
        const existingStats = statsSnap.exists() ? statsSnap.data() as FinanceStats : null;

        if (existingStats) {
          batch.update(statsRef, {
            totalRevenue: existingStats.totalRevenue + amount,
            updatedAt: now,
          });
        } else {
          const newStats: Omit<FinanceStats, "id"> = {
            monthKey,
            totalRevenue: amount,
            totalExpenses: 0,
            transactionCount: 0,
            updatedAt: now,
          };
          batch.set(statsRef, newStats);
        }

        await batch.commit();
        console.log("✅ Revenue stats updated successfully");
      } catch (error) {
        console.error("Error updating revenue stats:", error);
        throw error;
      }
    },
    [auth.currentUser, getMonthKey]
  );

  /**
   * Delete expense/income with financeStats update
   */
  const deleteExpense = useCallback(
    async (expenseId: string): Promise<void> => {
      setLoading(true);
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("No authenticated user");

        // Get expense details first
        const expenseRef = doc(
          db,
          `users/${currentUser.uid}/expenses`,
          expenseId
        );
        const expenseSnap = await getDoc(expenseRef);
        
        if (!expenseSnap.exists()) {
          throw new Error("Transaction not found");
        }
        
        const expense = { ...expenseSnap.data(), id: expenseSnap.id } as Expense;

        const batch = writeBatch(db);

        // Delete expense
        batch.delete(expenseRef);

        // Update financeStats based on transaction type
        const statsRef = doc(
          db,
          `users/${currentUser.uid}/financeStats`,
          expense.monthKey
        );
        
        const statsSnap = await getDoc(statsRef);
        const existingStats = statsSnap.exists() ? statsSnap.data() as FinanceStats : null;

        if (existingStats) {
          if (expense.type === "expense") {
            batch.update(statsRef, {
              totalExpenses: Math.max(0, existingStats.totalExpenses - expense.amount),
              transactionCount: Math.max(0, existingStats.transactionCount - 1),
              updatedAt: Timestamp.now(),
            });
          } else {
            // It's income
            batch.update(statsRef, {
              totalRevenue: Math.max(0, existingStats.totalRevenue - expense.amount),
              transactionCount: Math.max(0, existingStats.transactionCount - 1),
              updatedAt: Timestamp.now(),
            });
          }
        }

        await batch.commit();
        
        const successMessage = expense.type === "income"
          ? "Income deleted successfully! Dashboard will update automatically."
          : "Expense deleted successfully! Dashboard will update automatically.";
        toast.success(successMessage);
      } catch (error: any) {
        console.error("Error deleting transaction:", error);
        toast.error(error.message || "Failed to delete transaction");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [auth.currentUser]
  );

  /**
   * Get or create expense category
   */
  const getOrCreateCategory = useCallback(
    async (categoryName: string): Promise<string> => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("No authenticated user");

        // Check if category exists (case insensitive)
        const categoriesRef = collection(db, `users/${currentUser.uid}/expenseCategories`);
        const categoriesSnap = await getDocs(categoriesRef);
        
        const existing = categoriesSnap.docs.find(
          (doc) => doc.data().name.toLowerCase() === categoryName.toLowerCase()
        );

        if (existing) {
          return existing.data().name; // Return existing category name (preserves casing)
        }

        // Create new category
        const newCategoryRef = doc(
          db,
          `users/${currentUser.uid}/expenseCategories`,
          crypto.randomUUID()
        );
        
        await setDoc(newCategoryRef, {
          name: categoryName,
          createdAt: Timestamp.now(),
        });

        return categoryName;
      } catch (error) {
        console.error("Error getting/creating category:", error);
        throw error;
      }
    },
    [auth.currentUser]
  );

  return {
    addExpense,
    deleteExpense,
    updateRevenueStats,
    getOrCreateCategory,
    loading,
  };
};
