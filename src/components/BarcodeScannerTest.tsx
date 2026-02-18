import { Card } from "@/components/ui/card";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Test component for barcode scanner
 * Use this to verify scanner is working before using in billing
 * 
 * Usage: Import and render this component on any page to test
 */
export const BarcodeScannerTest = () => {
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);

  const handleScan = (barcode: string) => {
    console.log("✅ Test: Barcode received:", barcode);
    setScannedCodes((prev) => [barcode, ...prev].slice(0, 10)); // Keep last 10
    toast.success(`Scanned: ${barcode}`);
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">🧪 Barcode Scanner Test</h2>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Test your barcode scanner here. Scan a barcode or type anything and press Enter.
          </p>
          <BarcodeScanner
            onScan={handleScan}
            placeholder="Scan or type here..."
          />
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Scanned Codes (Last 10):</h3>
          {scannedCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No codes scanned yet. Try scanning or typing something.
            </p>
          ) : (
            <ul className="space-y-1">
              {scannedCodes.map((code, index) => (
                <li
                  key={index}
                  className="text-sm font-mono bg-muted p-2 rounded"
                >
                  {index + 1}. {code}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-md">
          <h4 className="text-sm font-medium mb-2">✅ Scanner Working If:</h4>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>You can type text and press Enter → appears in list</li>
            <li>You can scan barcode → appears in list</li>
            <li>Toast notification appears each time</li>
            <li>Console shows: "✅ Test: Barcode received: [code]"</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 rounded-md">
          <h4 className="text-sm font-medium mb-2">🔧 If Not Working:</h4>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>Open browser console (F12) and look for errors</li>
            <li>Test scanner in Notepad - should type characters</li>
            <li>Ensure scanner is in keyboard emulation mode</li>
            <li>Click in the input to focus it</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};
