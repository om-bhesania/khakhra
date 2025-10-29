import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@/components/CustomTable";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { toast } from "sonner";
import { employeesColumns } from "../Columns";
import { getAuth } from "firebase/auth";
import { genCsvFileName } from "@/lib/utils";

const EmployeesTable = () => {
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
      const collections = await readDocuments("employees");
      setData(collections);
    } catch (err) {
      console.error("❌ Error fetching employees:", err);
      toast.error("Error fetching employees: " + (err as Error).message);
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

  const csvData = data.map(({ name, phoneNumber, address, timings, dateOfJoining }) => ({
    Name: name,
    Phone: phoneNumber,
    Address: address,
    Timings: timings?.start && timings?.end ? `${timings.start}-${timings.end}` : "",
    DateOfJoining: dateOfJoining,
  }));
  const csvHeader = ["Name", "Phone", "Address", "Timings", "DateOfJoining"];

  return (
    <DataTable
      columns={employeesColumns(setData)}
      data={data}
      loading={isLoading}
      csvData={csvData}
      csvHeader={csvHeader}
      csvFileName={genCsvFileName("Employees_Data")}
    />
  );
};

export default EmployeesTable;


