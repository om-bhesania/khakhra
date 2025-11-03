// utils/billGenerator.ts

export interface BillItem {
  itemName: string;
  quantity: number;
  rate: number;
  discount?: number;
}

export interface BillData {
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyPhone: string; 
  receiptNumber: string;
  date: string;
  userName: string;
  items: BillItem[];
  cartDiscount?: number;
  taxRate?: number;
  cgst?: number;
  sgst?: number;
  subtotal: number;
  total: number;
  paymentMode?: string;
}

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
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; font-size: 14px;">${
            item.quantity
          }x ₹${item.rate.toFixed(2)} ${
        itemDiscount > 0 ? `(-₹${itemDiscount.toFixed(2)})` : ""
      }</td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px;">₹${itemFinalPrice.toLocaleString(
            "en-IN",
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          )}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 4px 0 12px 0; font-size: 14px;">${
            item.itemName
          }</td>
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
        @media print {
          body { margin: 0; }
          .receipt { box-shadow: none !important; }
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f3f4f6;
        }
        .receipt {
          max-width: 400px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .company-info {
          font-size: 12px;
          line-height: 1.6;
          color: #374151;
        }
        .receipt-info {
          margin: 20px 0;
          font-size: 13px;
          border-bottom: 1px dashed #9ca3af;
          padding-bottom: 15px;
        }
        .receipt-number {
          font-weight: bold;
          margin-bottom: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        .items-header {
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        .summary {
          border-top: 1px solid #e5e7eb;
          padding-top: 15px;
          margin-top: 15px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          font-size: 14px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          font-size: 18px;
          font-weight: bold;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          margin-top: 10px;
        }
        .payment-info {
          margin-top: 15px;
          font-size: 14px;
        }
        .payment-row {
          display: flex;
          justify-content: space-between;
          padding: 3px 0;
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
            ${companyPhone}<br> 
          </div>
        </div>

        <div class="receipt-info">
          <div class="receipt-number">Receipt No.: ${receiptNumber}</div>
          <div>${date}</div>
          <div>Customer: ${userName}</div>
        </div>

        <div class="items-header">
          Items count: ${itemCount}
        </div>

        <table>
          ${itemsHTML}
        </table>

        ${
          cartDiscount > 0
            ? `
          <div class="summary-row" style="margin-bottom: 10px;">
            <span>Cart discount:</span>
            <span>-₹${cartDiscount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}</span>
          </div>
        `
            : ""
        }

        <div class="summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>₹${subtotal.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}</span>
          </div>
          ${
            cgst > 0
              ? `
            <div class="summary-row">
              <span>CGST:</span>
              <span>₹${cgst.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</span>
            </div>
          `
              : ""
          }
          ${
            sgst > 0
              ? `
            <div class="summary-row">
              <span>SGST:</span>
              <span>₹${sgst.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</span>
            </div>
          `
              : ""
          }
        </div>

        <div class="total-row">
          <span>TOTAL:</span>
          <span>₹${total.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</span>
        </div>

        <div class="payment-info">
          <div class="payment-row">
            <span>Payment Mode:</span>
            <span>${paymentMode}</span>
          </div>
          <div class="payment-row">
            <span>Paid amount:</span>
            <span>₹${total.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}</span>
          </div>
          <div class="payment-row">
            <span>Change:</span>
            <span>₹0.00</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const printBill = (htmlContent: string) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Unable to open print window. Please allow popups.");
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.print();
  };
};

export const downloadBillAsPDF = (htmlContent: string) => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-10000px";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error("Unable to create print frame");
  }

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();

  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 1000);
};
