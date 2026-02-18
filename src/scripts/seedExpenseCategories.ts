/**
 * Seed default expense categories
 * Run this script once to populate the expenseCategories collection
 */

import { db } from "../config/firebase.config";
import { collection, doc, writeBatch, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const DEFAULT_CATEGORIES = [
  "Rent",
  "Utilities",
  "Electricity",
  "Water",
  "Internet",
  "Salaries",
  "Raw Materials",
  "Packaging",
  "Transportation",
  "Fuel",
  "Maintenance",
  "Office Supplies",
  "Marketing",
  "Advertising",
  "Insurance",
  "Taxes",
  "Professional Fees",
  "Equipment",
  "Repairs",
  "Cleaning",
  "Security",
  "Miscellaneous",
];

export const seedExpenseCategories = async () => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.error("No authenticated user found. Please sign in first.");
      return;
    }

    const batch = writeBatch(db);
    const categoriesRef = collection(
      db,
      `users/${currentUser.uid}/expenseCategories`
    );

    DEFAULT_CATEGORIES.forEach((categoryName) => {
      const categoryDoc = doc(categoriesRef);
      batch.set(categoryDoc, {
        name: categoryName,
        createdAt: Timestamp.now(),
      });
    });

    await batch.commit();
    console.log(`✅ Successfully seeded ${DEFAULT_CATEGORIES.length} categories`);
  } catch (error) {
    console.error("❌ Error seeding categories:", error);
    throw error;
  }
};

// For direct execution in browser console:
// 1. Import this file in your app
// 2. Call seedExpenseCategories() from browser console
// 3. Or add a button in UI to trigger this

export default seedExpenseCategories;
