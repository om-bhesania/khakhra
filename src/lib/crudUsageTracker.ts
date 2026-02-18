import { getAuth } from "firebase/auth";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/config/firebase.config";

export type CrudOperation = "CREATE" | "READ" | "UPDATE" | "DELETE";

interface CrudUsageLogData {
  operation: CrudOperation;
  collection: string;
  userId: string;
  timestamp: Timestamp;
  createdAt: Timestamp;
  metadata?: {
    documentId?: string;
    collectionPath?: string;
    [key: string]: any;
  };
}

/**
 * Log CRUD operation to Firestore for usage tracking
 * This is a fire-and-forget operation to avoid blocking the main operation
 */
export async function logCrudUsage(
  operation: CrudOperation,
  collectionName: string,
  metadata?: CrudUsageLogData["metadata"]
): Promise<void> {
  try { 
    const auth = getAuth();
    const user = auth.currentUser;

    // Don't log if user is not authenticated (shouldn't happen but safety check)
    if (!user) {
      console.warn("Cannot log CRUD usage: user not authenticated");
      return;
    }

    const now = Timestamp.now();
    const logData: CrudUsageLogData = {
      operation,
      collection: collectionName,
      userId: user.uid,
      timestamp: now,
      createdAt: now,
      metadata: metadata || {},
    };

    // Fire and forget - don't await to avoid blocking the main operation
    addDoc(collection(db, "crud_usage_logs"), logData).catch((error) => {
      // Silently fail - logging shouldn't break the main operation
      console.error("Failed to log CRUD usage:", error);
    });
  } catch (error) {
    // Silently fail - logging shouldn't break the main operation
    console.error("Error logging CRUD usage:", error);
  }
}

