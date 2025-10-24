import { DataTable } from "@/components/CustomTable";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { getAuth } from "firebase/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { billingColumns } from "../Columns";

const BillingTable = () => {
  const [data, setData] = useState<any>([]);
  const { readDocuments, error } = useFirestoreCRUD();
  const [isLoading, setIsLoading] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const user = auth.currentUser;
        if (!user) return toast.error("Not authenticated.");

        const collections = await readDocuments("bills");
        setData(collections);
        toast.success(`Loaded ${collections.length} bills`);
      } catch (error) {
        toast.error("Error fetching bills");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return <DataTable columns={billingColumns} data={data} loading={isLoading} />;
};

export default BillingTable;
