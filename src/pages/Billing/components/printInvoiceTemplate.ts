// invoiceTemplate.ts
export const invoiceTemplate = (values: any) => `
<div id="printable-invoice" class="invoice-container">
  <style>
    /* 👇 Keep your exact CSS here */
    .invoice-container {
      font-family: "Poppins", sans-serif;
      color: #333;
      background: #fff;
      width: 800px;
      margin: auto;
      border: 1px solid #ddd;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .invoice-header h1 {
      font-size: 28px;
      font-weight: 600;
      letter-spacing: 1px;
    }

    .invoice-company {
      text-align: right;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      border-radius: 8px;
      overflow: hidden;
    }

    th {
      background: #f4f4f4;
      text-align: left;
      padding: 10px;
      font-weight: 600;
      border-bottom: 1px solid #ddd;
    }

    td {
      padding: 10px;
      border-bottom: 1px solid #eee;
    }

    .total-section {
      margin-top: 30px;
      display: flex;
      justify-content: flex-end;
    }

    .total-box {
      width: 300px;
      border-top: 2px solid #000;
      padding-top: 10px;
    }

    .grand-total {
      font-size: 20px;
      font-weight: 700;
      color: #000;
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      font-size: 12px;
      color: #777;
    }

    @media print {
      body { background: #fff; }
      .invoice-container { box-shadow: none; border: none; }
    }
  </style>

  <div class="invoice-header">
    <div>
      <h1>INVOICE</h1>
      <div><strong>Invoice ID:</strong> #${values.invoiceId}</div>
      <div><strong>Date:</strong> ${values.date}</div>
    </div>
    <div class="invoice-company">
      <h2>${values.companyName}</h2>
      <p>${values.companyAddress}</p>
      <p>${values.companyPhone}</p>
    </div>
  </div>

  <div class="invoice-details">
    <div><strong>Bill To:</strong> ${values.customerName}</div>
    <div><strong>Address:</strong> ${values.customerAddress}</div>
    <div><strong>Phone:</strong> ${values.customerPhone}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item Description</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${values.items
        .map(
          (item: any, i: number) => `
          <tr>
            <td>${i + 1}</td>
            <td>${item.description}</td>
            <td>${item.qty}</td>
            <td>₹${item.price}</td>
            <td>₹${item.qty * item.price}</td>
          </tr>
        `
        )
        .join("")}
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-box">
      <div><span>Subtotal:</span> <span>₹${values.subtotal}</span></div>
      <div><span>GST (18%):</span> <span>₹${values.gst}</span></div>
      <div class="grand-total"><span>Total:</span> <span>₹${
        values.total
      }</span></div>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for your business!</p>
    <p>This is a computer-generated invoice and does not require a signature.</p>
  </div>
</div>`;
