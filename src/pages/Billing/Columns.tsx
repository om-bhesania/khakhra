import type { ColumnDef } from "@tanstack/react-table";
import { BillActions } from "./BillingActions";
import { formatCurrency } from "@/lib/utils";

export type Bill = {
  id?: string;
  invoiceId: string;
  name: string;
  number?: string;
  note?: string;
  subtotal?: number;
  total?: number;
  createdAt?: any;
  lineItems?: any[];
  paymentMode?: string;
};

interface BillingColumnOptions {
  onDeleted?: (billId: string) => void;
}

export const billingColumns = (
  options?: BillingColumnOptions
): ColumnDef<Bill, any>[] => [
  { accessorKey: "invoiceId", header: "Invoice ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "number", header: "Number" },
  {
    accessorKey: "subtotal",
    header: "Subtotal",
    cell: ({ row }) => {
      const subtotal = row.getValue("subtotal") as number;
      return <span>{subtotal ? formatCurrency(subtotal) : "₹0.00"}</span>;
    },
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => {
      const total = row.getValue("total") as number;
      return (
        <span className="font-semibold">
          {total ? formatCurrency(total) : "₹0.00"}
        </span>
      );
    },
  },
  {
    accessorKey: "paymentMode",
    header: "Payment Mode",
    cell: ({ row }) => {
      const paymentMode = row.getValue("paymentMode") as string;
      return <span>{paymentMode || "Cash"}</span>;
    },
  },
  {
    accessorKey: "note",
    header: "Note",
    cell: ({ row }) => {
      const note = row.getValue("note") as string;
      return (
        <span className="text-sm text-muted-foreground truncate max-w-[150px]">
          {note || "-"}
        </span>
      );
    },
  },
  { accessorKey: "createdAt", header: "Created At" },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <BillActions bill={row.original} onDeleted={options?.onDeleted} />
    ),
  },
];
