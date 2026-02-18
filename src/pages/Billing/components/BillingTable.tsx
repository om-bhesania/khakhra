import { DataTable } from "@/components/CustomTable";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { billingColumns } from "../Columns";
import { genCsvFileName } from "@/lib/utils";
import BillViewModal from "./BillViewModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DateFilterMode = "single" | "range";

const BillingTable = () => {
  const [data, setData] = useState<any[]>([]);
  const { subscribeToCollection } = useFirestoreCRUD();
  const [isLoading, setIsLoading] = useState(true);
  // @ts-ignore
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Date filter mode and values
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("single");
  const [singleDate, setSingleDate] = useState("");
  const [dateRange, setDateRange] = useState("");

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

  // Parse date range string (format: "YYYY-MM-DD to YYYY-MM-DD")
  const parseDateRange = (rangeStr: string): { from: string; to: string } | null => {
    if (!rangeStr || !rangeStr.includes(" to ")) {
      return null;
    }
    const [from, to] = rangeStr.split(" to ");
    if (!from || !to) {
      return null;
    }
    return { from: from.trim(), to: to.trim() };
  };

  // Filter data by date
  const filteredData = useMemo(() => {
    if (dateFilterMode === "single" && !singleDate) {
      return data;
    }
    if (dateFilterMode === "range" && !dateRange) {
      return data;
    }

    return data.filter((bill) => {
      const billDate = bill.createdAt?.toDate ? bill.createdAt.toDate() : new Date(bill.createdAt);
      const billDateStr = billDate.toISOString().split("T")[0];

      if (dateFilterMode === "single") {
        return billDateStr === singleDate;
      } else {
        const range = parseDateRange(dateRange);
        if (!range) return true;
        
        return billDateStr >= range.from && billDateStr <= range.to;
      }
    });
  }, [data, dateFilterMode, singleDate, dateRange]);

  const csvData = filteredData.map((item: any) => ({
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

  const handleClearDateFilters = () => {
    setSingleDate("");
    setDateRange("");
  };

  const hasDateFilters = singleDate || dateRange;

  // Quick date range presets
  const setQuickDateRange = (days: number) => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - days);
    
    const fromDate = past.toISOString().split("T")[0];
    const toDate = today.toISOString().split("T")[0];
    
    setDateRange(`${fromDate} to ${toDate}`);
  };

  return (
    <div className="space-y-4">
      {/* Date Filter Section */}
      <div className="flex flex-col gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Calendar className="h-4 w-4" />
          <span>Filter by Date</span>
        </div>

        {/* Filter Mode Selector */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-gray-600 dark:text-gray-400">
              Filter Type
            </Label>
            <Select
              value={dateFilterMode}
              onValueChange={(value: DateFilterMode) => {
                setDateFilterMode(value);
                setSingleDate("");
                setDateRange("");
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Date</SelectItem>
                <SelectItem value="range">Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Single Date Input */}
          {dateFilterMode === "single" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="singleDate" className="text-xs text-gray-600 dark:text-gray-400">
                Select Date
              </Label>
              <Input
                id="singleDate"
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
          )}

          {/* Date Range Input */}
          {dateFilterMode === "range" && (
            <>
              <div className="flex flex-col gap-1.5 flex-1 min-w-[250px]">
                <Label htmlFor="dateRange" className="text-xs text-gray-600 dark:text-gray-400">
                  Date Range (YYYY-MM-DD to YYYY-MM-DD)
                </Label>
                <Input
                  id="dateRange"
                  type="text"
                  placeholder="2024-01-01 to 2024-01-31"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              
              {/* Quick Range Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDateRange(7)}
                  className="h-9 text-xs"
                >
                  Last 7 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDateRange(30)}
                  className="h-9 text-xs"
                >
                  Last 30 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDateRange(90)}
                  className="h-9 text-xs"
                >
                  Last 90 Days
                </Button>
              </div>
            </>
          )}

          {hasDateFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearDateFilters}
              className="h-9"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Results Counter */}
        {hasDateFilters && (
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-300 dark:bg-gray-700" />
            <span>
              Showing <span className="font-semibold text-blue-600 dark:text-blue-400">{filteredData.length}</span> of {data.length} bills
            </span>
            <div className="h-px flex-1 bg-gray-300 dark:bg-gray-700" />
          </div>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
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
    </div>
  );
};

export default BillingTable;
