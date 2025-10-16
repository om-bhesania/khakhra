import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { formatTimestampString } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
}: DataTableProps<TData, TValue>) {
  // Enhance columns: auto-format Created At columns and Timestamp-like values
  const enhancedColumns = React.useMemo(() => {
    const serialColumn: ColumnDef<TData, TValue> = {
      id: "__serial",
      header: "#",
      cell: ({ row, table }: any) => {
        const { pageIndex, pageSize } = table.getState().pagination ?? {
          pageIndex: 0,
          pageSize: table?.getState?.().pagination?.pageSize ?? 10,
        };
        const serialNumber = pageIndex * pageSize + row.index + 1;
        return <span>{serialNumber}</span>;
      },
      enableHiding: false,
      enableSorting: false,
    };

    const mapped = (columns as unknown as Array<any>).map((col) => {
      if (col?.cell) return col; // respect custom cell
      const headerText =
        typeof col?.header === "string" ? col.header.toLowerCase() : "";
      const idText = String(col?.id ?? col?.accessorKey ?? "").toLowerCase();
      const isCreated =
        headerText.includes("created") || idText.includes("created");

      if (!isCreated) {
        // Fallback: if value is a Timestamp-like, prettify it anyway
        return {
          ...col,
          cell: ({ getValue }: { getValue: () => unknown }) => {
            const raw = getValue();
            // Only intercept if clearly a timestamp-like
            // @ts-expect-error - duck typing
            if (raw && (typeof raw?.toDate === 'function' || typeof raw?.seconds === 'number')) {
              return <span>{formatTimestampString(raw)}</span>;
            }
            return flexRender(col.cell ?? ((ctx: any) => String(ctx.getValue() ?? '')), { getValue } as any);
          },
        };
      }

      return {
        ...col,
        cell: ({ getValue }: { getValue: () => unknown }) => {
          return <span>{formatTimestampString(getValue())}</span>;
        },
      };
    }) as unknown as ColumnDef<TData, TValue>[];

    return [serialColumn, ...mapped];
  }, [columns]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSorting: true,
    enableFilters: true,
  });

  return (
    <div className="overflow-hidden border mt-6 rounded-md">
      <>
        {/* Toolbar: global search + filters */}
        <div className="flex flex-col gap-2 border-b p-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <Input
              placeholder="Search..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              contentLeft={<Search className="size-4 text-muted-foreground" />}
            />
          </div>
          {/* FILTERS uncomment to add filters */}
          {/* <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="size-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 px-4">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanFilter())
                    .map((column) => {
                      const colId = column.id;
                      const header = column.columnDef.header;
                      const label = typeof header === "string" ? header : colId;
                      const current = column.getFilterValue() as string | undefined;
                      const uniqueValues = Array.from(
                        column.getFacetedUniqueValues().keys()
                      )
                        .filter((v) => v !== undefined && v !== null)
                        .slice(0, 100);
                      const headerText = typeof header === "string" ? header.toLowerCase() : "";
                      const idText = String(colId ?? "").toLowerCase();
                      const isCreated = headerText.includes("created") || idText.includes("created");

                      return (
                        <div key={colId} className="flex flex-col gap-2">
                          <div className="text-sm font-medium">
                            {label}
                            {current ? (
                              <span className="ml-1 text-muted-foreground">(selected: {String(current)})</span>
                            ) : null}
                          </div>
                          <div className="rounded-md border max-h-56 overflow-y-auto">
                            <button
                              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                              onClick={() => column.setFilterValue(undefined)}
                            >
                              All
                            </button>
                            <div className="h-px bg-border" />
                            {uniqueValues.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-muted-foreground">No options</div>
                            ) : (
                              uniqueValues.map((value) => (
                                <button
                                  key={String(value)}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => column.setFilterValue(value as unknown as string)}
                                >
                                  {isCreated ? formatTimestampString(value) : String(value)}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
                <SheetFooter>
                  <div className="flex items-center justify-between w-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => setColumnFilters([])}
                    >
                      Clear all
                    </Button>
                    <SheetClose asChild>
                      <Button size="sm">Done</Button>
                    </SheetClose>
                  </div>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div> */}
        </div>
        <Table>
          {loading ? (
            <div className="flex items-center justify-center gap-3 p-8 w-full">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} className="text-center">
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <button
                              className="inline-flex items-center gap-1 hover:underline"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {header.column.getIsSorted() === "asc" ? (
                                <ArrowUp className="size-4" />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <ArrowDown className="size-4" />
                              ) : (
                                <ArrowUpDown className="size-4 text-muted-foreground" />
                              )}
                            </button>
                          ) : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="text-center">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </>
          )}
        </Table>
        {/* Pagination */}
        {!loading ? (
          <div className="flex flex-col gap-2 border-t p-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {(() => {
                const total = table.getFilteredRowModel().rows.length;
                const { pageIndex, pageSize } = table.getState().pagination;
                const start = total ? pageIndex * pageSize + 1 : 0;
                const end = Math.min((pageIndex + 1) * pageSize, total);
                return `Showing ${start}-${end} of ${total}`;
              })()}
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border bg-transparent px-2 text-sm"
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
              >
                {[5, 10, 20, 50, 100].map((sz) => (
                  <option key={sz} value={sz}>
                    {sz} / page
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </>
    </div>
  );
}
