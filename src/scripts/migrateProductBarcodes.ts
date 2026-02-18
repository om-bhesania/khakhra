/**
 * Migration Script: Update all products with name-based barcodes
 * 
 * This script:
 * 1. Fetches all products from inventory
 * 2. Generates new barcode from product name (5-8 chars)
 * 3. Updates each product with the new barcode field
 * 
 * Run with: npx tsx src/scripts/migrateProductBarcodes.ts
 */

import admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

// Simple hash function
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Generate barcode from name
function generateBarcodeFromName(name: string): string {
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

async function migrateProductBarcodes() {
  console.log('🚀 Starting barcode migration...\n');
  
  try {
    // Get all inventory collections (user-specific or org-specific)
    // You'll need to adjust this based on your Firestore structure
    
    // Example: Get current user ID from environment or prompt
    const userId = process.env.USER_ID || process.argv[2];
    
    if (!userId) {
      console.error('❌ Please provide USER_ID environment variable or as argument');
      console.log('Usage: USER_ID=your-user-id npx tsx src/scripts/migrateProductBarcodes.ts');
      console.log('   OR: npx tsx src/scripts/migrateProductBarcodes.ts your-user-id');
      process.exit(1);
    }

    const inventoryPath = `users/${userId}/inventory`;
    console.log(`📂 Reading from: ${inventoryPath}\n`);

    const inventoryRef = db.collection(inventoryPath);
    const snapshot = await inventoryRef.get();

    if (snapshot.empty) {
      console.log('⚠️  No products found in inventory');
      process.exit(0);
    }

    console.log(`📦 Found ${snapshot.size} products to migrate\n`);

    let updated = 0;
    let skipped = 0;
    const barcodes = new Set<string>();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const productName = data.name || 'Unknown';

      // Skip if already has a short barcode (5-8 chars)
      if (data.barcode && data.barcode.length >= 5 && data.barcode.length <= 8) {
        console.log(`⏭️  Skipped: ${productName} (already has barcode: ${data.barcode})`);
        skipped++;
        continue;
      }

      // Generate new barcode from name
      let newBarcode = generateBarcodeFromName(productName);
      
      // Ensure uniqueness
      let attempt = 0;
      while (barcodes.has(newBarcode) && attempt < 10) {
        // Add timestamp variation for uniqueness
        newBarcode = generateBarcodeFromName(productName + attempt);
        attempt++;
      }
      
      barcodes.add(newBarcode);

      // Update product
      await doc.ref.update({
        barcode: newBarcode,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Updated: ${productName} → Barcode: ${newBarcode}`);
      updated++;
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`   ✅ Updated: ${updated} products`);
    console.log(`   ⏭️  Skipped: ${skipped} products`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Refresh your inventory page`);
    console.log(`   2. Check that barcodes display correctly`);
    console.log(`   3. Test scanning a barcode in billing`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateProductBarcodes();
