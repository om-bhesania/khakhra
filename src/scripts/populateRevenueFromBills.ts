/**
 * Migration script to populate financeStats from existing bills
 * This creates the monthly revenue aggregates from all existing bills
 */

import { db } from "../config/firebase.config";
import { collection, getDocs, writeBatch, doc, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

/**
 * Generate monthKey from a Timestamp
 * Format: YYYY-MM
 */
const getMonthKeyFromTimestamp = (timestamp: Timestamp): string => {
  const date = timestamp.toDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

/**
 * Populate financeStats from existing bills
 */
export const populateRevenueFromBills = async () => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.error("No authenticated user found. Please sign in first.");
      return { success: false, message: "No authenticated user" };
    }

    console.log("Starting revenue population from bills...");

    // Get all bills
    const billsRef = collection(db, `users/${currentUser.uid}/bills`);
    const billsSnapshot = await getDocs(billsRef);

    if (billsSnapshot.empty) {
      console.log("No bills found");
      return { success: true, message: "No bills to process", count: 0 };
    }

    console.log(`Found ${billsSnapshot.size} bills to process`);

    // Group bills by month and calculate totals
    const monthlyRevenue: Record<string, number> = {};

    billsSnapshot.docs.forEach((billDoc) => {
      const billData = billDoc.data();
      
      // Get the bill date (use createdAt or fallback to now)
      const billDate = billData.createdAt || Timestamp.now();
      const monthKey = getMonthKeyFromTimestamp(billDate);
      
      // Get the bill total
      const total = billData.total || 0;
      
      // Add to monthly total
      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = 0;
      }
      monthlyRevenue[monthKey] += total;
    });

    console.log("Monthly revenue calculated:", monthlyRevenue);

    // Get existing financeStats to preserve expense data
    const statsRef = collection(db, `users/${currentUser.uid}/financeStats`);
    const statsSnapshot = await getDocs(statsRef);
    const existingStats: Record<string, any> = {};

    statsSnapshot.docs.forEach((statDoc) => {
      existingStats[statDoc.id] = statDoc.data();
    });

    // Update financeStats with revenue
    const batch = writeBatch(db);
    let updateCount = 0;

    Object.entries(monthlyRevenue).forEach(([monthKey, revenue]) => {
      const statsDocRef = doc(db, `users/${currentUser.uid}/financeStats`, monthKey);
      
      // Preserve existing expense data if it exists
      const existing = existingStats[monthKey];
      
      const statsData = {
        monthKey,
        totalRevenue: revenue,
        totalExpenses: existing?.totalExpenses || 0,
        transactionCount: existing?.transactionCount || 0,
        updatedAt: Timestamp.now(),
      };

      batch.set(statsDocRef, statsData, { merge: true });
      updateCount++;
    });

    await batch.commit();

    console.log(`✅ Successfully populated revenue for ${updateCount} months`);
    
    return {
      success: true,
      message: `Revenue populated for ${updateCount} months`,
      count: updateCount,
      monthlyRevenue,
    };
  } catch (error: any) {
    console.error("❌ Error populating revenue:", error);
    return {
      success: false,
      message: error.message || "Population failed",
      count: 0,
    };
  }
};

export default populateRevenueFromBills;
