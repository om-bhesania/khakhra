import { DataTable } from "@/components/CustomTable";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { formatTimestampString, genCsvFileName } from "@/lib/utils";
import { getAuth } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { customerColumns } from "../Columns";

function CustomerTable() {
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
      const collections = await readDocuments("customers");

      // Create a new array reference to trigger re-render
      setData([...collections]);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching customers");
    } finally {
      setIsLoading(false);
    }
  }, [auth.currentUser, readDocuments]);

  useEffect(() => {
    if (auth.currentUser) fetchData();
  }, [auth.currentUser, fetchData]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);
console.log("data", data);
  const csvData = data.map((item) => ({
    id: item.id,
    Name: item.name,
    Phone: item.number,
    "Payment Amount": item.paymentAmount,
    "Payment Mode": item.paymentMode, 
    createdAt: formatTimestampString(item.createdAt),
    updatedAt: formatTimestampString(item.updatedAt),
  }));

  const csvHeader = [
    "Name", 
    "Phone",
    "Address",
    "Payment Amount",
    "Payment Mode", 
    "createdAt",
    "updatedAt",
  ];

  return (
    <div>
      <DataTable
        columns={customerColumns(setData)} // pass setData here
        data={data}
        loading={isLoading}
        csvData={csvData}
        csvHeader={csvHeader}
        csvFileName={genCsvFileName("Customer_Data")}
      />
    </div>
  );
}

export default CustomerTable;
