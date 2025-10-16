import type { ColumnDef } from "@tanstack/react-table";

export type Bill = {
  id?: string;
  invoiceId: string;
  name: string;
  number?: string;
  item: string;
  note?: string;
  gstEnabled?: boolean;
  sgst?: number;
  cgst?: number;
  createdAt?: any;
};

export const billingColumns: ColumnDef<Bill, any>[] = [
  { accessorKey: "invoiceId", header: "Invoice ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "number", header: "Number" },
  {
    accessorKey: "lineItems",
    header: "Item",
    cell: ({ row }) => {
      const lineItems = row.getValue("lineItems") as
        | { rate?: number }[]
        | undefined;
      const rate = lineItems?.[0]?.rate || 0;
      return <div className="lowercase">{rate}</div>;
    },
  },
  { accessorKey: "createdAt", header: "Created At" },
];
