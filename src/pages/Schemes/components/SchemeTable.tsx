import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@/components/CustomTable";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { toast } from "sonner";
import { schemeColumns } from "../Columns";
import { getAuth } from "firebase/auth";
import { genCsvFileName } from "@/lib/utils";

const SchemeTable = () => {
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
      
      const schemes = await readDocuments("schemes");
      
      // Filter to show only active schemes (not expired)
      const now = new Date();
      const activeSchemes = schemes.filter((scheme: any) => {
        const endDate = scheme.endDate?.toDate ? scheme.endDate.toDate() : new Date(scheme.endDate);
        return endDate >= now;
      });
      
      setData(activeSchemes);
    } catch (err) {
      console.error("❌ Error fetching Schemes:", err);
      toast.error("Error fetching Schemes: " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [auth.currentUser, readDocuments]);

  useEffect(() => {
    if (auth.currentUser) fetchData();
  }, [auth.currentUser, fetchData]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const csvData = data.map(({ name, startDate, endDate, products }) => ({
    Name: name,
    StartDate: startDate?.toDate ? startDate.toDate().toLocaleDateString("en-IN") : "",
    EndDate: endDate?.toDate ? endDate.toDate().toLocaleDateString("en-IN") : "",
    ProductCount: products?.length || 0,
  }));
  
  const csvHeader = ['Name', 'StartDate', 'EndDate', 'ProductCount'];

  return (
    <DataTable
      columns={schemeColumns(setData)}
      data={data}
      loading={isLoading}
      csvData={csvData}
      csvHeader={csvHeader}
      csvFileName={genCsvFileName("Schemes_Data")}
    />
  );
};

export default SchemeTable;
