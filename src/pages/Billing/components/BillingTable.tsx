import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/CustomTable";
import type { ColumnDef } from "@tanstack/react-table";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { toast } from "sonner";
import { getAuth } from "firebase/auth";
import { billingColumns } from "../Columns";

type Bill = {
  id?: string;
  invoiceId: string;
  name: string;
  number?: string;
  item: string;
  note?: string;
  gstEnabled?: boolean;
  sgst?: number;
  cgst?: number;
  createdAt?: any;
};

const BillingTable = () => {
  const [data, setData] = useState<any>([]);
  const { readDocuments, error } = useFirestoreCRUD();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const auth = getAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Check authentication
        const user = auth.currentUser;

        if (!user) {
          toast.error("Not authenticated. Please sign in.");
          setIsLoading(false);
          return;
        }

        const collections = await readDocuments("bills");

        if (collections.length === 0) {
          console.warn("⚠️ No documents found in Inventory collection");
          toast.warning("No Inventory found. Add some data first.");
        } else {
          console.log("✅ First document:", collections[0]);
          toast.success(`Loaded ${collections.length} Inventory`);
        }

        setData(collections);
      } catch (error) {
        console.error("❌ Error fetching Inventory:", error);
        toast.error("Error fetching Inventory: " + (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if user is authenticated
    if (auth.currentUser) {
      fetchData();
    } else {
      console.warn("⚠️ No authenticated user, waiting...");
      toast.error("Please sign in to view Inventory");
    }
  }, [auth.currentUser]);

  // Show hook error if any
  useEffect(() => {
    if (error) {
      console.error("Hook Error:", error);
      toast.error(error);
    }
  }, [error]);

  return <DataTable columns={billingColumns} data={data} loading={isLoading} />;
};

export default BillingTable;
