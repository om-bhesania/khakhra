// billGenerator.ts
// Exports required by you:
// - generateBillHTML(printData) -> string
// - printBill(htmlString) -> Promise<void>

export type BillData = {
  companyName: string;
  companyAddress?: string;
  companyCity?: string;
  companyPhone?: string;
  receiptNumber: string;
  date: string;
  userName?: string;
  items: {
    itemName: string;
    quantity: number;
    rate: number;
    discount?: number;
  }[];
  cartDiscount?: number;
  cgst?: number;
  sgst?: number;
  subtotal: number;
  total: number;
  paymentMode?: string;
};

/**
 * generateBillHTML(printData)
 * - paperWidth: "80mm" | "72mm" (default: "80mm")
 * - fontScale: multiplier for font sizes (default: 1.12)
 */
export function generateBillHTML(
  printData: BillData,
  opts?: { paperWidth?: string; fontScale?: number }
) {
  const paperWidth = opts?.paperWidth ?? "80mm";
  const fontScale = opts?.fontScale ?? 1.12;
  const edgePadding = "6px"; // set to "0" for absolute edge-to-edge (may clip on some printers)

  function escapeHtml(s: any) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const itemsRows = printData.items
    .map((it) => {
      const qty = Number(it.quantity) || 0;
      const rate = Number(it.rate) || 0;
      const amount = qty * rate - (Number(it.discount) || 0);
      return `<tr>
        <td style="padding:4px 0; font-size:${Math.round(
          13 * fontScale
        )}px">${escapeHtml(it.itemName)}</td>
        <td style="padding:4px 4px; text-align:right; font-size:${Math.round(
          13 * fontScale
        )}px; width:10%">${qty}</td>
        <td style="padding:4px 4px; text-align:right; font-size:${Math.round(
          13 * fontScale
        )}px; width:18%">₹${rate.toFixed(2)}</td>
        <td style="padding:4px 0; text-align:right; font-size:${Math.round(
          13 * fontScale
        )}px; width:22%">₹${amount.toFixed(2)}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Receipt ${escapeHtml(printData.receiptNumber)}</title>
  <style>
    :root{
      --receipt-width: ${paperWidth};
      --font-base: ${Math.round(13 * fontScale)}px;
      --font-small: ${Math.round(11 * fontScale)}px;
      --edge-padding: ${edgePadding};
    }
    html,body{margin:0;padding:0;background:#fff;color:#000;-webkit-print-color-adjust:exact}
    /* Page size: width fixed, height auto so printer can cut after content */
    @page{ size: var(--receipt-width) auto; margin: 0; }
    @media print{
      html,body{background:#fff}
      .receipt { box-shadow:none !important; border:none !important; margin:0 !important; }
    }

    /* Receipt container sized to paper width */
    .receipt{
      width:var(--receipt-width);
      box-sizing:border-box;
      padding: var(--edge-padding);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Courier New", monospace;
      font-size: var(--font-base);
      color:#000;
      line-height:1.2;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .center { text-align: center; }
    .company-name { font-size: calc(var(--font-base) * 1.35); font-weight:700; margin-bottom:4px; }
    .company-info { font-size: var(--font-small); margin-bottom:6px; }
    .meta { font-size: var(--font-small); margin:6px 0; }
    table { width:100%; border-collapse:collapse; margin-top:6px; font-size:var(--font-base); }
    td, th { padding: 2px 0; vertical-align: top; }
    .right { text-align:right; }
    hr { border:none; border-top:1px dashed #000; margin:6px 0; }

    /* totals area */
    .totals { margin-top:6px; font-size: var(--font-base); }
    .totals .row { display:flex; justify-content:space-between; padding:3px 0; }
    .totals .row.total { font-size: calc(var(--font-base) * 1.15); font-weight:700; border-top:1px solid #000; padding-top:6px; margin-top:6px; }

    /* avoid splitting receipt across printed pages */
    .receipt, .receipt * { page-break-inside: avoid; break-inside: avoid; -webkit-column-break-inside: avoid; -moz-column-break-inside: avoid; }

    /* accessibility: reduce motion */
    @media (prefers-reduced-motion: reduce) {
      * { transition:none !important; animation:none !important; }
    }
  </style>
</head>
<body>
  <div class="receipt" id="receipt-root" role="document" aria-label="Receipt">
    <div class="center">
      <div class="company-name">${escapeHtml(printData.companyName || "")}</div>
      <div class="company-info">${escapeHtml(printData.companyAddress || "")}${
    printData.companyCity ? "<br/>" + escapeHtml(printData.companyCity) : ""
  }${
    printData.companyPhone
      ? "<br/>Ph: " + escapeHtml(printData.companyPhone)
      : ""
  }</div>
    </div>

    <hr/>

    <div class="meta"><strong>Receipt#:</strong> ${escapeHtml(
      printData.receiptNumber
    )} &nbsp; <strong>Date:</strong> ${escapeHtml(printData.date)}</div>
    <div class="meta"><strong>Customer:</strong> ${escapeHtml(
      printData.userName || "Guest"
    )}</div>

    <table aria-hidden="false">
      <thead>
        <tr>
          <th style="width:50%; text-align:left; font-size:var(--font-small)">Item</th>
          <th style="width:10%; text-align:right; font-size:var(--font-small)">Qty</th>
          <th style="width:18%; text-align:right; font-size:var(--font-small)">Rate</th>
          <th style="width:22%; text-align:right; font-size:var(--font-small)">Amt</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <hr/>

    <div class="totals" role="contentinfo">
      ${
        printData.cartDiscount
          ? `<div class="row"><div>Cart discount</div><div> - ₹${Number(
              printData.cartDiscount
            ).toFixed(2)}</div></div>`
          : ""
      }
      <div class="row"><div>Subtotal</div><div>₹${Number(
        printData.subtotal
      ).toFixed(2)}</div></div>
      ${
        printData.cgst
          ? `<div class="row"><div>CGST</div><div>₹${Number(
              printData.cgst
            ).toFixed(2)}</div></div>`
          : ""
      }
      ${
        printData.sgst
          ? `<div class="row"><div>SGST</div><div>₹${Number(
              printData.sgst
            ).toFixed(2)}</div></div>`
          : ""
      }
      <div class="row total"><div>Total</div><div>₹${Number(
        printData.total
      ).toFixed(2)}</div></div>
    </div>

    <div class="center" style="margin-top:8px; font-size:var(--font-small)">Payment: ${escapeHtml(
      printData.paymentMode || "Cash"
    )}</div>
    <div class="center" style="margin-top:6px; font-size:var(--font-small)">Thank you for your business!</div>
  </div>

  <script>
    // Auto-print helper. When opened in a new window by your app, this will trigger print and try to close the window.
    (function(){
      function doPrintAndClose(){
        try {
          // small timeout so CSS @page has time to apply in some browsers
          setTimeout(() => {
            window.print();
            // Closing the window is optional; some browsers restrict closing windows not opened by script.
            try { window.close(); } catch(e) { /*ignore*/ }
          }, 250);
        } catch(e) {
          console.error("Auto-print failed", e);
        }
      }
      // Only auto run if this page was likely opened as a print window (opener exists)
      if (window.opener) {
        window.addEventListener('load', doPrintAndClose);
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * printBill(htmlString)
 * - If passed a full HTML document string, opens it in a new window and triggers print.
 * - If passed a BillData object, it will generate HTML then open.
 */
export async function printBill(htmlOrData: string | BillData): Promise<void> {
  // Determine if caller passed HTML or data
  let docHtml: string;
  if (
    typeof htmlOrData === "string" &&
    (htmlOrData.trim().startsWith("<!doctype") ||
      htmlOrData.trim().startsWith("<html"))
  ) {
    docHtml = htmlOrData;
  } else {
    docHtml = generateBillHTML(htmlOrData as BillData);
  }

  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    throw new Error(
      "Unable to open print window. Please allow popups for this site."
    );
  }
  w.document.open();
  w.document.write(docHtml);
  w.document.close();

  // Focus and wait for load - we also rely on the auto-print script inside the HTML.
  try {
    w.focus();
  } catch (e) {
    // ignore focus failures
  }

  // Give the window some time to render. Do not wait indefinitely.
  // We don't call print here to avoid duplicate calls; the doc's auto-print triggers it.
  return;
}
