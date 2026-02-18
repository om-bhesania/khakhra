import InventoryForm from "./components/InventoryForm";
import InventoryTable from "./components/InventoryTable";
import { PrintServerManager } from "@/components/PrintServerManager";
import { MigrateBarcodes } from "@/components/MigrateBarcodes";

export { InventoryForm as InventoryAdd };

export const InventoryView = () => {
  return (
    <div className="space-y-4">
      <MigrateBarcodes />
      <PrintServerManager />
      <InventoryTable />
    </div>
  );
};
