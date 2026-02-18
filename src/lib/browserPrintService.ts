/**
 * Browser-based TVS LP-46 DLite Plus Label Printer Integration
 * Label size: 75mm × 40mm (landscape)
 */

import type { BarcodeLabel, PrinterConfig } from "./tvsLabelPrinter";

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: "none" | "even" | "odd";
  flowControl?: "none" | "hardware";
}

interface SerialPort {
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
  readable: ReadableStream<Uint8Array> | null;
}

// ── Label dimensions: 75mm wide × 40mm tall (landscape) ──────────────────────
const DEFAULT_CONFIG: PrinterConfig = {
  width: 75,
  height: 40,
  gap: 3,
  density: 10,
  speed: 3,
  baudRate: 9600,
};

const SERIAL_OPTIONS = (baudRate: number): SerialOptions => ({
  baudRate,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  flowControl: "none",
});

let _port: SerialPort | null = null;

// ── TSPL generation ───────────────────────────────────────────────────────────

function buildLabelTSPL(
  label: BarcodeLabel,
  config: PrinterConfig,
  includeSetup = true,
): string {
  const { width, height, gap, density, speed } = config;
  const { barcode, productName, price } = label;

  const cmds: string[] = [];

  if (includeSetup) {
    cmds.push(`SIZE ${width} mm, ${height} mm`);
    cmds.push(`GAP ${gap} mm, 0 mm`);
    cmds.push(`DENSITY ${density}`);
    cmds.push(`SPEED ${speed}`);
    cmds.push(`DIRECTION 0`);
    cmds.push(`REFERENCE 0,0`);
  }

  cmds.push(`CLS`);

  const dpm = 8; // 203dpi = 8 dots/mm
  const W = width * dpm; // 600 dots (75mm)
  const H = height * dpm; // 320 dots (40mm)

  // ── Product name — top center ─────────────────────────────────
  const nameText = productName.substring(0, 24).toUpperCase();
  const nameCharW = 10; // font "2" ≈ 10 dots/char
  const nameX = Math.max(4, Math.floor((W - nameText.length * nameCharW) / 2));
  cmds.push(`TEXT ${nameX},4,"2",0,1,1,"${nameText}"`);

  // ── Barcode — centered, tall ──────────────────────────────────
  const barcodeY = 26;
  // Leave room for price at bottom if present
  const barcodeH = H - barcodeY - (price !== undefined ? 30 : 10);
  // narrow=2 dots gives good density on 75mm width
  const barcodeNarrow = 2;
  const barcodeEstW = barcode.length * 11 * barcodeNarrow;
  const barcodeX = Math.max(4, Math.floor((W - barcodeEstW) / 2));

  cmds.push(
    `BARCODE ${barcodeX},${barcodeY},"128",${Math.max(40, barcodeH)},1,0,${barcodeNarrow},${barcodeNarrow},"${barcode}"`,
  );

  // ── Price — bottom center ─────────────────────────────────────
  if (price !== undefined && price !== null) {
    const priceNum =
      typeof price === "number" ? price : parseFloat(String(price)) || 0;
    const priceText = `Rs. ${priceNum.toFixed(2)}`;
    const priceCharW = 10;
    const priceX = Math.max(
      4,
      Math.floor((W - priceText.length * priceCharW) / 2),
    );
    const priceY = H - 20;
    cmds.push(`TEXT ${priceX},${priceY},"2",0,1,1,"${priceText}"`);
  }

  cmds.push(`PRINT 1`);
  return cmds.join("\r\n") + "\r\n";
}

function buildBatchTSPL(labels: BarcodeLabel[], config: PrinterConfig): string {
  console.log("🏗️ buildBatchTSPL called with", labels.length, "labels");
  labels.forEach((label, i) => {
    console.log(`  Label ${i}:`, label);
  });
  
  const result = labels
    .map((label, i) => {
      const tspl = buildLabelTSPL(label, config, i === 0);
      console.log(`  TSPL for label ${i} (${tspl.length} chars):`, tspl.substring(0, 100) + "...");
      return tspl;
    })
    .join("\r\n");
    
  console.log("📦 Total TSPL length:", result.length);
  return result;
}

// ── Connection helpers ────────────────────────────────────────────────────────

export function isWebSerialSupported(): boolean {
  return "serial" in navigator;
}

export function isPrinterConnected(): boolean {
  return _port !== null;
}

export async function connectToPrinter(
  baudRate = DEFAULT_CONFIG.baudRate,
): Promise<{ success: boolean; message: string }> {
  console.log("🔌 connectToPrinter called");
  
  if (!isWebSerialSupported()) {
    console.error("❌ Web Serial API not supported");
    return {
      success: false,
      message: "Web Serial API not supported. Use Chrome 89+.",
    };
  }
  
  try {
    console.log("📱 Requesting serial port...");
    const port = await (navigator as any).serial.requestPort();
    console.log("📱 Port selected:", port);
    
    console.log("🔓 Opening port with options:", SERIAL_OPTIONS(baudRate));
    await port.open(SERIAL_OPTIONS(baudRate));
    console.log("✅ Port opened successfully");
    
    _port = port;
    console.log("💾 Port stored in _port variable");
    
    return { success: true, message: "Printer connected successfully!" };
  } catch (err: any) {
    console.error("❌ Connection error:", err);
    
    if (
      err?.name === "NotFoundError" ||
      err?.message?.includes("No port selected")
    ) {
      console.log("ℹ️ User cancelled port selection");
      return { success: false, message: "No port selected." };
    }
    return {
      success: false,
      message: err?.message ?? "Failed to connect to printer.",
    };
  }
}

export async function autoReconnectPrinter(
  baudRate = DEFAULT_CONFIG.baudRate,
): Promise<{ success: boolean; message: string }> {
  if (!isWebSerialSupported())
    return { success: false, message: "Web Serial API not supported." };
  try {
    const ports: SerialPort[] = await (navigator as any).serial.getPorts();
    if (ports.length === 0)
      return {
        success: false,
        message: "No previously connected printers found.",
      };
    const port = ports[0];
    await port.open(SERIAL_OPTIONS(baudRate));
    _port = port;
    return { success: true, message: "Reconnected to printer." };
  } catch (err: any) {
    return { success: false, message: err?.message ?? "Failed to reconnect." };
  }
}

export async function disconnectFromPrinter(): Promise<void> {
  if (!_port) return;
  try {
    await _port.close();
  } catch {
    /* ignore */
  } finally {
    _port = null;
  }
}

export async function sendRawCommands(
  commands: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  console.log("🔍 sendRawCommands called");
  console.log("📊 Commands length:", commands.length);
  console.log("🔌 Port status:", _port ? "connected" : "not connected");
  
  if (!_port) return { success: false, error: "Printer not connected." };
  
  const writable = _port.writable;
  console.log("✍️ Writable status:", writable ? "available" : "not available");
  
  if (!writable)
    return { success: false, error: "Printer port is not writable." };
    
  const writer = writable.getWriter();
  try {
    console.log("📋 TSPL Commands:\n" + commands);
    const encoded = new TextEncoder().encode(commands);
    console.log("📦 Encoded bytes length:", encoded.length);
    await writer.write(encoded);
    console.log("✅ Write completed successfully");
    return { success: true, message: "Print job sent successfully." };
  } catch (err: any) {
    console.error("❌ Write failed:", err);
    return {
      success: false,
      error: err?.message ?? "Failed to send to printer.",
    };
  } finally {
    writer.releaseLock();
  }
}

export async function printBarcodeLabel(
  label: BarcodeLabel,
  config: Partial<PrinterConfig> = {},
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!isPrinterConnected())
    return { success: false, error: "Printer not connected." };
  const merged = { ...DEFAULT_CONFIG, ...config };
  return sendRawCommands(buildLabelTSPL(label, merged));
}

export async function printBarcodeLabels(
  labels: BarcodeLabel[],
  config: Partial<PrinterConfig> = {},
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!isPrinterConnected())
    return { success: false, error: "Printer not connected." };
  if (labels.length === 0)
    return { success: false, error: "No labels provided." };
  const merged = { ...DEFAULT_CONFIG, ...config };
  const result = await sendRawCommands(buildBatchTSPL(labels, merged));
  if (result.success)
    return {
      success: true,
      message: `${labels.length} label(s) sent to printer.`,
    };
  return result;
}

export async function printProductLabel(
  product: {
    barcode?: string;
    id?: string;
    name?: string;
    sellingPrice?: number;
    quantity?: number;
  },
  copies = 1,
): Promise<{ success: boolean; message?: string; error?: string }> {
  const label: BarcodeLabel = {
    barcode: product.barcode ?? product.id ?? "UNKNOWN",
    productName: product.name ?? "Unnamed Product",
    price: product.sellingPrice,
  };
  if (copies <= 1) return printBarcodeLabel(label);
  return printBarcodeLabels(Array(copies).fill(label));
}

export async function printTestLabel(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  return printBarcodeLabel({
    barcode: "TEST123456",
    productName: "Test Label",
    price: 99.0,
  });
}

export async function printDiagnostic(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const commands =
    [
      `SIZE 75 mm, 40 mm`,
      `GAP 3 mm, 0 mm`,
      `DENSITY 10`,
      `SPEED 3`,
      `DIRECTION 0`,
      `CLS`,
      `TEXT 200,4,"2",0,1,1,"DIAGNOSTIC OK"`,
      `BARCODE 100,26,"128",60,1,0,2,2,"123456789"`,
      `TEXT 220,290,"2",0,1,1,"Rs. 99.00"`,
      `PRINT 1`,
    ].join("\r\n") + "\r\n";
  return sendRawCommands(commands);
}
