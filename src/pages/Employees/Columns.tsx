import { GenericActions } from "@/components/CRUD/GenericEditDelete";
import type { ColumnDef } from "@tanstack/react-table";

export const employeesColumns = (
  setData: React.Dispatch<React.SetStateAction<any[]>>
): ColumnDef<any>[] => [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "phoneNumber", header: "Phone" },
  { accessorKey: "address", header: "Address" },
  {
    accessorKey: "timings",
    header: "Timings (IST)",
    cell: ({ row }) => {
      const t = row.original.timings;
      return t?.start && t?.end ? `${t.start} - ${t.end}` : "—";
    },
  },
  { accessorKey: "dateOfJoining", header: "Date of Joining" },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <GenericActions
        collection="employees"
        record={row.original}
        editableFields={["name", "phoneNumber", "address", "timings", "dateOfJoining"]}
        labelMap={{
          name: "Name",
          phoneNumber: "Phone Number",
          address: "Address",
          timings: "Timings",
          dateOfJoining: "Date of Joining",
        }}
        onAfterDelete={() =>
          setData((prev) => prev.filter((i) => i.id !== row.original.id))
        }
        onAfterUpdate={(updated) =>
          setData((prev) =>
            prev.map((i) => (i.id === row.original.id ? { ...i, ...updated } : i))
          )
        }
      />
    ),
  },
];


