import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@/components/CustomTable";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { toast } from "sonner";
import { inventoryColumns } from "../Columns";
import { getAuth } from "firebase/auth";
import { formatTimestampString, genCsvFileName } from "@/lib/utils";

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
      // Force fresh data (bypass cache)
      const collections = await readDocuments("inventory", { limit: 1000 });
      console.log("📦 Fetched products:", collections.map(p => ({ 
        name: p.name, 
        barcode: p.barcode,
        id: p.id 
      })));
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

  const csvData = data.map(
    ({ price, costPrice, quantity, sellingPrice, createdAt, updatedAt }) => ({
      Category: price,
      Quantity: quantity,
      CostPrice: costPrice,
      SellingPrice: sellingPrice,
      createdAt: formatTimestampString(createdAt),
      updatedAt: formatTimestampString(updatedAt),
    })
  );
const csvHeader = ['Category', 'Quantity', 'CostPrice', 'SellingPrice', 'createdAt', 'updatedAt'];

 

  return (
    <DataTable
      columns={inventoryColumns( setData)} // pass setData here
      data={data}
      loading={isLoading}
      csvData={csvData}
      csvHeader={csvHeader}
      csvFileName={genCsvFileName("Inventory_Data")}
    />
  );
};

export default InventoryTable;
