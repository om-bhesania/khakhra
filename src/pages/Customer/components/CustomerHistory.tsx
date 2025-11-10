import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import {
  Calendar,
  FileText,
  Filter,
  IndianRupee,
  Receipt,
  Package
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

interface HistoryProps {
  id: string;
}

interface Bill {
  id: string;
  invoiceId: string;
  total: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  gstEnabled: boolean;
  gstPercent: number;
  lineItems: Array<{
    itemName: string;
    itemId: string;
    quantity: number;
    rate: number;
    paymentMode: string;
  }>;
  paymentMode: string;

  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  exisitingCustomerData: {
    id: string;
    name: string;
    phone: string;
  };
  note?: string;
}

interface Customer {
  id: string;
  name: string;
  number: string;
  manuallyAddedPackets?: number;
}

function CustomerHistory({ id }: HistoryProps) {
  const { readDocuments, readDocById, loading } = useFirestoreCRUD();
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [dateFilter, setDateFilter] = useState<
    "all" | "7days" | "30days" | "90days"
  >("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const { id: idFromParam } = useParams();
  const customerId = idFromParam || id;

  const getBillHistory = async () => {
    const res: any = await readDocuments("bills");
    const customerBills = res.filter(
      (bill: Bill) => bill.exisitingCustomerData?.id === customerId
    );
    setAllBills(customerBills);
  };

  const getCustomerData = async () => {
    if (customerId) {
      try {
        const customerData = await readDocById<Customer>("customers", customerId);
        if (customerData) {
          setCustomer(customerData);
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }
    }
  };

  useEffect(() => {
    getBillHistory();
    getCustomerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const getDate = (timestamp: { seconds: number }) => {
    return new Date(timestamp.seconds * 1000);
  };

  const filteredBills = useMemo(() => {
    let bills = [...allBills];

    if (dateFilter !== "all") {
      const now = new Date();
      const daysAgo =
        dateFilter === "7days" ? 7 : dateFilter === "30days" ? 30 : 90;
      const cutoffDate = new Date(now.setDate(now.getDate() - daysAgo));

      bills = bills.filter((bill) => getDate(bill.createdAt) >= cutoffDate);
    }

    bills.sort((a, b) => {
      const dateA = getDate(a.createdAt).getTime();
      const dateB = getDate(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    return bills;
  }, [allBills, dateFilter, sortOrder]);

  const summary = useMemo(() => {
    const totalAmount = filteredBills.reduce(
      (sum, bill) => sum + bill.total,
      0
    );
    const totalInvoices = filteredBills.length;
    const itemsFromBills = filteredBills.reduce(
      (sum, bill) =>
        sum +
        bill.lineItems.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
    const manuallyAddedPackets = customer?.manuallyAddedPackets || 0;
    const totalItems = itemsFromBills + manuallyAddedPackets;

    return { totalAmount, totalInvoices, totalItems, manuallyAddedPackets, itemsFromBills };
  }, [filteredBills, customer]);

  const formatDate = (timestamp: { seconds: number }) => {
    return getDate(timestamp).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: { seconds: number }) => {
    return getDate(timestamp).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading billing history...</p>
        </div>
      </div>
    );
  }

  const customerInfo = allBills[0]?.exisitingCustomerData || customer;

  return (
    <div className="max-w-7xl mx-auto p-6 bg-background min-h-screen">
      {/* Customer Header */}
      {customerInfo && (
        <div className="bg-card rounded-lg border shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {customerInfo.name || (customerInfo as any).name}
          </h1>
          <p className="text-muted-foreground">
            📞 {customerInfo.phone || (customerInfo as any).number}
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-lg border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-foreground">
                ₹{summary.totalAmount.toFixed(2)}
              </p>
            </div>
            <IndianRupee className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Total Invoices
              </p>
              <p className="text-2xl font-bold text-foreground">
                {summary.totalInvoices}
              </p>
            </div>
            <Receipt className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Items</p>
              <p className="text-2xl font-bold text-foreground">
                {summary.totalItems}
              </p>
              {summary.manuallyAddedPackets > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  ({summary.itemsFromBills} from bills + {summary.manuallyAddedPackets} manually added)
                </p>
              )}
            </div>
            <FileText className="w-10 h-10 text-primary" />
          </div>
        </div>
      </div>

      {/* Manually Added Packets Section */}
      {summary.manuallyAddedPackets > 0 && (
        <div className="bg-card rounded-lg border shadow-sm p-6 mb-6 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
              <Package className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Manually Added Packets
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                <span className="font-semibold text-foreground">
                  {summary.manuallyAddedPackets} packets
                </span>{" "}
                were added manually for backfilling previous data. These packets
                are not associated with any bill.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded text-amber-700 dark:text-amber-300">
                  <FileText className="w-4 h-4" />
                  No bill associated
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-lg border shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Filters:
            </span>
          </div>

          <div className="flex gap-2">
            {[
              { value: "all", label: "All Time" },
              { value: "7days", label: "Last 7 Days" },
              { value: "30days", label: "Last 30 Days" },
              { value: "90days", label: "Last 90 Days" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setDateFilter(value as typeof dateFilter)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateFilter === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex gap-2">
            {[
              { value: "newest", label: "Newest First" },
              { value: "oldest", label: "Oldest First" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSortOrder(value as typeof sortOrder)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  sortOrder === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bills List */}
      {filteredBills.length === 0 && summary.manuallyAddedPackets === 0 ? (
        <div className="bg-card rounded-lg border shadow-sm p-12 text-center">
          <Receipt className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No History Yet
          </h3>
          <p className="text-muted-foreground">
            {allBills.length === 0
              ? "This customer doesn't have any invoices yet."
              : "No invoices found for the selected date range."}
          </p>
        </div>
      ) : filteredBills.length === 0 && summary.manuallyAddedPackets > 0 ? (
        <div className="bg-card rounded-lg border shadow-sm p-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No Bills Yet
          </h3>
          <p className="text-muted-foreground">
            This customer has {summary.manuallyAddedPackets} manually added packet(s) but no invoices yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBills.map((bill) => (
            <div
              key={bill.id}
              className="bg-card rounded-lg border shadow-sm overflow-hidden"
            >
              {/* Invoice Header */}
              <div className="bg-primary text-primary-foreground p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      {bill.invoiceId}
                    </h3>
                    <div className="flex items-center gap-3 text-sm opacity-90">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(bill.createdAt)}
                      </span>
                      <span>{formatTime(bill.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-90">Total Amount</p>
                    <p className="text-2xl font-bold">
                      ₹{bill.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Items:
                </h4>
                <div className="space-y-2">
                  {bill.lineItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 bg-secondary rounded-md"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          Category: {item.rate}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity} × ₹{item.rate}
                        </p>
                      </div>

                      <p className="font-semibold text-foreground">
                        ₹{(item.quantity * item.rate).toFixed(2)}
                      </p>
                      {/* <div className="flex items-center justify-end flex-col">
                        <p className="font-semibold text-gray-500">
                          Payment Mode:{" "}
                          <span className="font-normal text-white">
                            {bill.paymentMode}
                          </span>
                        </p>
                        <p className="font-semibold text-gray-500">
                          Total Amount:{" "}
                          <span className="font-normal text-white">
                            ₹{(item.quantity * item.rate).toFixed(2)}
                          </span>
                        </p>
                      </div> */}
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Mode:</span>
                    <span className="font-medium text-foreground">
                      {bill.paymentMode}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium text-foreground">
                      ₹{bill.subtotal.toFixed(2)}
                    </span>
                  </div>
                  {bill.gstEnabled && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          CGST ({bill.gstPercent / 2}%):
                        </span>
                        <span className="font-medium text-foreground">
                          ₹{bill.cgst.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          SGST ({bill.gstPercent / 2}%):
                        </span>
                        <span className="font-medium text-foreground">
                          ₹{bill.sgst.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-base font-bold pt-2 border-t">
                    <span className="text-foreground">Total:</span>
                    <span className="text-primary">
                      ₹{bill.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {bill.note && (
                  <div className="mt-4 p-3 bg-muted rounded-md border">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">Note:</span> {bill.note}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomerHistory;
