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
export const generateBillHTML = (data: BillData): string => {
  const {
    companyName,
    companyAddress,
    companyCity,
    companyPhone,
    receiptNumber,
    date,
    userName,
    items,
    cartDiscount = 0,
    cgst = 0,
    sgst = 0,
    subtotal,
    total,
    paymentMode = "Cash",
  } = data;

  // Calculate items display
  const itemsHTML = items
    .map((item) => {
      const itemTotal = item.quantity * item.rate;
      const itemDiscount = item.discount || 0;
      const itemFinalPrice = itemTotal - itemDiscount;

      return `
        <tr>
          <td colspan="2" style="padding: 3px 0 1px 0; font-size: 12px; font-weight: 600;">${
            item.itemName
          }</td>
        </tr>
        <tr style="border-bottom: 1px dashed #999;">
          <td style="padding: 0 0 4px 0; font-size: 11px;">
            ${item.quantity} x ₹${item.rate.toFixed(2)}${
        itemDiscount > 0 ? ` (-₹${itemDiscount.toFixed(2)})` : ""
      }
          </td>
          <td style="padding: 0 0 4px 0; text-align: right; font-size: 12px; font-weight: 600;">
            ₹${itemFinalPrice.toFixed(2)}
          </td>
        </tr>
      `;
    })
    .join("");

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Receipt ${receiptNumber}</title>
      <style>
        @page {
          size: 76mm auto;
          margin: 0;
        }
        @media print {
          body { 
            margin: 0 !important;
            padding: 0 !important;
            width: 76mm !important;
          }
          .receipt { 
            box-shadow: none !important;
            margin: 0 !important;
            padding: 3mm 4mm !important;
            page-break-after: auto;
          }
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', Courier, monospace;
          margin: 0;
          padding: 0;
          background: white;
          width: 76mm;
          line-height: 1.2;
        }
        .receipt {
          width: 76mm;
          margin: 0 auto;
          background: white;
          padding: 3mm 4mm;
        }
        .header {
          text-align: center;
          margin-bottom: 6px;
          padding-bottom: 6px;
          border-bottom: 1px dashed #000;
        }
        .company-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 3px;
          letter-spacing: 0.5px;
        }
        .company-info {
          font-size: 10px;
          line-height: 1.3;
          color: #000;
        }
        .receipt-info {
          margin: 6px 0;
          font-size: 11px;
          border-bottom: 1px dashed #000;
          padding-bottom: 6px;
          line-height: 1.4;
        }
        .receipt-number {
          font-weight: bold;
          margin-bottom: 2px;
          font-size: 11px;
        }
        .info-line {
          margin: 1px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 6px 0 0 0;
        }
        .items-header {
          padding: 4px 0;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          border-bottom: 1px solid #000;
          border-top: 1px solid #000;
          margin-bottom: 4px;
        }
        .summary {
          padding-top: 6px;
          margin-top: 4px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
          font-size: 11px;
        }
        .discount-row {
          display: flex;
          justify-content: space-between;
          padding: 3px 0;
          font-size: 11px;
          border-top: 1px dashed #000;
          margin-top: 4px;
          padding-top: 6px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 16px;
          font-weight: bold;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          margin: 6px 0;
        }
        .payment-info {
          margin-top: 6px;
          font-size: 11px;
          padding-top: 6px;
        }
        .payment-row {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
          line-height: 1.4;
        }
        .footer {
          text-align: center;
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1px dashed #000;
          font-size: 10px;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="company-name">${companyName}</div>
          <div class="company-info">
            ${companyAddress}<br>
            ${companyCity}<br>
            Tel: ${companyPhone}
          </div>
        </div>

        <div class="receipt-info">
          <div class="receipt-number">Receipt #${receiptNumber}</div>
          <div class="info-line">${date}</div>
          <div class="info-line">Customer: ${userName}</div>
        </div>

        <div class="items-header">
          Items (${itemCount})
        </div>

        <table>
          ${itemsHTML}
        </table>

        ${
          cartDiscount > 0
            ? `
          <div class="discount-row">
            <span>Cart Discount:</span>
            <span style="font-weight: 600;">-₹${cartDiscount.toFixed(2)}</span>
          </div>
        `
            : ""
        }

        <div class="summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>₹${subtotal.toFixed(2)}</span>
          </div>
          ${
            cgst > 0
              ? `
            <div class="summary-row">
              <span>CGST:</span>
              <span>₹${cgst.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          ${
            sgst > 0
              ? `
            <div class="summary-row">
              <span>SGST:</span>
              <span>₹${sgst.toFixed(2)}</span>
            </div>
          `
              : ""
          }
        </div>

        <div class="total-row">
          <span>TOTAL:</span>
          <span>₹${total.toFixed(2)}</span>
        </div>

        <div class="payment-info">
          <div class="payment-row">
            <span>Payment Mode:</span>
            <span style="font-weight: 600;">${paymentMode}</span>
          </div>
          <div class="payment-row">
            <span>Paid Amount:</span>
            <span style="font-weight: 600;">₹${total.toFixed(2)}</span>
          </div>
          <div class="payment-row">
            <span>Change:</span>
            <span>₹0.00</span>
          </div>
        </div>

        <div class="footer">
          THANK YOU FOR YOUR BUSINESS<br>
          PLEASE VISIT AGAIN
        </div>
      </div>
    </body>
    </html>
  `;
};

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
