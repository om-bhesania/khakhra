/**
 * Simple Migration Script for Browser Console
 * 
 * HOW TO USE:
 * 1. Open your app in browser (make sure you're logged in)
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Wait for "Migration complete!" message
 * 6. Refresh the inventory page
 */

(async function migrateBarcodes() {
  console.log('🚀 Starting barcode migration...\n');
  
  // Simple hash function
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  // Generate barcode from name
  function generateBarcodeFromName(name) {
    const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const prefix = cleanName.substring(0, Math.min(4, cleanName.length));
    
    const hash = simpleHash(cleanName + Date.now().toString());
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const neededLength = 6 - prefix.length;
    let hashPart = '';
    let tempHash = hash;
    
    for (let i = 0; i < Math.max(2, neededLength); i++) {
      hashPart += chars[tempHash % chars.length];
      tempHash = Math.floor(tempHash / chars.length);
    }
    
    return (prefix + hashPart).substring(0, 8);
  }
  
  try {
    // Import Firestore functions
    const { collection, getDocs, doc, updateDoc, getFirestore } = window.firebaseImports || {};
    
    if (!getFirestore) {
      console.error('❌ Firestore not available. Make sure you are on the app page.');
      return;
    }
    
    const db = getFirestore();
    
    // You'll need to adjust the collection path based on your auth
    // This is a placeholder - update with actual path
    console.log('⚠️  IMPORTANT: You need to update the collection path in this script');
    console.log('Current path format: users/{userId}/inventory');
    console.log('\nPlease check your Firestore structure and update accordingly.\n');
    
    // Placeholder - replace with actual path
    const inventoryRef = collection(db, 'users/YOUR_USER_ID/inventory');
    const snapshot = await getDocs(inventoryRef);
    
    console.log(`📦 Found ${snapshot.size} products\n`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const productName = data.name || 'Unknown';
      
      // Skip if already has short barcode
      if (data.barcode && data.barcode.length >= 5 && data.barcode.length <= 8) {
        console.log(`⏭️  Skipped: ${productName} (has: ${data.barcode})`);
        skipped++;
        continue;
      }
      
      // Generate new barcode
      const newBarcode = generateBarcodeFromName(productName);
      
      // Update
      await updateDoc(docSnap.ref, {
        barcode: newBarcode,
        updatedAt: new Date(),
      });
      
      console.log(`✅ ${productName} → ${newBarcode}`);
      updated++;
    }
    
    console.log(`\n🎉 Migration complete!`);
    console.log(`   ✅ Updated: ${updated} products`);
    console.log(`   ⏭️  Skipped: ${skipped} products`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
