/**
 * Utility functions for barcode generation and management
 */

/**
 * Simple hash function to generate numeric hash from string
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Generates a barcode from product name
 * Format: First 4-6 chars of name + hash-based alphanumeric (total 10 chars)
 * Example: "Chocolate Chips" → "CHOC7X9K2M" (10 chars)
 * 
 * @param name - Product name to generate barcode from
 */
export function generatePermanentBarcode(name: string): string {
  // Clean and uppercase the name
  const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Take first 4-6 characters from name (prefer 4 for more hash chars)
  const prefix = cleanName.substring(0, Math.min(4, cleanName.length));
  
  // Generate hash from full name
  const hash = simpleHash(cleanName + Date.now().toString());
  
  // Convert hash to alphanumeric (6 chars to make total 10)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const neededLength = 10 - prefix.length; // Make total 10 chars
  let hashPart = '';
  let tempHash = hash;
  
  for (let i = 0; i < neededLength; i++) {
    hashPart += chars[tempHash % chars.length];
    tempHash = Math.floor(tempHash / chars.length);
  }
  
  // Ensure exactly 10 characters
  const result = (prefix + hashPart).substring(0, 10);
  return result.padEnd(10, '0'); // Pad with zeros if needed
}

/**
 * Validates if a string is a valid inventory barcode format
 */
export function isValidInventoryBarcode(barcode: string): boolean {
  // Check format: 10 alphanumeric characters
  const pattern = /^[A-Z0-9]{10}$/;
  return pattern.test(barcode);
}

/**
 * Extracts date from barcode
 * Note: New barcode format (5-8 chars) doesn't encode date information
 * This function returns null for the new format
 */
export function getDateFromBarcode(_barcode: string): Date | null {
  // New barcode format doesn't contain date information
  return null;
}
