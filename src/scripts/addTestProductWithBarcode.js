/**
 * Script to add a temporary test product with specific barcode
 * Run this in browser console on your app, or as a Node script with Firebase Admin
 */

// FOR BROWSER CONSOLE (when logged into your app):
// Copy and paste this entire code block into browser console

(async () => {
  console.log("🔧 Adding test product with barcode...");
  
  // Import necessary Firebase functions (if using browser console)
  const { getFirestore, collection, addDoc } = window;
  
  try {
    const testProduct = {
      name: "Test Product - Scanner Demo",
      barcode: "YBLOGA020523", // Your physical barcode
      price: 100,
      quantity: 50,
      costPrice: 80,
      sellingPrice: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("📦 Product to add:", testProduct);
    
    // You'll need to call your app's addDocument function
    // This is just a template - adjust based on your setup
    alert(`
Ready to add test product!

Product Details:
- Name: Test Product - Scanner Demo
- Barcode: YBLOGA020523
- Price: ₹100
- Quantity: 50
- Cost Price: ₹80
- Selling Price: ₹100

Next steps:
1. Go to your Inventory page
2. Use the regular form to add this product
3. The system will generate a barcode automatically
4. Then run the update script to change it to YBLOGA020523
    `);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
})();
