import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { generatePermanentBarcode } from "@/lib/barcodeUtils";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Migration Tool Component
 * 
 * USAGE:
 * 1. Import this component in your Inventory page or any admin page
 * 2. Add <MigrateBarcodes /> to the page
 * 3. Click "Migrate All Products" button
 * 4. Wait for completion
 * 5. Refresh the page or click "Refresh Inventory"
 * 6. Remove this component when done
 */
export const MigrateBarcodes = () => {
  const { readDocuments, updateDocument } = useFirestoreCRUD();
  const [migrating, setMigrating] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLog((prev) => [...prev, message]);
    console.log(message);
  };

  const migrateAllProducts = async () => {
    setMigrating(true);
    setLog([]);
    addLog("🚀 Starting migration...");

    try {
      // Fetch all products
      const products = await readDocuments("inventory");
      addLog(`📦 Found ${products.length} products`);

      let updated = 0;
      let skipped = 0;

      for (const product of products) {
        const productName = product.name || "Unknown";

        // Skip if already has 10-char barcode
        if (product.barcode && product.barcode.length === 10) {
          addLog(`⏭️  Skipped: ${productName} (has: ${product.barcode})`);
          skipped++;
          continue;
        }

        // Generate new barcode from name (10 chars)
        const newBarcode = generatePermanentBarcode(productName);

        // Update product
        await updateDocument("inventory", product.id, {
          barcode: newBarcode,
        });

        addLog(`✅ ${productName} → ${newBarcode}`);
        updated++;
      }

      addLog(`\n🎉 Migration complete!`);
      addLog(`   ✅ Updated: ${updated} products`);
      addLog(`   ⏭️  Skipped: ${skipped} products`);
      addLog(`\n🔄 Please refresh the page to see updated barcodes!`);
      toast.success(`Migration complete! Updated ${updated} products. Refresh the page!`);
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      toast.error("Migration failed: " + error.message);
    } finally {
      setMigrating(false);
    }
  };

  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <Card className="mb-4 border-orange-300 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-orange-900">
          🔧 Barcode Migration Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-orange-800">
          <p className="font-medium mb-2">
            This will update all products to use new name-based barcodes (10 characters).
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>All products will get new 10-character barcodes</li>
            <li>Products with 10-char barcodes will be skipped</li>
            <li>Barcodes are generated from product names</li>
            <li>All other product data remains unchanged</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={migrateAllProducts}
            disabled={migrating}
            className="flex-1"
            variant="default"
          >
            {migrating ? "Migrating..." : "Migrate All Products"}
          </Button>
          
          <Button
            onClick={refreshPage}
            variant="outline"
            className="flex-1"
          >
            🔄 Refresh Page
          </Button>
        </div>

        {log.length > 0 && (
          <div className="bg-black text-green-400 p-3 rounded-md font-mono text-xs max-h-64 overflow-auto">
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
