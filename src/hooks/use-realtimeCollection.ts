import { useEffect, useState } from "react";
import { useFirestoreCRUD } from "./use-firebaseCRUD";

export function useRealtimeCollection<T>(moduleName: string) {
  const {
    subscribeToCollection,
    loading: moduleLoading,
    error,
  } = useFirestoreCRUD();
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = subscribeToCollection(moduleName, {
      onUpdate: (updatedDocs) => {
        setData(updatedDocs);
      },
      onError: (err) => {
        console.error(`Subscription error for ${moduleName}:`, err);
      },
      orderBy: "createdAt",
      orderDirection: "desc",
    });

    // Cleanup when component unmounts
    return () => {
      unsubscribe?.();
    };
  }, [moduleName, subscribeToCollection]);

  return { data, moduleLoading, error };
}
