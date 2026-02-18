import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Printer, Cable, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const PrintServerManager = () => {
  const [serverRunning, setServerRunning] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [availablePorts, setAvailablePorts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPort, setSelectedPort] = useState<string>("");

  const PRINT_SERVER_URL = "http://localhost:3001";

  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${PRINT_SERVER_URL}/api/health`);
      const data = await response.json();
      setServerRunning(data.success);
      
      if (data.success) {
        const statusResponse = await fetch(`${PRINT_SERVER_URL}/api/printer/status`);
        const statusData = await statusResponse.json();
        setPrinterConnected(statusData.connected);
        if (statusData.port) {
          setSelectedPort(statusData.port);
        }
      }
    } catch (error) {
      setServerRunning(false);
      setPrinterConnected(false);
    }
  };

  const fetchPorts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${PRINT_SERVER_URL}/api/printer/ports`);
      const data = await response.json();
      
      if (data.success) {
        setAvailablePorts(data.ports);
        if (data.ports.length > 0 && !selectedPort) {
          setSelectedPort(data.ports[0].path);
        }
      } else {
        toast.error("Failed to list ports", { description: data.error });
      }
    } catch (error: any) {
      toast.error("Failed to connect to print server", {
        description: "Make sure the server is running",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedPort) {
      toast.error("Please select a printer port");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${PRINT_SERVER_URL}/api/printer/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portPath: selectedPort }),
      });

      const data = await response.json();

      if (data.success) {
        setPrinterConnected(true);
        toast.success("Printer connected successfully!");
      } else {
        toast.error("Connection failed", { description: data.error });
      }
    } catch (error: any) {
      toast.error("Connection error", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch(`${PRINT_SERVER_URL}/api/printer/disconnect`, {
        method: "POST",
      });
      const data = await response.json();
      
      if (data.success) {
        setPrinterConnected(false);
        toast.info("Printer disconnected");
      }
    } catch (error: any) {
      toast.error("Disconnect error", { description: error.message });
    }
  };

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!serverRunning) {
    return (
      <Card className="p-4 border-yellow-200 bg-yellow-50">
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-yellow-900">
              Print Server Not Running
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Start the print server to enable direct printing: <code className="bg-yellow-100 px-2 py-1 rounded">node printServer.js</code>
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${printerConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
            {printerConnected ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <Printer className="h-5 w-5 text-gray-600" />
            )}
          </div>
          
          <div>
            <h3 className="font-medium">
              {printerConnected ? 'Printer Connected' : 'Printer Not Connected'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {printerConnected 
                ? `Connected to ${selectedPort}` 
                : 'Connect to TVS LP-46 printer'}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={checkServerStatus}
          title="Refresh status"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {!printerConnected && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              disabled={isLoading}
            >
              {availablePorts.length === 0 ? (
                <option value="">No ports found</option>
              ) : (
                availablePorts.map((port) => (
                  <option key={port.path} value={port.path}>
                    {port.path} {port.manufacturer ? `- ${port.manufacturer}` : ""}
                  </option>
                ))
              )}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchPorts}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={handleConnect}
            disabled={isLoading || !selectedPort}
            className="w-full gap-2"
          >
            <Cable className="h-4 w-4" />
            {isLoading ? "Connecting..." : "Connect Printer"}
          </Button>
        </div>
      )}

      {printerConnected && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="w-full"
        >
          Disconnect
        </Button>
      )}
    </Card>
  );
};
