/**
 * Firebase Admin Script to add test product with specific barcode
 * 
 * Run with: node src/scripts/addTestProductWithBarcode.ts
 * or: npm run add-test-product
 */

import admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

async function addTestProduct() {
  console.log('🔧 Adding test product with name-based barcode...');
  
  const testProduct = {
    name: 'Test Product',
    barcode: 'TEST42', // Generated from name
    price: 100,
    quantity: 50,
    costPrice: 80,
    sellingPrice: 100,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const docRef = await db.collection('inventory').add(testProduct);
    console.log('✅ Test product added successfully!');
    console.log('📋 Product ID:', docRef.id);
    console.log('🔖 Barcode: TEST42 (generated from name)');
    console.log('\n📝 Product Details:');
    console.log('   Name: Test Product');
    console.log('   Price: ₹100');
    console.log('   Quantity: 50');
    console.log('   Cost Price: ₹80');
    console.log('   Selling Price: ₹100');
    console.log('\n✨ Barcode flow: TEST42 → "Test Product" → product details');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding test product:', error);
    process.exit(1);
  }
}

addTestProduct();
