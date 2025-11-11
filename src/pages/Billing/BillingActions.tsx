import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { Pencil, Trash2, Printer } from "lucide-react";
import { useState, useMemo } from "react";
import Swal from "sweetalert2";
import { generateBillHTML, printBill, type BillData } from "@/lib/billGenerator";
import { COMPANY_CONFIG } from "@/lib/utils";

// Helper function to convert bill data to BillData format
const transformBillToBillData = (bill: any): BillData => {
  // Handle date conversion from Firestore timestamp
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
    receiptNumber: bill.invoiceId || bill.id || "N/A",
    date: dateString,
    userName: bill.name || "Guest",
    items: (bill.lineItems || []).map((item: any) => ({
      itemName: item.itemName || item.name || "Unknown Item",
      quantity: Number(item.quantity) || 0,
      rate: Number(item.rate) || 0,
      discount: Number(item.discount) || 0,
    })),
    cartDiscount: 0,
    cgst: bill.gstEnabled ? (bill.cgst || 0) : 0,
    sgst: bill.gstEnabled ? (bill.sgst || 0) : 0,
    subtotal: bill.subtotal || 0,
    total: bill.total || 0,
    paymentMode: bill.paymentMode || "Cash",
  };
};

export const BillActions = ({ bill }: { bill: any }) => {
  const { deleteDocument, updateDocument, refreshData } = useFirestoreCRUD();
  const [open, setOpen] = useState(false);
  const [edited, setEdited] = useState({
    name: bill.name || "",
    number: bill.number || "",
    note: bill.note || "",
  });
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the bill.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (confirm.isConfirmed) {
      try {
        setLoading(true);
        await deleteDocument("bills", bill.id);
        await refreshData("bills");
        Swal.fire("Deleted!", "Bill has been deleted.", "success");
      } catch (error: any) {
        Swal.fire("Error", error.message || "Failed to delete bill", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditSave = async () => {
    try {
      setLoading(true);
      await updateDocument("bills", bill.id!, edited);
      Swal.fire("Updated!", "Bill details updated successfully.", "success");
      setOpen(false);
    } catch (err: any) {
      Swal.fire("Error", err.message || "Failed to update bill", "error");
    } finally {
      setLoading(false);
    }
  };

  const billData = useMemo(() => transformBillToBillData(bill), [bill]);
  const billHtml = useMemo(() => generateBillHTML(billData), [billData]);

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    try {
      printBill(billHtml);
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to print bill", "error");
    }
  };

  // const handlePrint = () => {
  //   try {
  //     // Format the bill data - adjust these fields based on your actual bill structure
  //     const billData = {
  //       companyName: COMPANY_CONFIG.name,
  //       companyAddress: COMPANY_CONFIG.address,
  //       companyCity: COMPANY_CONFIG.city,
  //       companyPhone: COMPANY_CONFIG.phone,
  //       receiptNumber: bill.finalId,
  //       date: new Date().toLocaleString("en-IN", {
  //         day: "2-digit",
  //         month: "2-digit",
  //         year: "numeric",
  //         hour: "2-digit",
  //         minute: "2-digit",
  //         second: "2-digit",
  //       }),
  //       userName: bill.customerName || "Guest",
  //       items: bill.lineItems.map((item: any) => ({
  //           itemName: item.name,
  //           quantity: item.quantity,
  //           rate: item.rate,
  //           discount: 0,
  //         })
  //       ),
  //       cartDiscount: 0,
  //       cgst: bill.gstEnabled ? bill.cgst : 0,
  //       sgst: bill.gstEnabled ? bill.sgst : 0,
  //       subtotal: bill.subtotal,
  //       total: bill.total,
  //       paymentMode: bill.paymentMode || "Cash",
  //     };

  //     const htmlContent = generateBillHTML(billData);
  //     printBill(htmlContent);
  //   } catch (error: any) {
  //     Swal.fire("Error", error.message || "Failed to print bill", "error");
  //   }
  // };

  // const handleDownload = () => {
  //   try {
  //     const billData = {
  //       receiptNumber: bill.number || bill.receiptNumber || "N/A",
  //       date: bill.date || new Date().toLocaleString(),
  //       userName: bill.name || bill.userName || "John Doe",
  //       items: bill.items || [
  //         {
  //           name: "Sample Item",
  //           quantity: 1,
  //           price: 100,
  //           discount: 0,
  //         },
  //       ],
  //       cartDiscount: bill.cartDiscount || 0,
  //       taxRate: bill.taxRate || 9.0,
  //     };

  //     const htmlContent = generateBillHTML(billData);
  //     const fileName = `Receipt_${bill.number || bill.id}.pdf`;
  //     downloadBillAsPDF(htmlContent, fileName);

  //     Swal.fire({
  //       icon: "success",
  //       title: "Print Dialog Opened",
  //       text: "Use your browser's print dialog to save as PDF",
  //       timer: 2000,
  //       showConfirmButton: false,
  //     });
  //   } catch (error: any) {
  //     Swal.fire("Error", error.message || "Failed to download bill", "error");
  //   }
  // };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click when clicking action buttons
  };

  return (
    <div className="flex items-center justify-center gap-2" onClick={handleActionClick}>
      {/* 🖨️ Print */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => handlePrint(e)}
        disabled={loading}
        title="Print Bill"
      >
        <Printer className="h-4 w-4" />
      </Button>

      {/* ✏️ Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            title="Edit Bill"
            onClick={handleActionClick}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={edited.name}
                onChange={(e) =>
                  setEdited((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Number</label>
              <Input
                value={edited.number}
                onChange={(e) =>
                  setEdited((p) => ({ ...p, number: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Note</label>
              <Input
                value={edited.note}
                onChange={(e) =>
                  setEdited((p) => ({ ...p, note: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSave} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🗑️ Delete */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          handleActionClick(e);
          handleDelete();
        }}
        disabled={loading}
        title="Delete Bill"
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
};
