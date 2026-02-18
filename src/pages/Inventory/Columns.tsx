// Columns.ts
import { GenericActions } from "@/components/CRUD/GenericEditDelete";
import { BarcodeDisplay } from "@/components/BarcodeDisplay";
import type { ColumnDef } from "@tanstack/react-table";

// Columns.ts
export const inventoryColumns = (
  setData: React.Dispatch<React.SetStateAction<any[]>>
): ColumnDef<any>[] => [
  { accessorKey: "name", header: "Product Name" },
  { accessorKey: "price", header: "Category (₹)" },
  { accessorKey: "quantity", header: "Quantity" },
  { accessorKey: "costPrice", header: "Cost Price (₹)" },
  { accessorKey: "sellingPrice", header: "Selling Price (₹)" },
  {
    id: "barcode",
    header: "Barcode",
    cell: ({ row }) => (
      <BarcodeDisplay
        productId={row.original.id}
        productName={row.original.name || row.original.category || row.original.id}
        barcode={row.original.barcode}
        product={row.original}
      />
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <GenericActions
        collection="inventory"
        record={row.original}
        editableFields={["name","price", "quantity", "costPrice", "sellingPrice"]}
        labelMap={{
          name:"Name",
          price: "Category",
          quantity: "Quantity",
          costPrice: "Cost Price",
          sellingPrice: "Selling Price",
        }}
        onAfterDelete={() =>
          setData((prev) => prev.filter((i) => i.id !== row.original.id))
        }
        onAfterUpdate={(updated) =>
          setData((prev) =>
            prev.map((i) =>
              i.id === row.original.id ? { ...i, ...updated } : i
            )
          )
        }
      />
    ),
  },
];
