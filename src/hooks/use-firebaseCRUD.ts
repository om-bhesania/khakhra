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
} from "firebase/firestore";
import type { DocumentData, Unsubscribe } from "firebase/firestore";
import { db } from  "../config/firebase.config";

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
  fields: Record<string, any>; // Field definitions
  indexes?: string[]; // Fields to index
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

  clear() {
    this.cache.clear();
  }
}

/**
 * Simplified Firestore CRUD Hook
 * Usage: const { createCollection, addDocument, readDocument, ... } = useFirestoreCRUD()
 */
export function useFirestoreCRUD() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const collections = useRef<Map<string, CollectionSchema>>(new Map());
  const cache = useRef(new FirestoreCache());
  const subscriptions = useRef<Map<string, Unsubscribe>>(new Map());
  const throttleTimers = useRef<any>(new Map());

  const handleError = (err: unknown, operation: string) => {
    const errorMessage =
      err instanceof FirestoreError
        ? `${operation} failed: ${err.message}`
        : `${operation} failed: Unknown error`;
    setError(errorMessage);
    console.error(`Firestore ${operation} error:`, err);
    return errorMessage;
  };

  /**
   * Create/Register a collection schema
   * This doesn't create the collection in Firestore (collections are created when first document is added)
   * but registers it in your app for validation and type checking
   */
  const createCollection = useCallback((schema: CollectionSchema | string) => {
    const collectionSchema: CollectionSchema =
      typeof schema === "string" ? { name: schema, fields: {} } : schema;

    collections.current.set(collectionSchema.name, collectionSchema);
    console.log(`Collection '${collectionSchema.name}' registered`);

    return collectionSchema.name;
  }, []);

  /**
   * Migrate/Update collection schema
   * Updates existing documents to match new schema (adds missing fields with default values)
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
      setLoading(true);
      setError(null);

      try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(query(collectionRef, limit(100)));

        const updatePromises = snapshot.docs.map(async (docSnap) => {
          const docRef = doc(db, collectionName, docSnap.id);
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

          await setDoc(docRef, data, { merge: true });
        });

        await Promise.all(updatePromises);

        // Invalidate cache for this collection
        cache.current.invalidate(`${collectionName}_all`);

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
    []
  );

  /**
   * Add a document to a collection
   */
  const addDocument = useCallback(
    async <T extends DocumentData>(collectionName: string, data: T) => {
      setLoading(true);
      setError(null);

      try {
        const collectionRef = collection(db, collectionName);

        const documentData = {
          ...data,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collectionRef, documentData);

        const newDoc = {
          id: docRef.id,
          ...documentData,
        };

        // Update cache
        cache.current.set(`${collectionName}_${docRef.id}`, newDoc);
        cache.current.invalidate(`${collectionName}_all`);

        setLoading(false);
        return newDoc;
      } catch (err) {
        handleError(err, "Add Document");
        setLoading(false);
        return null;
      }
    },
    []
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
      const cacheKey = `${collectionName}_${id}`;

      // Check cache
      if (useCache) {
        const cached = cache.current.get(cacheKey);
        if (cached) return cached as DocumentWithId<T>;
      }

      setLoading(true);
      setError(null);

      try {
        const docRef = doc(db, collectionName, id);
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
    []
  );

  /**
   * Read all documents from a collection or with query
   */
  const readDocuments = useCallback(
    async <T extends DocumentData>(
      collectionName: string,
      options?: QueryOptions
    ): Promise<Array<DocumentWithId<T>>> => {
      const cacheKey = `${collectionName}_all_${JSON.stringify(options || {})}`;

      // Check cache
      if (!options?.where && !options?.orderBy) {
        const cached = cache.current.get(cacheKey);
        if (cached) return cached as Array<DocumentWithId<T>>;
      }

      setLoading(true);
      setError(null);

      try {
        const collectionRef = collection(db, collectionName);
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

        // Limit to 100 by default
        const limitCount = Math.min(options?.limit || 100, 100);
        constraints.push(limit(limitCount));

        const q =
          constraints.length > 0
            ? query(collectionRef, ...constraints)
            : query(collectionRef, limit(100));
        const snapshot = await getDocs(q);

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
    []
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
      setLoading(true);
      setError(null);

      try {
        const docRef = doc(db, collectionName, id);

        const updateData = {
          ...data,
          updatedAt: Timestamp.now(),
        };

        await updateDoc(docRef, updateData);

        // Invalidate cache
        cache.current.invalidate(`${collectionName}_${id}`);
        cache.current.invalidate(`${collectionName}_all`);

        setLoading(false);
        return true;
      } catch (err) {
        handleError(err, "Update Document");
        setLoading(false);
        return false;
      }
    },
    []
  );

  /**
   * Delete a document
   */
  const deleteDocument = useCallback(
    async (collectionName: string, id: string) => {
      setLoading(true);
      setError(null);

      try {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);

        // Invalidate cache
        cache.current.invalidate(`${collectionName}_${id}`);
        cache.current.invalidate(`${collectionName}_all`);

        setLoading(false);
        return true;
      } catch (err) {
        handleError(err, "Delete Document");
        setLoading(false);
        return false;
      }
    },
    []
  );

  /**
   * Subscribe to real-time updates
   */
  const subscribeToCollection = useCallback(
    (collectionName: string, options: SubscriptionOptions) => {
      const subscriptionKey = `${collectionName}_${JSON.stringify(options)}`;

      // Check if already subscribed
      if (subscriptions.current.has(subscriptionKey)) {
        console.warn(`Already subscribed to ${subscriptionKey}`);
        return () => {};
      }

      const collectionRef = collection(db, collectionName);
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

      const limitCount = Math.min(options.limit || 100, 100);
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
            if (throttleTimers.current.has(subscriptionKey)) {
              clearTimeout(throttleTimers.current.get(subscriptionKey)!);
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
        if (throttleTimers.current.has(subscriptionKey)) {
          clearTimeout(throttleTimers.current.get(subscriptionKey)!);
          throttleTimers.current.delete(subscriptionKey);
        }
      };
    },
    []
  );

  /**
   * Unsubscribe from all subscriptions
   */
  const unsubscribeAll = useCallback(() => {
    subscriptions.current.forEach((unsub) => unsub());
    subscriptions.current.clear();
    throttleTimers.current.forEach((timer:any) => clearTimeout(timer));
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
    subscribeToCollection,
    unsubscribeAll,
    clearCache,
    getCollections,
    clearError: () => setError(null),
  };
}

// Example Usage:
/*
interface User {
  name: string;
  email: string;
  age: number;
  role: 'admin' | 'user';
}

function App() {
  const {
    loading,
    error,
    createCollection,
    addDocument,
    readDocById,
    readDocuments,
    updateDocument,
    deleteDocument,
    subscribeToCollection,
    migrateCollection,
  } = useFirestoreCRUD();

  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Create/Register collection
    createCollection('users');
    
    // Or with schema
    createCollection({
      name: 'users',
      fields: {
        name: 'string',
        email: 'string',
        age: 'number',
        role: 'string',
      },
    });
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToCollection('users', {
      onUpdate: (data) => setUsers(data as User[]),
      onError: (err) => console.error(err),
      where: [{ field: 'role', operator: '==', value: 'admin' }],
      orderBy: 'name',
      limit: 50,
    });

    return () => unsubscribe();
  }, []);

  const handleAddUser = async () => {
    const newUser = await addDocument<User>('users', {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      role: 'user',
    });
    console.log('Created:', newUser);
  };

  const handleReadUser = async (id: string) => {
    const user = await readDocById<User>('users', id);
    console.log('User:', user);
  };

  const handleReadAllUsers = async () => {
    const allUsers = await readDocuments<User>('users', {
      where: [{ field: 'age', operator: '>', value: 25 }],
      orderBy: 'name',
      limit: 10,
    });
    console.log('All users:', allUsers);
  };

  const handleUpdateUser = async (id: string) => {
    await updateDocument<User>('users', id, { age: 31 });
  };

  const handleDeleteUser = async (id: string) => {
    await deleteDocument('users', id);
  };

  const handleMigration = async () => {
    await migrateCollection('users', {
      addFields: { status: 'active', lastLogin: null },
      removeFields: ['oldField'],
      transformData: (doc) => ({
        ...doc,
        email: doc.email.toLowerCase(),
      }),
    });
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      <button onClick={handleAddUser}>Add User</button>
      <button onClick={handleMigration}>Migrate Collection</button>
      {users.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
*/
