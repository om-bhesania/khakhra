import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@/components/CustomTable";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { toast } from "sonner";
import { inventoryColumns } from "../Columns";
import { getAuth } from "firebase/auth";

const InventoryTable = () => {
  const [data, setData] = useState<any[]>([]);
  const { readDocuments, error } = useFirestoreCRUD();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const auth = getAuth();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("Not authenticated. Please sign in.");
        return;
      }
      const collections = await readDocuments("inventory");
      setData(collections);
    } catch (err) {
      console.error("❌ Error fetching Inventory:", err);
      toast.error("Error fetching Inventory: " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [auth.currentUser, readDocuments]);

  useEffect(() => {
    if (auth.currentUser) fetchData();
  }, [auth.currentUser, fetchData]);

  // Show hook error if any
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
    <DataTable
      columns={inventoryColumns(fetchData, setData)} // pass setData here
      data={data}
      loading={isLoading}
    />
  );
};

export default InventoryTable;
