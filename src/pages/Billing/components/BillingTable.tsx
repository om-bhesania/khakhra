import { DataTable } from "@/components/CustomTable";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { billingColumns } from "../Columns";
import { genCsvFileName } from "@/lib/utils";
import BillViewModal from "./BillViewModal";

const BillingTable = () => {
  const [data, setData] = useState<any[]>([]);
  const { subscribeToCollection } = useFirestoreCRUD();
  const [isLoading, setIsLoading] = useState(true);
  // @ts-ignore
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDeleteFromUI = useCallback((billId: string) => {
    setData((prev) => prev.filter((bill) => bill.id !== billId));
  }, []);

  const columns = useMemo(
    () => billingColumns({ onDeleted: handleDeleteFromUI }),
    [handleDeleteFromUI]
  );

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToCollection("bills", {
      limit: 1000,
      orderBy: "createdAt",
      orderDirection: "desc",
      onUpdate: (docs) => {
        setData(docs || []);
        setIsLoading(false);
        setSubscriptionError(null);
      },
      onError: (errMsg) => {
        setSubscriptionError(errMsg);
        setIsLoading(false);
        toast.error(errMsg || "Error fetching bills");
      },
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [subscribeToCollection]);
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
        columns={columns}
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
