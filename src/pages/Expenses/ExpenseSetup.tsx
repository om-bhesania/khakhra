import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { seedExpenseCategories } from "@/scripts/seedExpenseCategories";
import { addMonthKeyToBills } from "@/scripts/addMonthKeyToBills";
import { populateRevenueFromBills } from "@/scripts/populateRevenueFromBills";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Setup component for one-time initialization tasks
 * Place this temporarily in Settings or a hidden route
 */
const ExpenseSetup = () => {
  const [isSeedingCategories, setIsSeedingCategories] = useState(false);
  const [categoriesSeeded, setCategoriesSeeded] = useState(false);
  const [isMigratingBills, setIsMigratingBills] = useState(false);
  const [billsMigrated, setBillsMigrated] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string>("");
  const [isPopulatingRevenue, setIsPopulatingRevenue] = useState(false);
  const [revenuePopulated, setRevenuePopulated] = useState(false);
  const [revenueResult, setRevenueResult] = useState<string>("");

  const handleSeedCategories = async () => {
    setIsSeedingCategories(true);
    try {
      await seedExpenseCategories();
      setCategoriesSeeded(true);
      toast.success("Expense categories seeded successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to seed categories");
    } finally {
      setIsSeedingCategories(false);
    }
  };

  const handleMigrateBills = async () => {
    setIsMigratingBills(true);
    try {
      const result = await addMonthKeyToBills();
      if (result.success) {
        setBillsMigrated(true);
        setMigrationResult(`Successfully migrated ${result.count} bills`);
        toast.success(result.message);
      } else {
        toast.error(result.message);
        setMigrationResult(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to migrate bills");
      setMigrationResult("Migration failed");
    } finally {
      setIsMigratingBills(false);
    }
  };

  const handlePopulateRevenue = async () => {
    setIsPopulatingRevenue(true);
    try {
      const result = await populateRevenueFromBills();
      if (result.success) {
        setRevenuePopulated(true);
        setRevenueResult(`Successfully populated revenue for ${result.count} months`);
        toast.success(result.message);
      } else {
        toast.error(result.message);
        setRevenueResult(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to populate revenue");
      setRevenueResult("Population failed");
    } finally {
      setIsPopulatingRevenue(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Expense Module Setup
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          One-time initialization for expense tracking
        </p>
      </div>

      <div className="space-y-4">
        {/* Seed Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {categoriesSeeded ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
              Seed Expense Categories
            </CardTitle>
            <CardDescription>
              Add default expense categories (Rent, Utilities, Salaries, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSeedCategories}
              disabled={isSeedingCategories || categoriesSeeded}
              className="w-full md:w-auto"
            >
              {isSeedingCategories ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Seeding Categories...
                </>
              ) : categoriesSeeded ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Categories Seeded
                </>
              ) : (
                "Seed Categories"
              )}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              This will add 22 common expense categories to your account.
              You can add more categories later from the expense form.
            </p>
          </CardContent>
        </Card>

        {/* Migrate Bills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {billsMigrated ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
              Add monthKey to Existing Bills
            </CardTitle>
            <CardDescription>
              Optimize existing billing data for faster queries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleMigrateBills}
              disabled={isMigratingBills || billsMigrated}
              variant={billsMigrated ? "outline" : "default"}
              className="w-full md:w-auto"
            >
              {isMigratingBills ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrating Bills...
                </>
              ) : billsMigrated ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Migration Complete
                </>
              ) : (
                "Migrate Bills"
              )}
            </Button>
            {migrationResult && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {migrationResult}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              This adds a monthKey field to all existing bills for optimized
              monthly queries. Safe to run multiple times.
            </p>
          </CardContent>
        </Card>

        {/* Populate Revenue from Bills */}
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {revenuePopulated ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
              Populate Revenue from Existing Bills
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              <strong>⚡ Run this to see your existing bills in expense dashboard!</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handlePopulateRevenue}
              disabled={isPopulatingRevenue || revenuePopulated}
              variant={revenuePopulated ? "outline" : "default"}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
            >
              {isPopulatingRevenue ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Populating Revenue...
                </>
              ) : revenuePopulated ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Revenue Populated
                </>
              ) : (
                "Populate Revenue Now"
              )}
            </Button>
            {revenueResult && (
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-2 font-semibold">
                ✅ {revenueResult}
              </p>
            )}
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
              This reads all existing bills and creates monthly revenue totals in financeStats.
              After running this, your expense dashboard will show profit/loss from all bills!
            </p>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              ℹ️ Setup Instructions
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>1. Click "Seed Categories" to add default expense categories</li>
              <li>2. Click "Migrate Bills" to optimize existing billing data</li>
              <li>3. <strong>Click "Populate Revenue" to see existing bills in dashboard</strong></li>
              <li>4. Once complete, go to Expenses → Dashboard to see your profit/loss</li>
              <li>5. New bills will automatically update revenue going forward</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExpenseSetup;
