/**
 * IndexedDB caching utility for expense data
 * Reduces Firestore reads by caching data locally
 */

const DB_NAME = "ExpenseTrackingCache";
const DB_VERSION = 1;
const STORES = {
  EXPENSES: "expenses",
  CATEGORIES: "categories",
  STATS: "financeStats",
};

class ExpenseCache {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
          const expenseStore = db.createObjectStore(STORES.EXPENSES, {
            keyPath: "id",
          });
          expenseStore.createIndex("monthKey", "monthKey", { unique: false });
          expenseStore.createIndex("date", "date", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
          db.createObjectStore(STORES.CATEGORIES, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(STORES.STATS)) {
          db.createObjectStore(STORES.STATS, { keyPath: "monthKey" });
        }
      };
    });
  }

  /**
   * Get transaction helper
   */
  private getTransaction(
    storeName: string,
    mode: IDBTransactionMode = "readonly"
  ): IDBObjectStore | null {
    if (!this.db) return null;
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  /**
   * Cache expenses for a specific month
   */
  async cacheExpenses(monthKey: string, expenses: any[]): Promise<void> {
    const store = this.getTransaction(STORES.EXPENSES, "readwrite");
    if (!store) return;

    // Clear old expenses for this month
    const index = store.index("monthKey");
    const range = IDBKeyRange.only(monthKey);
    const cursorRequest = index.openCursor(range);

    cursorRequest.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Add new expenses
    expenses.forEach((expense) => {
      store.add({
        ...expense,
        cachedAt: Date.now(),
      });
    });
  }

  /**
   * Get cached expenses for a month
   */
  async getCachedExpenses(monthKey: string): Promise<any[] | null> {
    return new Promise((resolve) => {
      const store = this.getTransaction(STORES.EXPENSES);
      if (!store) {
        resolve(null);
        return;
      }

      const index = store.index("monthKey");
      const range = IDBKeyRange.only(monthKey);
      const request = index.getAll(range);

      request.onsuccess = () => {
        const expenses = request.result;
        if (expenses && expenses.length > 0) {
          // Check if cache is fresh (less than 5 minutes old)
          const cacheTimes = expenses
            .map((e) => e?.cachedAt)
            .filter((t) => t !== undefined && t !== null);
          
          if (cacheTimes.length === 0) {
            resolve(null);
            return;
          }

          const oldestCache = Math.min(...cacheTimes);
          const isFresh = Date.now() - oldestCache < 5 * 60 * 1000;

          resolve(isFresh ? expenses : null);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  }

  /**
   * Cache categories
   */
  async cacheCategories(categories: any[]): Promise<void> {
    const store = this.getTransaction(STORES.CATEGORIES, "readwrite");
    if (!store) return;

    // Clear old categories
    store.clear();

    // Add new categories
    categories.forEach((category) => {
      store.add({
        ...category,
        cachedAt: Date.now(),
      });
    });
  }

  /**
   * Get cached categories
   */
  async getCachedCategories(): Promise<any[] | null> {
    return new Promise((resolve) => {
      const store = this.getTransaction(STORES.CATEGORIES);
      if (!store) {
        resolve(null);
        return;
      }

      const request = store.getAll();

      request.onsuccess = () => {
        const categories = request.result;
        if (categories && categories.length > 0) {
          // Check if cache is fresh (less than 1 hour old)
          const cacheTimes = categories
            .map((c) => c?.cachedAt)
            .filter((t) => t !== undefined && t !== null);
          
          if (cacheTimes.length === 0) {
            resolve(null);
            return;
          }

          const oldestCache = Math.min(...cacheTimes);
          const isFresh = Date.now() - oldestCache < 60 * 60 * 1000;

          resolve(isFresh ? categories : null);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  }

  /**
   * Cache finance stats
   */
  async cacheFinanceStats(stats: any[]): Promise<void> {
    const store = this.getTransaction(STORES.STATS, "readwrite");
    if (!store) return;

    stats.forEach((stat) => {
      store.put({
        ...stat,
        cachedAt: Date.now(),
      });
    });
  }

  /**
   * Get cached finance stats
   */
  async getCachedFinanceStats(monthKeys: string[]): Promise<any[] | null> {
    return new Promise((resolve) => {
      const store = this.getTransaction(STORES.STATS);
      if (!store) {
        resolve(null);
        return;
      }

      const promises = monthKeys.map(
        (key) =>
          new Promise<any>((res) => {
            const request = store.get(key);
            request.onsuccess = () => res(request.result);
            request.onerror = () => res(null);
          })
      );

      Promise.all(promises).then((results) => {
        const stats = results.filter((r) => r !== null && r !== undefined);

        if (stats.length > 0) {
          // Check if cache is fresh (less than 5 minutes old)
          const cacheTimes = stats
            .map((s) => s?.cachedAt)
            .filter((t) => t !== undefined && t !== null);
          
          if (cacheTimes.length === 0) {
            resolve(null);
            return;
          }

          const oldestCache = Math.min(...cacheTimes);
          const isFresh = Date.now() - oldestCache < 5 * 60 * 1000;

          resolve(isFresh ? stats : null);
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Invalidate expense cache for a specific month
   */
  async invalidateExpenses(monthKey: string): Promise<void> {
    const store = this.getTransaction(STORES.EXPENSES, "readwrite");
    if (!store) return;

    const index = store.index("monthKey");
    const range = IDBKeyRange.only(monthKey);
    const cursorRequest = index.openCursor(range);

    cursorRequest.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  /**
   * Invalidate stats cache
   */
  async invalidateStats(monthKey: string): Promise<void> {
    const store = this.getTransaction(STORES.STATS, "readwrite");
    if (!store) return;

    store.delete(monthKey);
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(
      [STORES.EXPENSES, STORES.CATEGORIES, STORES.STATS],
      "readwrite"
    );

    transaction.objectStore(STORES.EXPENSES).clear();
    transaction.objectStore(STORES.CATEGORIES).clear();
    transaction.objectStore(STORES.STATS).clear();
  }
}

// Export singleton instance
export const expenseCache = new ExpenseCache();

// Initialize on import
expenseCache.init().catch((err) => {
  console.error("Failed to initialize expense cache:", err);
});
