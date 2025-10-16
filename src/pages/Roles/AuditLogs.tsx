import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import type { AuditLog } from "@/types/rbac";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

function AuditLogs() {
  const { readDocuments } = useFirestoreCRUD();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      // Get logs from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const logsData = await readDocuments<AuditLog>("auditLogs", {
        where: [
          {
            field: "timestamp",
            operator: ">=",
            value: thirtyDaysAgo,
          },
        ],
        orderBy: "timestamp",
        orderDirection: "desc",
      });

      setLogs(logsData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading audit logs:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>
            View role and permission changes from the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(log.timestamp.toDate(), "MMM dd, yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell>{log.action.replace(/_/g, " ")}</TableCell>
                  <TableCell>{log.performerRole}</TableCell>
                  <TableCell>{log.targetRole}</TableCell>
                  <TableCell className="max-w-md overflow-hidden text-ellipsis">
                    {JSON.stringify(log.changes)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
