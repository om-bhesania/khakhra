import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BarChart3, Printer } from "lucide-react";
import { useState } from "react";
import Barcode from "react-barcode";
import { toast } from "sonner";

type BarcodeDisplayProps = {
  productId: string;
  productName: string;
  barcode?: string;
  product?: any;
};

export const BarcodeDisplay = ({
  productId,
  productName,
  barcode,
  product,
}: BarcodeDisplayProps) => {
  const [open, setOpen] = useState(false);
  const [labelQuantity, setLabelQuantity] = useState(2);

  const displayBarcode = barcode || productId;

const handlePrint = () => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Please allow pop-ups to print");
    return;
  }

  // Generate rows of 2 labels
  const rows: string[] = [];

  for (let i = 0; i < labelQuantity; i += 2) {
    const firstIndex = i;
    const secondIndex = i + 1;

    rows.push(`
      <div class="row">
        <div class="label">
          <div class="name">${displayBarcode}</div>
          <svg class="bc-${firstIndex}"></svg>
        </div>

        ${
          secondIndex < labelQuantity
            ? `
        <div class="label">
          <div class="name">${displayBarcode}</div>
          <svg class="bc-${secondIndex}"></svg>
        </div>`
            : `<div class="label"></div>`
        }
      </div>
    `);
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@page {
  size: 100mm 25mm;
  margin: 0;
}

html, body {
  width: 100mm;
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}

.row {
  display: flex;
  width: 100mm;
  height: 25mm;             /* lock exact label height */
  page-break-after: always;
}

.label {
  width: 50mm;
  height: 25mm;
  display: flex;
  flex-direction: column;
  justify-content: flex-start; /* pushes content slightly upwards */
  align-items: center;
  padding-left: 2mm;         /* small side safety */
  padding-right: 2mm;
  padding-bottom: 2mm;       /* controlled bottom spacing */
  padding-top: 2mm;       /* controlled bottom spacing */
}

.name {
  font-size: 9pt;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1.2mm;      /* space between name & barcode */
  line-height: 1;
  white-space: nowrap;
  max-width: 46mm;
  overflow: hidden;
  text-overflow: ellipsis;
}

svg {
  max-width: 46mm;
  height: auto;
}


@media print {
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

</style>
</head>
<body>
  ${rows.join("")}

  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <script>
    var BARCODE_VALUE = "${displayBarcode}";
    var LABEL_COUNT = ${labelQuantity};

    function generateAllBarcodes() {
      for (var i = 0; i < LABEL_COUNT; i++) {
        var svg = document.querySelector('.bc-' + i);

        if (!svg) continue;
JsBarcode(svg, BARCODE_VALUE, {
  format: "CODE128",
  displayValue: false,   // REMOVE internal text
  fontSize: 10,
  margin: 0,
  width: 1.7,            // slightly reduced
  height: 60,            // less dominant
});



      }
    }

    function startPrint() {
      window.print();
      window.onafterprint = function() {
        window.close();
      };
    }

    window.onload = function () {
      generateAllBarcodes();
      setTimeout(startPrint, 500);
    };
  </script>
</body>
</html>
`;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Print Barcode Labels">
          <BarChart3 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Print Barcode Labels</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">{productName}</p>
            <p className="text-xs text-muted-foreground">
              Barcode: <span className="font-mono">{displayBarcode}</span>
            </p>
            {barcode && barcode !== productId && (
              <p className="text-xs text-green-600">✓ Custom Barcode</p>
            )}
          </div>

          <div className="flex gap-2 justify-center bg-gray-50 rounded-lg p-4 border">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="bg-white border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center gap-1 p-2"
                style={{ width: "180px", height: "96px" }}
              >
                <p className="text-[9px] font-bold text-center w-full truncate px-1">
                  {displayBarcode}
                </p>
                <Barcode
                  value={displayBarcode}
                  format="CODE128"
                  width={1.2}
                  height={45}
                  displayValue={true}
                  background="#ffffff"
                  lineColor="#000000"
                  fontSize={9}
                  margin={1}
                />
              </div>
            ))}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Label size: 75mm × 40mm (Landscape)
          </p>

          <div className="flex items-center justify-center gap-4">
            <label className="text-sm font-medium">Labels:</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setLabelQuantity(Math.max(1, labelQuantity - 1))}
              >
                −
              </Button>
              <span className="w-12 text-center font-semibold text-lg">{labelQuantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setLabelQuantity(Math.min(100, labelQuantity + 1))}
              >
                +
              </Button>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs space-y-1">
            <p className="font-semibold text-green-900">💡 In Print Dialog:</p>
            <p className="text-green-800">Select printer: <strong>"SNBC TVSE LP46 Dlite BPLE"</strong></p>
            <p className="text-green-800">Orientation: <strong>Portrait</strong></p>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print {labelQuantity} Label{labelQuantity > 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
