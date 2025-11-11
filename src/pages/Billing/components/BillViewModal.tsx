import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, IndianRupee, Receipt, Printer } from "lucide-react";
import { useMemo } from "react";
import { generateBillHTML, printBill, type BillData } from "@/lib/billGenerator";
import { COMPANY_CONFIG } from "@/lib/utils";

interface BillViewModalProps {
  bill: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BillViewModal = ({ bill, open, onOpenChange }: BillViewModalProps) => {
  // Helper function to convert bill data to BillData format
  const transformBillToBillData = (bill: any): BillData | null => {
    if (!bill) return null;

    let dateString = "";
    if (bill.createdAt) {
      if (typeof bill.createdAt.toDate === "function") {
        dateString = bill.createdAt.toDate().toLocaleString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      } else if (bill.createdAt.seconds) {
        const date = new Date(bill.createdAt.seconds * 1000);
        dateString = date.toLocaleString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      } else {
        dateString = new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      }
    } else {
      dateString = new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }

    return {
      companyName: COMPANY_CONFIG.name,
      companyAddress: COMPANY_CONFIG.address,
      companyCity: COMPANY_CONFIG.city,
      companyPhone: COMPANY_CONFIG.phone,
      receiptNumber: bill?.invoiceId || bill?.id || "N/A",
      date: dateString,
      userName: bill?.name || "Guest",
      items: (bill?.lineItems || []).map((item: any) => ({
        itemName: item?.itemName || item?.name || "Unknown Item",
        quantity: Number(item?.quantity) || 0,
        rate: Number(item?.rate) || 0,
        discount: Number(item?.discount) || 0,
      })),
      cartDiscount: 0,
      cgst: bill?.gstEnabled ? (bill?.cgst || 0) : 0,
      sgst: bill?.gstEnabled ? (bill?.sgst || 0) : 0,
      subtotal: bill?.subtotal || 0,
      total: bill?.total || 0,
      paymentMode: bill?.paymentMode || "Cash",
    };
  };

  const billData = useMemo(() => transformBillToBillData(bill), [bill]);
  const billHtml = useMemo(() => {
    if (!billData) return "";
    return generateBillHTML(billData);
  }, [billData]);

  const handlePrint = () => {
    if (!billHtml) return;
    try {
      printBill(billHtml);
    } catch (error: any) {
      console.error("Failed to print bill:", error);
    }
  };

  const getDate = (timestamp: any) => {
    if (!timestamp) return new Date();
    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate();
    }
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    return new Date();
  };

  const formatDate = (timestamp: any) => {
    return getDate(timestamp).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: any) => {
    return getDate(timestamp).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!bill) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              Bill Details - {bill.invoiceId || bill.id}
            </DialogTitle>
            <Button onClick={handlePrint} className="gap-2 mr-12" disabled={!billHtml}>
              <Printer className="h-4 w-4" />
              Print Bill
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Invoice Header Card */}
          <div className="bg-primary text-primary-foreground rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-semibold mb-2">
                  {bill.invoiceId || bill.id}
                </h3>
                <div className="flex items-center gap-4 text-sm opacity-90">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(bill.createdAt)}
                  </span>
                  <span>{formatTime(bill.createdAt)}</span>
                </div>
                {bill.name && (
                  <div className="mt-2 text-sm opacity-90">
                    Customer: {bill.name}
                  </div>
                )}
                {bill.number && (
                  <div className="text-sm opacity-90">
                    📞 {bill.number}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90 mb-1">Total Amount</p>
                <p className="text-3xl font-bold">
                  ₹{bill.total?.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          {bill.lineItems && bill.lineItems.length > 0 && (
            <div className="bg-card rounded-lg border shadow-sm p-6">
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Items ({bill.lineItems.length})
              </h4>
              <div className="space-y-3">
                {bill.lineItems.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-4 bg-secondary rounded-md border"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-lg">
                        {item.itemName || item.name || "Unknown Item"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Quantity: {item.quantity} × ₹{item.rate?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-lg">
                        ₹{((item.quantity || 0) * (item.rate || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals Card */}
          <div className="bg-card rounded-lg border shadow-sm p-6">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <IndianRupee className="w-5 h-5" />
              Summary
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">Payment Mode:</span>
                <span className="font-semibold text-foreground">
                  {bill.paymentMode || "Cash"}
                </span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-semibold text-foreground">
                  ₹{bill.subtotal?.toFixed(2) || "0.00"}
                </span>
              </div>
              {bill.gstEnabled && (
                <>
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">
                      CGST ({bill.gstPercent ? bill.gstPercent / 2 : 0}%):
                    </span>
                    <span className="font-semibold text-foreground">
                      ₹{bill.cgst?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">
                      SGST ({bill.gstPercent ? bill.gstPercent / 2 : 0}%):
                    </span>
                    <span className="font-semibold text-foreground">
                      ₹{bill.sgst?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-primary">
                <span className="text-foreground">Total:</span>
                <span className="text-primary">
                  ₹{bill.total?.toFixed(2) || "0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Note */}
          {bill.note && (
            <div className="bg-muted rounded-lg border p-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Note:</span> {bill.note}
              </p>
            </div>
          )}

          {/* Print Preview */}
          {billHtml && (
            <div className="bg-card rounded-lg border shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Printer className="w-5 h-5" />
                  Print Preview
                </h4>
                <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 bg-muted/20 overflow-auto">
                <div className="flex justify-center">
                  <div
                    className="bill-preview-container"
                    style={{
                      width: "80mm",
                      minHeight: "400px",
                      transform: "scale(0.85)",
                      transformOrigin: "top center",
                    }}
                  >
                    <iframe
                      title="Bill Print Preview"
                      srcDoc={billHtml}
                      className="border-0 w-full"
                      style={{
                        minHeight: "500px",
                        width: "80mm",
                      }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                This is how your bill will look when printed
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillViewModal;

