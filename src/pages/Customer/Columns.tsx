import { Button } from "@/components/ui/button";
import { formatTimestampString } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, EyeIcon } from "lucide-react";

import { CustomPopOver } from "@/components/CustomPopover";
import CustomDialouge from "@/components/CustomDialouge";

export const customerColumns: ColumnDef<any>[] = [
  {
    accessorKey: "name",

    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => <div className="lowercase">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "number",

    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Number (₹)
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="lowercase">{row.getValue("number")}</div>
    ),
  },
  // {
  //   accessorKey: "paymentMode",
  //   header: () => <div className="">Payment Mode (₹)</div>,
  //   cell: ({ row }) => {
  //     return <div className=" font-medium">{row.getValue("paymentMode")}</div>;
  //   },
  // },
  // {
  //   accessorKey: "paymentAmount",
  //   header: () => <div className="">Payment Amount (₹)</div>,
  //   cell: ({ row }) => {
  //     return (
  //       <div className=" font-medium">{row.getValue("paymentAmount")}</div>
  //     );
  //   },
  // },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      return <div>{formatTimestampString(row.getValue("createdAt"))}</div>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    enableHiding: false,
    cell: ({ row }) => {
      const payment = row.original;

      return (
        <div className="flex items-center justify-center gap-2">
          {/* <FilePen
            onClick={() => {}}
            className="cursor-pointer hover:text-primary h-4 w-4"
          />
          <Trash2
              onClick={() => {}}
              className="cursor-pointer hover:text-primary h-4 w-4"
          /> */}
          <CustomDialouge
            trigger={
              <>
                <EyeIcon
                  onClick={() => {}}
                  className="cursor-pointer hover:text-primary h-4 w-4"
                />
              </>
            }
            dialogTitle="Test"
            dialogDescription={<>asdasd</>}
          />
        </div>
      );
    },
  },
];
