/**
 * Printer Connection Manager Component
 * 
 * This component allows users to connect/disconnect their USB printer
 * and shows the connection status.
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  autoReconnectPrinter,
  connectToPrinter,
  disconnectFromPrinter,
  isWebSerialSupported,
  printTestLabel
} from "@/lib/browserPrintService";
import { Cable, CheckCircle, Printer, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const PrinterConnectionManager = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    console.log("🔌 PrinterConnectionManager mounted");
    
    // Check if Web Serial API is supported
    const supported = isWebSerialSupported();
    console.log("🌐 Web Serial API supported:", supported);
    setSupported(supported);
    
    // Try to auto-reconnect on mount
    if (supported) {
      console.log("🔄 Attempting auto-reconnect...");
      autoReconnectPrinter().then((result) => {
        console.log("🔄 Auto-reconnect result:", result);
        if (result.success) {
          setIsConnected(true);
          toast.success('Reconnected to printer');
        }
      });
    }
  }, []);

  const handleConnect = async () => {
    console.log("🔌 Connect button clicked");
    setIsConnecting(true);
    try {
      console.log("📞 Calling connectToPrinter...");
      const result = await connectToPrinter();
      console.log("📞 Connection result:", result);
      
      if (result.success) {
        setIsConnected(true);
        console.log("✅ Printer connected successfully");
        toast.success('Printer connected successfully!');
      } else {
        console.error("❌ Connection failed:", result.message);
        toast.error('Failed to connect', {
          description: result.message,
        });
      }
    } catch (error: any) {
      console.error("❌ Connection error:", error);
      toast.error('Connection failed', {
        description: error.message,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectFromPrinter();
    setIsConnected(false);
    toast.info('Printer disconnected');
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    try {
      const result = await printTestLabel();
      
      if (result.success) {
        toast.success('Test label sent to printer!');
      } else {
        toast.error('Test print failed', {
          description: result.error,
        });
      }
    } catch (error: any) {
      toast.error('Test failed', {
        description: error.message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!supported) {
    return (
      <Card className="p-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-yellow-900 dark:text-yellow-100">
              Browser Not Supported
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Web Serial API is not supported in your browser. Please use Chrome, Edge, or Opera.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
            {isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <Printer className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </div>
          
          <div>
            <h3 className="font-medium">
              {isConnected ? 'Printer Connected' : 'Printer Not Connected'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isConnected 
                ? 'TVS LP-46 DLite Plus - Ready to print' 
                : 'Connect your USB printer to start printing'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestPrint}
                disabled={isTesting}
              >
                {isTesting ? 'Testing...' : 'Test Print'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="gap-2"
            >
              {isConnecting ? (
                'Connecting...'
              ) : (
                <>
                  <Cable className="h-4 w-4" />
                  Connect Printer
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {isConnected && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Tip: Your printer will stay connected until you close this tab or disconnect manually.
          </p>
        </div>
      )}
    </Card>
  );
};
