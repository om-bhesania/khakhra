import { Input } from "@/components/ui/input";
import { Scan } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type BarcodeScannerProps = {
  onScan: (barcode: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export const BarcodeScanner = ({ 
  onScan, 
  placeholder = "Scan barcode or enter product ID...",
  disabled = false 
}: BarcodeScannerProps) => {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanRef = useRef<string>("");

  // Auto-focus only when value clears (not on mount to avoid interfering)
  useEffect(() => {
    if (!disabled && value === "" && document.activeElement === inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [value, disabled]);

  const processScan = (scannedValue: string) => {
    const trimmed = scannedValue.trim();
    if (!trimmed) return;

    // Prevent duplicate scans within 500ms
    if (lastScanRef.current === trimmed && timeoutRef.current) {
      return;
    }

    console.log("📷 Barcode scanned:", trimmed);
    lastScanRef.current = trimmed;
    onScan(trimmed);
    setValue(""); // Clear after successful scan
    
    // Reset duplicate prevention after 500ms
    setTimeout(() => {
      lastScanRef.current = "";
    }, 500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a timeout to detect when scanning is complete
    // Most barcode scanners input all characters very quickly (< 50ms)
    // We wait 150ms to ensure all characters are captured
    timeoutRef.current = setTimeout(() => {
      if (newValue.trim()) {
        processScan(newValue);
      }
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Enter key press (common for barcode scanners and manual entry)
    if (e.key === "Enter") {
      e.preventDefault();
      
      // Clear the timeout as we're manually triggering
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (value.trim()) {
        processScan(value);
      }
    }
  };

  const handleBlur = () => {
    // Only re-focus if the input was previously focused
    // Don't auto-focus to avoid interfering with other inputs
    if (!disabled && document.activeElement !== inputRef.current) {
      // Don't auto re-focus on blur
      return;
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-10"
        autoComplete="off"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <Scan className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
};
