/**
 * Migration script to add monthKey to existing billing documents
 * This optimizes queries by enabling month-based filtering
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
 * Add monthKey field to existing bills
 */
export const addMonthKeyToBills = async () => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.error("No authenticated user found. Please sign in first.");
      return { success: false, message: "No authenticated user" };
    }

    // Get all bills
    const billsRef = collection(db, `users/${currentUser.uid}/bills`);
    const billsSnapshot = await getDocs(billsRef);

    if (billsSnapshot.empty) {
      console.log("No bills found to migrate");
      return { success: true, message: "No bills to migrate", count: 0 };
    }

    // Process in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    let processedCount = 0;
    let batch = writeBatch(db);
    let batchCount = 0;

    for (const billDoc of billsSnapshot.docs) {
      const billData = billDoc.data();

      // Skip if monthKey already exists
      if (billData.monthKey) {
        continue;
      }

      // Get date from createdAt timestamp
      const createdAt = billData.createdAt;
      if (!createdAt) {
        console.warn(`Bill ${billDoc.id} has no createdAt field, skipping`);
        continue;
      }

      const monthKey = getMonthKeyFromTimestamp(createdAt);

      // Add monthKey to the document
      batch.update(doc(db, `users/${currentUser.uid}/bills`, billDoc.id), {
        monthKey,
      });

      batchCount++;
      processedCount++;

      // Commit batch when it reaches the limit
      if (batchCount >= batchSize) {
        await batch.commit();
        console.log(`Committed batch of ${batchCount} bills`);
        batch = writeBatch(db);
        batchCount = 0;
      }
    }

    // Commit remaining documents
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount} bills`);
    }

    console.log(`✅ Successfully added monthKey to ${processedCount} bills`);
    return {
      success: true,
      message: `Migration complete`,
      count: processedCount,
    };
  } catch (error: any) {
    console.error("❌ Error migrating bills:", error);
    return {
      success: false,
      message: error.message || "Migration failed",
      count: 0,
    };
  }
};

export default addMonthKeyToBills;
