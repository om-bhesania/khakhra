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
      
      // Fetch all bills to calculate total packets for each customer
      const allBills = await readDocuments("bills");
      
      // Create a map of customerId -> total bill packets
      const billPacketsMap = new Map<string, number>();
      allBills.forEach((bill: any) => {
        if (bill.customerId && bill.lineItems && Array.isArray(bill.lineItems)) {
          const billPackets = bill.lineItems.reduce(
            (sum: number, item: any) => sum + (Number(item.quantity) || 0),
            0
          );
          const currentTotal = billPacketsMap.get(bill.customerId) || 0;
          billPacketsMap.set(bill.customerId, currentTotal + billPackets);
        }
      });
      
      // Enrich customer data with total packets (manual + bill)
      const enrichedData = collections.map((customer: any) => {
        const manualPackets = customer.manuallyAddedPackets 
          ? Number(customer.manuallyAddedPackets) 
          : 0;
        const billPackets = billPacketsMap.get(customer.id) || 0;
        const totalPackets = manualPackets + billPackets;
        
        return {
          ...customer,
          totalPackets,
          manualPackets,
          billPackets,
        };
      });

      // Create a new array reference to trigger re-render
      setData([...enrichedData]);
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
  const csvData = data.map((item) => ({
    id: item.id,
    Name: item.name,
    Phone: item.number,
    "Total Packets": item.totalPackets ?? 0,
    "Manual Packets": item.manualPackets ?? 0,
    "Bill Packets": item.billPackets ?? 0,
    "Payment Amount": item.paymentAmount,
    "Payment Mode": item.paymentMode, 
    createdAt: formatTimestampString(item.createdAt),
    updatedAt: formatTimestampString(item.updatedAt),
  }));

  const csvHeader = [
    "Name", 
    "Phone",
    "Total Packets",
    "Manual Packets",
    "Bill Packets",
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
