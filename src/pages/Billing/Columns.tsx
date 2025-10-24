import type { ColumnDef } from "@tanstack/react-table";
import { BillActions } from "./BillingActions";
 
export type Bill = {
  id?: string;
  invoiceId: string;
  name: string;
  number?: string;
  note?: string;
  gstEnabled?: boolean;
  sgst?: number;
  cgst?: number;
  createdAt?: any;
  lineItems?: any[];
  paymentMode?: string;
};

export const billingColumns: ColumnDef<Bill, any>[] = [
  { accessorKey: "invoiceId", header: "Invoice ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "number", header: "Number" },
  // {
  //   accessorKey: "lineItems",
  //   header: "Item",
  //   cell: ({ row }) => {
  //     const lineItems = row.getValue("lineItems") as any[];
  //     if (!lineItems?.length) return <div>-</div>;
  //     return (
  //       <div className="text-sm text-muted-foreground truncate max-w-[150px]">
  //         {lineItems.map((li) => li.itemName).join(", ")}
  //       </div>
  //     );
  //   },
  // },
  { accessorKey: "createdAt", header: "Created At" },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <BillActions bill={row.original} />,
  },
];
