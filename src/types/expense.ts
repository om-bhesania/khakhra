import { Timestamp } from "firebase/firestore";

/**
 * Transaction type - can be income or expense
 */
export type TransactionType = "income" | "expense";

/**
 * Expense/Income document interface
 */
export interface Expense {
  id: string;
  date: Timestamp;
  amount: number;
  category: string;
  description: string;
  type: TransactionType; // NEW: income or expense
  createdAt: Timestamp;
  updatedAt: Timestamp;
  monthKey: string; // Format: "YYYY-MM" (e.g., "2026-02")
}

/**
 * Expense category interface
 */
export interface ExpenseCategory {
  id: string;
  name: string;
  createdAt: Timestamp;
}

/**
 * Monthly aggregated finance stats for read optimization
 */
export interface FinanceStats {
  id: string; // monthKey (e.g., "2026-02")
  monthKey: string;
  totalRevenue: number;
  totalExpenses: number;
  transactionCount: number;
  updatedAt: Timestamp;
}

/**
 * Form values for expense form
 */
export interface ExpenseFormValues {
  type: TransactionType; // NEW: income or expense
  date: string; // YYYY-MM-DD format
  amount: string;
  category: string;
  description: string;
}

/**
 * Chart data interfaces
 */
export interface RevenueVsExpenseData {
  month: string;
  revenue: number;
  expenses: number;
}

export interface ProfitTrendData {
  month: string;
  profit: number;
}

export interface ExpenseByCategoryData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

/**
 * Dashboard summary data
 */
export interface ExpenseDashboardSummary {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number;
}
