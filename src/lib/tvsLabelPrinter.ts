/**
 * usePrinter — Web Serial API hook for TVS LP-46 DLite Plus
 *
 * Usage:
 *   const { connect, disconnect, print, isConnected, isConnecting, isPrinting, error } = usePrinter();
 *
 * Requirements:
 *   - Chrome 89+ or Edge 89+
 *   - Must be served over HTTPS (or localhost)
 *   - connect() must be triggered by a user gesture (button click)
 */

import { useState, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BarcodeLabel {
  barcode: string;
  productName: string;
  price?: number;
  additionalInfo?: string;
}

export interface PrinterConfig {
  width: number; // Label width in mm
  height: number; // Label height in mm
  gap: number; // Gap between labels in mm
  density: number; // Print density (0–15)
  speed: number; // Print speed (1–15)
  baudRate: number;
}

export type PrinterStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "printing"
  | "error";

export interface UsePrinterReturn {
  status: PrinterStatus;
  isConnected: boolean;
  isConnecting: boolean;
  isPrinting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  print: (
    label: BarcodeLabel,
    config?: Partial<PrinterConfig>,
  ) => Promise<void>;
  printBatch: (
    labels: BarcodeLabel[],
    config?: Partial<PrinterConfig>,
  ) => Promise<void>;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: PrinterConfig = {
  width: 50,
  height: 25,
  gap: 5,
  density: 10,
  speed: 3,
  baudRate: 9600,
};

// ─── TSPL Generation ─────────────────────────────────────────────────────────

function buildLabelCommands(
  label: BarcodeLabel,
  config: PrinterConfig,
  includeSetup: boolean,
): string[] {
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

  // Dots per mm for 203dpi printers (8 dots/mm)
  const dpm = 8;
  const labelWidthDots = width * dpm; // e.g. 400 dots for 50mm
  const labelHeightDots = height * dpm; // e.g. 200 dots for 25mm

  // ── Product name (top, centered) ──────────────────────────────
  const nameText = productName.substring(0, 18).toUpperCase();
  // Font "1" is ~8 dots wide per char; estimate center offset
  const nameWidthEstimate = nameText.length * 8;
  const nameX = Math.max(
    4,
    Math.floor((labelWidthDots - nameWidthEstimate) / 2),
  );
  cmds.push(`TEXT ${nameX},4,"1",0,1,1,"${nameText}"`);

  // ── Barcode (middle, centered) ────────────────────────────────
  // Barcode height: leave ~16 dots top (name + margin) and ~20 dots bottom (price + margin)
  const barcodeY = 16;
  const barcodeHeight =
    labelHeightDots - barcodeY - (price !== undefined ? 22 : 8);
  // CODE128, narrow bar = 2 dots, wide bar = 2 dots
  const barcodeWidthEstimate = barcode.length * 11 * 2; // rough estimate
  const barcodeX = Math.max(
    4,
    Math.floor((labelWidthDots - barcodeWidthEstimate) / 2),
  );
  cmds.push(
    `BARCODE ${barcodeX},${barcodeY},"128",${Math.max(30, barcodeHeight)},1,0,2,2,"${barcode}"`,
  );

  // ── Price (bottom, centered) ──────────────────────────────────
  if (price !== undefined && price !== null) {
    const priceNum = typeof price === "number" ? price : parseFloat(price) || 0;
    const priceText = `Rs ${priceNum.toFixed(2)}`;
    const priceWidthEstimate = priceText.length * 8;
    const priceX = Math.max(
      4,
      Math.floor((labelWidthDots - priceWidthEstimate) / 2),
    );
    const priceY = labelHeightDots - 18;
    cmds.push(`TEXT ${priceX},${priceY},"1",0,1,1,"${priceText}"`);
  }

  cmds.push(`PRINT 1`);

  return cmds;
}

function generateTSPL(label: BarcodeLabel, config: PrinterConfig): string {
  return buildLabelCommands(label, config, true).join("\r\n") + "\r\n";
}

function generateBatchTSPL(
  labels: BarcodeLabel[],
  config: PrinterConfig,
): string {
  const lines: string[] = [];
  labels.forEach((label, i) => {
    // Only send setup commands once
    const cmds = buildLabelCommands(label, config, i === 0);
    lines.push(...cmds);
  });
  return lines.join("\r\n") + "\r\n";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function usePrinter(): UsePrinterReturn {
  const [status, setStatus] = useState<PrinterStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);

  const portRef = useRef<any | null>(null);

  // ── Helpers ───────────────────────────────────────────────────

  const clearError = () => setError(null);

  const writeToPort = useCallback(async (data: string): Promise<void> => {
    const port = portRef.current;
    if (!port || !port.writable) {
      throw new Error("Printer port is not open or not writable.");
    }

    const writer = port.writable.getWriter();
    try {
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(data));
    } finally {
      // Always release the lock so future writes can proceed
      writer.releaseLock();
    }
  }, []);

  // ── connect ───────────────────────────────────────────────────

  const connect = useCallback(async (): Promise<void> => {
    clearError();

    if (!("serial" in navigator)) {
      const msg =
        "Web Serial API is not supported in this browser. Please use Chrome 89+ or Edge 89+.";
      setError(msg);
      setStatus("error");
      return;
    }

    try {
      setStatus("connecting");

      // Prompt the user to select the printer port
      const port = await (navigator as any).serial.requestPort();

      await port.open({ baudRate: DEFAULT_CONFIG.baudRate });

      portRef.current = port;
      setStatus("connected");
    } catch (err: any) {
      // User cancelled the port picker — don't treat as hard error
      if (
        err?.name === "NotFoundError" ||
        err?.message?.includes("No port selected")
      ) {
        setStatus("disconnected");
        return;
      }
      const msg = `Failed to connect: ${err?.message ?? String(err)}`;
      setError(msg);
      setStatus("error");
    }
  }, []);

  // ── disconnect ────────────────────────────────────────────────

  const disconnect = useCallback(async (): Promise<void> => {
    const port = portRef.current;
    if (!port) return;

    try {
      await port.close();
    } catch {
      // Ignore close errors
    } finally {
      portRef.current = null;
      setStatus("disconnected");
      clearError();
    }
  }, []);

  // ── print (single label) ──────────────────────────────────────

  const print = useCallback(
    async (
      label: BarcodeLabel,
      configOverride?: Partial<PrinterConfig>,
    ): Promise<void> => {
      if (status !== "connected") {
        setError("Printer is not connected. Call connect() first.");
        return;
      }

      const config = { ...DEFAULT_CONFIG, ...configOverride };

      clearError();
      setStatus("printing");

      try {
        const tspl = generateTSPL(label, config);
        await writeToPort(tspl);
        setStatus("connected");
      } catch (err: any) {
        const msg = `Print failed: ${err?.message ?? String(err)}`;
        setError(msg);
        setStatus("error");
      }
    },
    [status, writeToPort],
  );

  // ── printBatch ────────────────────────────────────────────────

  const printBatch = useCallback(
    async (
      labels: BarcodeLabel[],
      configOverride?: Partial<PrinterConfig>,
    ): Promise<void> => {
      if (status !== "connected") {
        setError("Printer is not connected. Call connect() first.");
        return;
      }

      if (labels.length === 0) return;

      const config = { ...DEFAULT_CONFIG, ...configOverride };

      clearError();
      setStatus("printing");

      try {
        const tspl = generateBatchTSPL(labels, config);
        await writeToPort(tspl);
        setStatus("connected");
      } catch (err: any) {
        const msg = `Batch print failed: ${err?.message ?? String(err)}`;
        setError(msg);
        setStatus("error");
      }
    },
    [status, writeToPort],
  );

  // ── Return ────────────────────────────────────────────────────

  return {
    status,
    isConnected: status === "connected" || status === "printing",
    isConnecting: status === "connecting",
    isPrinting: status === "printing",
    error,
    connect,
    disconnect,
    print,
    printBatch,
  };
}
