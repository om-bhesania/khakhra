import { GenericActions } from "@/components/CRUD/GenericEditDelete";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Scheme } from "@/types/scheme";

export const schemeColumns = (
  setData: React.Dispatch<React.SetStateAction<any[]>>
): ColumnDef<Scheme>[] => [
  {
    accessorKey: "name",
    header: "Scheme Name",
  },
  {
    id: "products",
    header: "Products",
    cell: ({ row }) => {
      const products = row.original.products || [];
      return (
        <div className="flex flex-wrap gap-1">
          {products.slice(0, 3).map((product: any, index: number) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {product.productName}
            </Badge>
          ))}
          {products.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{products.length - 3} more
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => {
      const date = row.original.startDate as any;
      if (!date) return "-";
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString("en-IN");
    },
  },
  {
    accessorKey: "endDate",
    header: "End Date",
    cell: ({ row }) => {
      const date = row.original.endDate as any;
      if (!date) return "-";
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString("en-IN");
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const now = new Date();
      const startDate = row.original.startDate as any;
      const endDate = row.original.endDate as any;
      
      const start = startDate.toDate ? startDate.toDate() : new Date(startDate);
      const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
      
      const isActive = start <= now && now <= end;
      
      return (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Expired"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <GenericActions
        collection="schemes"
        record={row.original}
        editableFields={["name", "startDate", "endDate"]}
        labelMap={{
          name: "Scheme Name",
          startDate: "Start Date",
          endDate: "End Date",
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
