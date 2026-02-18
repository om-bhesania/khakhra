/**
 * USB Print Server for TVS LP-46 DLite Plus (USB Printer)
 * 
 * This sends TSPL commands to USB printers via Windows printer name
 * 
 * Usage:
 *   1. Install: npm install express cors printer
 *   2. Make sure TVS LP-46 is installed in Windows (Control Panel → Devices and Printers)
 *   3. Start: node usbPrintServer.cjs
 *   4. The server will run on http://localhost:3001
 */

const express = require('express');
const cors = require('cors');
const printer = require('printer');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Get list of available printers
app.get('/api/printer/list', (req, res) => {
  try {
    const printers = printer.getPrinters();
    console.log('📋 Available printers:', printers.length);
    
    printers.forEach((p, index) => {
      console.log(`  ${index + 1}. ${p.name}`);
      console.log(`     Status: ${p.status || 'Unknown'}`);
      console.log(`     Is Default: ${p.isDefault || false}`);
    });
    
    const simplifiedPrinters = printers.map(p => ({
      name: p.name,
      status: p.status,
      isDefault: p.isDefault || false,
    }));
    
    res.json({ success: true, printers: simplifiedPrinters });
  } catch (error) {
    console.error('❌ Error listing printers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get default printer
app.get('/api/printer/default', (req, res) => {
  try {
    const defaultPrinter = printer.getDefaultPrinterName();
    console.log('🖨️ Default printer:', defaultPrinter);
    res.json({ success: true, printer: defaultPrinter });
  } catch (error) {
    console.error('❌ Error getting default printer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Print raw TSPL commands to USB printer
app.post('/api/printer/print', async (req, res) => {
  try {
    const { printerName, tspl } = req.body;
    
    if (!tspl) {
      return res.status(400).json({ success: false, error: 'TSPL commands required' });
    }
    
    // Get printer name (use provided or default)
    let targetPrinter = printerName;
    
    if (!targetPrinter) {
      // Try to find TVS printer or use default
      const printers = printer.getPrinters();
      const tvsPrinter = printers.find(p => 
        p.name.toLowerCase().includes('tvs') || 
        p.name.toLowerCase().includes('lp-46') ||
        p.name.toLowerCase().includes('lp46')
      );
      
      if (tvsPrinter) {
        targetPrinter = tvsPrinter.name;
        console.log('🎯 Found TVS printer:', targetPrinter);
      } else {
        targetPrinter = printer.getDefaultPrinterName();
        console.log('⚠️ TVS printer not found, using default:', targetPrinter);
      }
    }
    
    console.log('📋 Sending TSPL to printer:', targetPrinter);
    console.log('📦 TSPL length:', tspl.length, 'bytes');
    console.log('📄 TSPL commands:\n' + tspl);
    
    // Print raw data
    const options = {
      type: 'RAW',
      success: function(jobID) {
        console.log('✅ Print job submitted:', jobID);
      },
      error: function(err) {
        console.error('❌ Print error:', err);
      }
    };
    
    printer.printDirect({
      data: tspl,
      printer: targetPrinter,
      type: 'RAW',
      success: function(jobID) {
        console.log('✅ Print job', jobID, 'sent successfully');
        res.json({ 
          success: true, 
          message: 'Print job sent successfully',
          printer: targetPrinter,
          jobID: jobID
        });
      },
      error: function(err) {
        console.error('❌ Print job failed:', err);
        res.status(500).json({ 
          success: false, 
          error: err.message || 'Print job failed',
          printer: targetPrinter
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Print error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'USB Print server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log('🖨️  USB Print Server started');
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  /api/health - Check server status`);
  console.log(`  GET  /api/printer/list - List all Windows printers`);
  console.log(`  GET  /api/printer/default - Get default printer`);
  console.log(`  POST /api/printer/print - Send TSPL to USB printer`);
  console.log('');
  
  // List available printers on startup
  try {
    const printers = printer.getPrinters();
    console.log('📋 Found', printers.length, 'printer(s):');
    printers.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name}${p.isDefault ? ' (DEFAULT)' : ''}`);
    });
    
    const tvsPrinter = printers.find(p => 
      p.name.toLowerCase().includes('tvs') || 
      p.name.toLowerCase().includes('lp-46')
    );
    
    if (tvsPrinter) {
      console.log('');
      console.log('✅ TVS LP-46 printer detected:', tvsPrinter.name);
    } else {
      console.log('');
      console.log('⚠️  TVS LP-46 not found. Please install the printer in Windows.');
      console.log('   Go to: Settings → Devices → Printers & Scanners → Add a printer');
    }
  } catch (err) {
    console.error('❌ Error listing printers:', err.message);
  }
  
  console.log('');
  console.log('👉 Ready to print! Use the app to send print jobs.');
});
