import { GenericActions } from "@/components/CRUD/GenericEditDelete";
import { formatTimestampString } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const customerColumns = (
  setData: React.Dispatch<React.SetStateAction<any[]>>
): ColumnDef<any>[] => [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "number", header: "Number" },
  {
    id: "totalPackets",
    header: "Packets",
    cell: ({ row }) => {
      const totalPackets = row.original.totalPackets ?? 0;
      const manualPackets = row.original.manualPackets ?? 0;
      const billPackets = row.original.billPackets ?? 0;
      
      return (
        <div className="text-center">
          <div className="font-semibold">{totalPackets.toLocaleString("en-IN")}</div>
          <div className="text-xs text-muted-foreground">
            Manual: {manualPackets.toLocaleString("en-IN")} | 
            Bills: {billPackets.toLocaleString("en-IN")}
          </div>
        </div>
      );
    },
  },
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
    cell: ({ row }) => {
      const nav = useNavigate();
      const handleRedirectToHistory = () => {
        nav(`/customer/view/${row.original.id}`);
      };

      return (
        <div className="flex items-center justify-center gap-2">
          <GenericActions
            collection="customers"
            record={row.original}
            editableFields={["name", "manuallyAddedPackets", "number"]}
            labelMap={{ name: "Name",manuallyAddedPackets: "Packets", number: "Number" }}
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
          <EyeIcon
            onClick={handleRedirectToHistory}
            className="cursor-pointer hover:text-primary h-4 w-4"
          />
        </div>
      );
    },
  },
];
