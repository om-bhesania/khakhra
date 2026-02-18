/**
 * Print Service for TVS LP-46 DLite Plus
 * 
 * This service communicates with the local print server to send
 * barcode labels to the TVS printer.
 */

import type { BarcodeLabel } from "./tvsLabelPrinter";

 

// Print server configurationO
const PRINT_SERVER_URL = 'http://localhost:3001';

export interface PrintResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface PrinterStatus {
  success: boolean;
  status: 'online' | 'offline';
  printer?: string;
  error?: string;
}

/**
 * Check if print server is running
 */
export async function checkPrintServer(): Promise<boolean> {
  try {
    const response = await fetch(`${PRINT_SERVER_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('❌ Print server not reachable:', error);
    return false;
  }
}

/**
 * Print a single barcode label
 * 
 * @param label - Label data to print
 * @param config - Optional printer configuration
 * @returns Print result
 */
export async function printBarcodeLabel(
  label: BarcodeLabel, 
): Promise<PrintResult> {
  try {
    // Generate TSPL commands
  
    console.log('📤 Sending print job to server...');
    console.log('Label:', label);

    // Send to print server
    const response = await fetch(`${PRINT_SERVER_URL}/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }, 
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Print job sent successfully');
    } else {
      console.error('❌ Print job failed:', result.error);
    }

    return result;
  } catch (error: any) {
    console.error('❌ Print error:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to print server',
    };
  }
}

/**
 * Print multiple barcode labels in batch
 * 
 * @param labels - Array of label data to print
 * @param config - Optional printer configuration
 * @returns Print result
 */
export async function printBarcodeLabels(
  labels: BarcodeLabel[], 
): Promise<PrintResult> {
  try {
    // Generate TSPL commands for batch 

    console.log(`📤 Sending batch print job (${labels.length} labels)...`);

    // Send to print server
    const response = await fetch(`${PRINT_SERVER_URL}/print/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }, 
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Batch print job sent (${labels.length} labels)`);
    } else {
      console.error('❌ Batch print failed:', result.error);
    }

    return result;
  } catch (error: any) {
    console.error('❌ Batch print error:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to print server',
    };
  }
}

/**
 * Check printer status
 * 
 * @returns Printer status
 */
export async function checkPrinterStatus(): Promise<PrinterStatus> {
  try {
    const response = await fetch(`${PRINT_SERVER_URL}/printer/status`, {
      method: 'GET',
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    return {
      success: false,
      status: 'offline',
      error: error.message || 'Failed to connect to print server',
    };
  }
}

/**
 * Print a test label
 * 
 * @returns Print result
 */
export async function printTestLabel(): Promise<PrintResult> {
  try {
    console.log('🧪 Sending test print job...');

    const response = await fetch(`${PRINT_SERVER_URL}/printer/test`, {
      method: 'POST',
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Test label sent to printer');
    } else {
      console.error('❌ Test print failed:', result.error);
    }

    return result;
  } catch (error: any) {
    console.error('❌ Test print error:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to print server',
    };
  }
}

/**
 * Get printer configuration
 * 
 * @returns Current printer configuration
 */
export async function getPrinterConfig(): Promise<any> {
  try {
    const response = await fetch(`${PRINT_SERVER_URL}/printer/config`, {
      method: 'GET',
    });

    return await response.json();
  } catch (error: any) {
    console.error('❌ Failed to get printer config:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update printer configuration
 * 
 * @param config - New printer configuration
 * @returns Update result
 */
export async function updatePrinterConfig(config: { ip?: string; port?: number }): Promise<any> {
  try {
    const response = await fetch(`${PRINT_SERVER_URL}/printer/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    return await response.json();
  } catch (error: any) {
    console.error('❌ Failed to update printer config:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Print barcode label from inventory product
 * 
 * @param product - Product data from inventory
 * @param quantity - Number of labels to print (default: 1)
 * @returns Print result
 */
export async function printProductLabel(
  product: any,
  quantity: number = 1
): Promise<PrintResult> {
  const label: BarcodeLabel = {
    barcode: product.barcode || product.id,
    productName: product.name || 'Unnamed Product',
    price: product.sellingPrice,
    additionalInfo: `Stock: ${product.quantity || 0}`,
  };

  if (quantity === 1) {
    return printBarcodeLabel(label);
  } else {
    // Print multiple copies
    const labels = Array(quantity).fill(label);
    return printBarcodeLabels(labels);
  }
}
