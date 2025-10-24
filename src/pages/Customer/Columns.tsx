import { GenericActions } from "@/components/CRUD/GenericEditDelete";
import { Button } from "@/components/ui/button";
import { formatTimestampString } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, EyeIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const customerColumns = (
  setData: React.Dispatch<React.SetStateAction<any[]>>
): ColumnDef<any>[] => [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "number", header: "Number" },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      const ts = row.getValue("createdAt");
      return <div>{formatTimestampString(ts)}</div>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <GenericActions
          collection="customers"
          record={row.original}
          editableFields={["name", "number"]}
          labelMap={{ name: "Name", number: "Number" }}
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
      </div>
    ),
  },
];
