import { useState, useCallback, useEffect, useRef } from "react";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  QueryConstraint,
  Timestamp,
  FirestoreError,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import type { DocumentData, Unsubscribe } from "firebase/firestore";
import { db } from "../config/firebase.config";
import { getAuth } from "firebase/auth";

// Base document type with Firebase metadata
export interface FirestoreDocument {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Generic type for your documents
export type DocumentWithId<T> = T & FirestoreDocument;

// Collection schema definition
export interface CollectionSchema {
  name: string;
  fields: Record<string, any>;
  indexes?: string[];
}

// Query options
export interface QueryOptions {
  where?: {
    field: string;
    operator:
      | "=="
      | "!="
      | "<"
      | "<="
      | ">"
      | ">="
      | "array-contains"
      | "in"
      | "array-contains-any";
    value: any;
  }[];
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  limit?: number;
}

// Subscription options
export interface SubscriptionOptions extends QueryOptions {
  onUpdate: (data: any[]) => void;
  onError?: (error: string) => void;
}

// Cache implementation
class FirestoreCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string) {
    const keys = Array.from(this.cache.keys());
    keys.forEach((key) => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Simplified Firestore CRUD Hook with User-Specific Collections
 */
export function useFirestoreCRUD() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth();

  const collections = useRef<Map<string, CollectionSchema>>(new Map());
  const cache = useRef(new FirestoreCache());
  const subscriptions = useRef<Map<string, Unsubscribe>>(new Map());
  const throttleTimers = useRef<Map<string, number>>(new Map());

  // System-wide collections (not user-specific)
  const SYSTEM_COLLECTIONS = ["users", "roles", "permissions", "settings"];

  // Helper to get user-specific collection path
  const getUserCollectionPath = useCallback(
    (collectionName: string): string => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("No authenticated user. Please sign in first.");
      }

      // If collection path already contains '/', treat it as a full path
      if (collectionName.includes("/")) {
        // Replace {userId} placeholder with actual user ID
        return collectionName.replace("{userId}", currentUser.uid);
      }

      // System-wide collections don't need user-specific paths
      if (SYSTEM_COLLECTIONS.includes(collectionName)) {
        return collectionName;
      }

      // User-specific collections
      return `users/${currentUser.uid}/${collectionName}`;
    },
    [auth.currentUser]
  );

  const handleError = (err: unknown, operation: string) => {
    const errorMessage =
      err instanceof FirestoreError
        ? `${operation} failed: ${err.message} (${err.code})`
        : err instanceof Error
        ? `${operation} failed: ${err.message}`
        : `${operation} failed: Unknown error`;

    setError(errorMessage);
    console.error(`Firestore ${operation} error:`, err);
    return errorMessage;
  };

  /**
   * Create/Register a collection schema
   */
  const createCollection = useCallback((schema: CollectionSchema | string) => {
    const collectionSchema: CollectionSchema =
      typeof schema === "string" ? { name: schema, fields: {} } : schema;

    collections.current.set(collectionSchema.name, collectionSchema);
    console.log(`Collection '${collectionSchema.name}' registered`);

    return collectionSchema.name;
  }, []);

  /**
   * Add a document to a collection
   */
  const addDocument = useCallback(
    async <T extends DocumentData>(collectionName: string, data: T) => {
      setLoading(true);
      setError(null);

      try {
        if (!auth.currentUser) {
          throw new Error("No authenticated user. Please sign in first.");
        }

        const collPath = getUserCollectionPath(collectionName);
        console.log(`Adding document to: ${collPath}`);

        const collectionRef = collection(db, collPath);

        const documentData = {
          ...data,
          userId: auth.currentUser.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collectionRef, documentData);
        console.log(`Document added successfully with ID: ${docRef.id}`);

        const newDoc = {
          id: docRef.id,
          ...documentData,
        };

        // Update cache
        cache.current.set(`${collPath}_${docRef.id}`, newDoc);
        cache.current.invalidatePattern(collPath);

        setLoading(false);
        return newDoc;
      } catch (err) {
        handleError(err, "Add Document");
        setLoading(false);
        return null;
      }
    },
    [auth.currentUser, getUserCollectionPath]
  );

  /**
   * Read a single document by ID
   */
  const readDocById = useCallback(
    async <T extends DocumentData>(
      collectionName: string,
      id: string,
      useCache = true
    ): Promise<DocumentWithId<T> | null> => {
      if (!auth.currentUser) {
        const errorMsg = "No authenticated user. Please sign in first.";
        setError(errorMsg);
        return null;
      }

      const collPath = getUserCollectionPath(collectionName);
      const cacheKey = `${collPath}_${id}`;

      // Check cache
      if (useCache) {
        const cached = cache.current.get(cacheKey);
        if (cached) {
          console.log(`Cache hit for: ${cacheKey}`);
          return cached as DocumentWithId<T>;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const docRef = doc(db, collPath, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const document = {
            id: docSnap.id,
            ...docSnap.data(),
          } as unknown as DocumentWithId<T>;

          cache.current.set(cacheKey, document);
          setLoading(false);
          return document;
        } else {
          setError("Document not found");
          setLoading(false);
          return null;
        }
      } catch (err) {
        handleError(err, "Read Document");
        setLoading(false);
        return null;
      }
    },
    [auth.currentUser, getUserCollectionPath]
  );

  /**
   * Read all documents from a collection or with query
   */
  const readDocuments = useCallback(
    async <T extends DocumentData>(
      collectionName: string,
      options?: QueryOptions
    ): Promise<Array<DocumentWithId<T>>> => {
      if (!auth.currentUser) {
        const errorMsg = "No authenticated user. Please sign in first.";
        setError(errorMsg);
        return [];
      }
console.log("collectionName", collectionName);
      const collPath = getUserCollectionPath(collectionName);
      console.log("collPath", collPath);
      const cacheKey = `${collPath}_all_${JSON.stringify(options || {})}`;

      // Check cache only if no filters
      if (!options?.where && !options?.orderBy) {
        const cached = cache.current.get(cacheKey);
        if (cached) {
          console.log(`Cache hit for: ${cacheKey}`);
          return cached as Array<DocumentWithId<T>>;
        }
      }

      setLoading(true);
      setError(null);

      try {
        console.log(`Reading documents from: ${collPath}`);
        const collectionRef = collection(db, collPath);
        const constraints: QueryConstraint[] = [];

        // Build query
        if (options?.where) {
          options.where.forEach((w) => {
            constraints.push(where(w.field, w.operator, w.value));
          });
        }

        if (options?.orderBy) {
          constraints.push(
            orderBy(options.orderBy, options.orderDirection || "asc")
          );
        }

        const limitCount = options?.limit ? Math.min(options.limit, 1000) : 100;
        constraints.push(limit(limitCount));

        const q =
          constraints.length > 0
            ? query(collectionRef, ...constraints)
            : query(collectionRef, limit(100));

        const snapshot = await getDocs(q);
        console.log(`Found ${snapshot.docs.length} documents`);

        const documents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as unknown as Array<DocumentWithId<T>>;

        cache.current.set(cacheKey, documents);
        setLoading(false);
        return documents;
      } catch (err) {
        handleError(err, "Read Documents");
        setLoading(false);
        return [];
      }
    },
    [auth.currentUser, getUserCollectionPath]
  );

  /**
   * Update a document
   */
  const updateDocument = useCallback(
    async <T extends DocumentData>(
      collectionName: string,
      id: string,
      data: Partial<T>
    ) => {
      if (!auth.currentUser) {
        const errorMsg = "No authenticated user. Please sign in first.";
        setError(errorMsg);
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const collPath = getUserCollectionPath(collectionName);
        console.log(`Updating document: ${collPath}/${id}`);

        const docRef = doc(db, collPath, id);

        const updateData = {
          ...data,
          updatedAt: Timestamp.now(),
        };

        await updateDoc(docRef, updateData);
        console.log(`Document updated successfully`);

        // Invalidate cache
        cache.current.invalidate(`${collPath}_${id}`);
        cache.current.invalidatePattern(collPath);

        setLoading(false);
        return true;
      } catch (err) {
        handleError(err, "Update Document");
        setLoading(false);
        return false;
      }
    },
    [auth.currentUser, getUserCollectionPath]
  );

  /**
   * Delete a document
   */
  const deleteDocument = useCallback(
    async (collectionName: string, id: string) => {
      if (!auth.currentUser) {
        const errorMsg = "No authenticated user. Please sign in first.";
        setError(errorMsg);
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const collPath = getUserCollectionPath(collectionName);
        console.log(`Deleting document: ${collPath}/${id}`);

        const docRef = doc(db, collPath, id);
        await deleteDoc(docRef);
        console.log(`Document deleted successfully`);

        // Invalidate cache
        cache.current.invalidate(`${collPath}_${id}`);
        cache.current.invalidatePattern(collPath);

        setLoading(false);
        return true;
      } catch (err) {
        handleError(err, "Delete Document");
        setLoading(false);
        return false;
      }
    },
    [auth.currentUser, getUserCollectionPath]
  );

  /**
   * Delete multiple documents by IDs
   */
  const deleteDocumentsbyId = useCallback(
    async (collectionName: string, ids: string[]) => {
      if (!auth.currentUser) {
        const errorMsg = "No authenticated user. Please sign in first.";
        setError(errorMsg);
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const collPath = getUserCollectionPath(collectionName);
        console.log(`Batch deleting ${ids.length} documents from: ${collPath}`);

        const batch = writeBatch(db);

        ids.forEach((id) => {
          const docRef = doc(db, collPath, id);
          batch.delete(docRef);
        });

        await batch.commit();
        console.log(`Batch delete completed successfully`);

        // Invalidate cache
        ids.forEach((id) => {
          cache.current.invalidate(`${collPath}_${id}`);
        });
        cache.current.invalidatePattern(collPath);

        setLoading(false);
        return true;
      } catch (err) {
        handleError(err, "Delete Documents");
        setLoading(false);
        return false;
      }
    },
    [auth.currentUser, getUserCollectionPath]
  );

  /**
   * Subscribe to real-time updates
   */
  const subscribeToCollection = useCallback(
    (collectionName: string, options: SubscriptionOptions) => {
      if (!auth.currentUser) {
        const errorMsg = "No authenticated user. Please sign in first.";
        options.onError?.(errorMsg);
        console.error(errorMsg);
        return () => {};
      }

      try {
        const collPath = getUserCollectionPath(collectionName);
        const subscriptionKey = `${collPath}_${JSON.stringify(options)}`;

        // Check if already subscribed
        if (subscriptions.current.has(subscriptionKey)) {
          console.warn(`Already subscribed to ${subscriptionKey}`);
          return subscriptions.current.get(subscriptionKey)!;
        }

        console.log(`Subscribing to: ${collPath}`);
        const collectionRef = collection(db, collPath);
        const constraints: QueryConstraint[] = [];

        // Build query
        if (options.where) {
          options.where.forEach((w) => {
            constraints.push(where(w.field, w.operator, w.value));
          });
        }

        if (options.orderBy) {
          constraints.push(
            orderBy(options.orderBy, options.orderDirection || "asc")
          );
        }

        const limitCount = options.limit ? Math.min(options.limit, 1000) : 100;
        constraints.push(limit(limitCount));

        const q =
          constraints.length > 0
            ? query(collectionRef, ...constraints)
            : query(collectionRef, limit(100));

        // Throttle updates
        let lastUpdate = 0;
        const throttleMs = 1000;

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const now = Date.now();
            if (now - lastUpdate < throttleMs) {
              // Throttle: schedule update
              const existingTimer = throttleTimers.current.get(subscriptionKey);
              if (existingTimer) {
                clearTimeout(existingTimer);
              }

              const timer = setTimeout(() => {
                const documents = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                options.onUpdate(documents);
                lastUpdate = Date.now();
              }, throttleMs - (now - lastUpdate));

              throttleTimers.current.set(subscriptionKey, timer);
            } else {
              // Update immediately
              const documents = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              options.onUpdate(documents);
              lastUpdate = now;
            }
          },
          (err) => {
            const errorMsg = handleError(err, "Subscription");
            options.onError?.(errorMsg);
          }
        );

        subscriptions.current.set(subscriptionKey, unsubscribe);

        // Return unsubscribe function
        return () => {
          unsubscribe();
          subscriptions.current.delete(subscriptionKey);
          const timer = throttleTimers.current.get(subscriptionKey);
          if (timer) {
            clearTimeout(timer);
            throttleTimers.current.delete(subscriptionKey);
          }
        };
      } catch (err) {
        const errorMsg = handleError(err, "Subscribe");
        options.onError?.(errorMsg);
        return () => {};
      }
    },
    [auth.currentUser, getUserCollectionPath]
  );

  /**
   * Migrate/Update collection schema
   */
  const migrateCollection = useCallback(
    async (
      collectionName: string,
      migration: {
        addFields?: Record<string, any>;
        removeFields?: string[];
        transformData?: (doc: any) => any;
      }
    ) => {
      if (!auth.currentUser) {
        const errorMsg = "No authenticated user. Please sign in first.";
        setError(errorMsg);
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const collPath = getUserCollectionPath(collectionName);
        console.log(`Migrating collection: ${collPath}`);

        const collectionRef = collection(db, collPath);
        const snapshot = await getDocs(query(collectionRef, limit(100)));

        const batch = writeBatch(db);
        let batchCount = 0;

        for (const docSnap of snapshot.docs) {
          let data = docSnap.data();

          // Add new fields
          if (migration.addFields) {
            data = { ...data, ...migration.addFields };
          }

          // Remove fields
          if (migration.removeFields) {
            migration.removeFields.forEach((field) => {
              delete data[field];
            });
          }

          // Transform data
          if (migration.transformData) {
            data = migration.transformData(data);
          }

          // Update timestamp
          data.updatedAt = Timestamp.now();

          const docRef = doc(db, collPath, docSnap.id);
          batch.set(docRef, data, { merge: true });

          batchCount++;

          // Commit batch every 500 documents
          if (batchCount === 500) {
            await batch.commit();
            batchCount = 0;
          }
        }

        // Commit remaining documents
        if (batchCount > 0) {
          await batch.commit();
        }

        // Invalidate cache for this collection
        cache.current.invalidatePattern(collPath);

        setLoading(false);
        console.log(
          `Migration completed for '${collectionName}': ${snapshot.docs.length} documents updated`
        );
        return true;
      } catch (err) {
        handleError(err, "Migration");
        setLoading(false);
        return false;
      }
    },
    [auth.currentUser, getUserCollectionPath]
  );

  /**
   * Unsubscribe from all subscriptions
   */
  const unsubscribeAll = useCallback(() => {
    subscriptions.current.forEach((unsub) => unsub());
    subscriptions.current.clear();
    throttleTimers.current.forEach((timer) => clearTimeout(timer));
    throttleTimers.current.clear();
  }, []);

  /**
   * Clear all cache
   */
  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  /**
   * Get all registered collections
   */
  const getCollections = useCallback(() => {
    return Array.from(collections.current.values());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeAll();
    };
  }, [unsubscribeAll]);

  return {
    loading,
    error,
    createCollection,
    migrateCollection,
    addDocument,
    readDocById,
    readDocuments,
    updateDocument,
    deleteDocument,
    deleteDocumentsbyId,
    subscribeToCollection,
    unsubscribeAll,
    clearCache,
    getCollections,
    clearError: () => setError(null),
  };
}
