import { DataTable } from "@/components/CustomTable";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { getAuth } from "firebase/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { billingColumns } from "../Columns";
import { genCsvFileName } from "@/lib/utils";
import BillViewModal from "./BillViewModal";

const BillingTable = () => {
  const [data, setData] = useState<any>([]);
  const { readDocuments } = useFirestoreCRUD();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const csvData = data.map((item: any) => ({ 
    invoiceId: item.invoiceId,  
    name: item.name,
    number: item.number,
    dateKey: item.dateKey,
    gstEnabled: item.gstEnabled ? "true" : "false",
    gstPercent: item.gstPercent,
    cgst: item.cgst,
    sgst: item.sgst,
    subtotal: item.subtotal,
    total: item.total,
    paymentMode: item.paymentMode, 
    note: item.note,
    createdAt: item.createdAt.toDate().toLocaleString(),
    updatedAt: item.updatedAt.toDate().toLocaleString(),
  }));
  const csvHeader = [ 
    "invoiceId", 
    "name",
    "number",
    "dateKey",
    "gstEnabled",
    "gstPercent",
    "cgst",
    "sgst",
    "subtotal",
    "total",
    "paymentMode", 
    "note",
    "createdAt",
    "updatedAt", 
  ];

  const handleRowClick = (row: any) => {
    setSelectedBill(row);
    setIsModalOpen(true);
  };

  return (
    <>
      <DataTable
        columns={billingColumns}
        data={data}
        loading={isLoading}
        csvData={csvData}
        csvHeader={csvHeader}
        csvFileName={genCsvFileName("bills_data")}
        onRowClick={handleRowClick}
      />
      <BillViewModal
        bill={selectedBill}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
};

export default BillingTable;
