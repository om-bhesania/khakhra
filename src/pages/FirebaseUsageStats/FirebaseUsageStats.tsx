import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { getAuth } from "firebase/auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Database, RefreshCw, TrendingUp, AlertCircle } from "lucide-react";
import { DataTable } from "@/components/CustomTable";
import type { ColumnDef } from "@tanstack/react-table";

interface CrudUsageLog {
  id: string;
  operation: "CREATE" | "READ" | "UPDATE" | "DELETE";
  collection: string;
  userId: string;
  timestamp: any;
  createdAt: any;
}

interface DailyUsageStats {
  date: string;
  dateObj: Date;
  create: number;
  read: number;
  update: number;
  delete: number;
  total: number;
}

// Firebase Free Plan Limits (per day)
const FIREBASE_FREE_LIMITS = {
  reads: 50000,
  writes: 20000, // CREATE + UPDATE
  deletes: 20000,
} as const;

const FirebaseUsageStats = () => {
  const { readRootDocuments } = useFirestoreCRUD();
  const [loading, setLoading] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyUsageStats[]>([]);
  const [totalStats, setTotalStats] = useState({
    create: 0,
    read: 0,
    update: 0,
    delete: 0,
    total: 0,
  });
  const [todayStats, setTodayStats] = useState<DailyUsageStats | null>(null);
  const auth = getAuth();

  // Calculate percentage utilization
  const getUtilization = () => {
    if (!todayStats) {
      return {
        reads: 0,
        writes: 0,
        deletes: 0,
        readsCount: 0,
        writesCount: 0,
        deletesCount: 0,
      };
    }

    const reads = todayStats.read;
    const writes = todayStats.create + todayStats.update;
    const deletes = todayStats.delete;

    return {
      reads: (reads / FIREBASE_FREE_LIMITS.reads) * 100,
      writes: (writes / FIREBASE_FREE_LIMITS.writes) * 100,
      deletes: (deletes / FIREBASE_FREE_LIMITS.deletes) * 100,
      readsCount: reads,
      writesCount: writes,
      deletesCount: deletes,
    };
  };

  const utilization = getUtilization();

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-orange-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-orange-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        toast.error("Not authenticated.");
        return;
      }

      // Read CRUD usage logs
      // For now, we'll read from the logs collection
      // If it doesn't exist yet, we'll show empty state
      const logs = await readRootDocuments<CrudUsageLog>("crud_usage_logs", {
        orderBy: "createdAt",
        orderDirection: "desc",
        limit: 10000, // Get last 10000 logs
      });

      // Group by date
      const statsMap = new Map<string, DailyUsageStats>();

      logs.forEach((log) => {
        const getDate = (timestamp: any): Date => {
          if (!timestamp) return new Date();
          if (typeof timestamp.toDate === "function") {
            return timestamp.toDate();
          }
          if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000);
          }
          return new Date();
        };

        const date = getDate(log.createdAt || log.timestamp);
        const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

        if (!statsMap.has(dateKey)) {
          statsMap.set(dateKey, {
            date: dateKey,
            dateObj: date,
            create: 0,
            read: 0,
            update: 0,
            delete: 0,
            total: 0,
          });
        }

        const stats = statsMap.get(dateKey)!;
        const operationKey = log.operation.toLowerCase() as "create" | "read" | "update" | "delete";
        stats[operationKey] = (stats[operationKey] as number) + 1;
        stats.total += 1;
      });

      // Convert to array and sort by date (newest first)
      const statsArray = Array.from(statsMap.values()).sort(
        (a, b) => b.dateObj.getTime() - a.dateObj.getTime()
      );

      setDailyStats(statsArray);

      // Set today's stats for utilization calculation
      const today = new Date().toISOString().split("T")[0];
      const todayStat = statsArray.find((stat) => stat.date === today);
      setTodayStats(todayStat || null);

      // Calculate totals
      const totals = statsArray.reduce(
        (acc, day) => ({
          create: acc.create + day.create,
          read: acc.read + day.read,
          update: acc.update + day.update,
          delete: acc.delete + day.delete,
          total: acc.total + day.total,
        }),
        { create: 0, read: 0, update: 0, delete: 0, total: 0 }
      );

      setTotalStats(totals);

      if (logs.length === 0) {
        toast.info(
          "No usage logs found. CRUD operations will be tracked automatically."
        );
      } else {
        toast.success(`Loaded ${logs.length} usage logs`);
      }
    } catch (error: any) {
      console.error("Error fetching usage stats:", error);
      toast.error(error?.message || "Error fetching usage statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageStats();
  }, []);

  // Define columns for the table
  const columns: ColumnDef<DailyUsageStats, any>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const date = new Date(row.getValue("date"));
        return (
          <span>
            {date.toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        );
      },
    },
    {
      accessorKey: "create",
      header: "CREATE",
      cell: ({ row }) => (
        <span className="font-semibold text-green-600">
          {row.getValue("create")}
        </span>
      ),
    },
    {
      accessorKey: "read",
      header: "READ",
      cell: ({ row }) => (
        <span className="font-semibold text-blue-600">
          {row.getValue("read")}
        </span>
      ),
    },
    {
      accessorKey: "update",
      header: "UPDATE",
      cell: ({ row }) => (
        <span className="font-semibold text-yellow-600">
          {row.getValue("update")}
        </span>
      ),
    },
    {
      accessorKey: "delete",
      header: "DELETE",
      cell: ({ row }) => (
        <span className="font-semibold text-red-600">
          {row.getValue("delete")}
        </span>
      ),
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-bold text-primary">{row.getValue("total")}</span>
      ),
    },
  ];

  const csvData = dailyStats.map((stat) => ({
    Date: stat.date,
    CREATE: stat.create,
    READ: stat.read,
    UPDATE: stat.update,
    DELETE: stat.delete,
    Total: stat.total,
  }));

  const csvHeader = ["Date", "CREATE", "READ", "UPDATE", "DELETE", "Total"];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Firebase CRUD Usage Statistics
          </h1>
          <p className="text-muted-foreground mt-2">
            Track and monitor Firebase CRUD operations per day
          </p>
        </div>
        <Button onClick={fetchUsageStats} disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

       {/* Firebase Free Plan Utilization */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Firebase Free Plan Utilization (Today)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Reads */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Reads</span>
              <span className={getUsageColor(utilization.reads)}>
                {utilization.readsCount.toLocaleString()} / {FIREBASE_FREE_LIMITS.reads.toLocaleString()} ({utilization.reads.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${getProgressBarColor(utilization.reads)}`}
                style={{ width: `${Math.min(utilization.reads, 100)}%` }}
              />
            </div>
          </div>

          {/* Writes (CREATE + UPDATE) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Writes (CREATE + UPDATE)</span>
              <span className={getUsageColor(utilization.writes)}>
                {utilization.writesCount.toLocaleString()} / {FIREBASE_FREE_LIMITS.writes.toLocaleString()} ({utilization.writes.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${getProgressBarColor(utilization.writes)}`}
                style={{ width: `${Math.min(utilization.writes, 100)}%` }}
              />
            </div>
          </div>

          {/* Deletes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Deletes</span>
              <span className={getUsageColor(utilization.deletes)}>
                {utilization.deletesCount.toLocaleString()} / {FIREBASE_FREE_LIMITS.deletes.toLocaleString()} ({utilization.deletes.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${getProgressBarColor(utilization.deletes)}`}
                style={{ width: `${Math.min(utilization.deletes, 100)}%` }}
              />
            </div>
          </div>

          {todayStats === null && (
            <p className="text-xs text-muted-foreground mt-2">
              No activity today. Utilization will be shown once operations are performed.
            </p>
          )}
        </CardContent>
      </Card>

       {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total CREATE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalStats.create.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total READ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalStats.read.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total UPDATE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {totalStats.update.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total DELETE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalStats.delete.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {totalStats.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Daily CRUD Usage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyStats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                No Usage Data Available
              </p>
              <p className="text-sm">
                CRUD operations will be automatically logged and appear here.
              </p>
              <p className="text-xs mt-2">
                Start using the application to see usage statistics.
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={dailyStats}
              loading={loading}
              csvData={csvData}
              csvHeader={csvHeader}
              csvFileName="firebase_crud_usage_stats.csv"
            />
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">About CRUD Usage Tracking</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            This page displays Firebase CRUD operations tracked automatically.
            Each CREATE, READ, UPDATE, and DELETE operation is logged with a
            timestamp.
          </p>
          <p>
            Data is grouped by day and shows the total number of each operation
            type performed.
          </p>
          <p className="text-xs mt-4 font-medium">
            Note: Usage tracking starts automatically when you use CRUD
            operations in the application.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FirebaseUsageStats;
