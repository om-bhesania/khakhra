import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth, db, resetPassword } from "@/config/firebase.config";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  Building,
  Clock,
  Download,
  HardDrive,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Save,
  Shield,
  Upload,
  User
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const Settings = () => {
  const {
    readDocuments,
    readDocById,
    addDocument,
    updateDocument,
    deleteDocument,
    loading,
  } = useFirestoreCRUD();
  const [activeSection, setActiveSection] = useState("account");
  interface UserData {
    id: string;
    email: string;
    displayName: string;
    avatar: string;
    gstNumber: string;
    businessName: string;
    phone: string;
    createdAt: Date;
    updatedAt: Date;
  }

  const [userData, setUserData] = useState<UserData | null>(null);
  const [backupLogs, setBackupLogs] = useState([]);

  // Account states
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // Business profile states
  const [profileData, setProfileData] = useState({
    displayName: "",
    phone: "",
    gstNumber: "",
    businessName: "",
  });

  // Backup states
  const [backupProgress, setBackupProgress] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [restoreMode, setRestoreMode] = useState("replace");
  const [restoreFile, setRestoreFile] = useState<any>(null);

  const currentUser: any = auth.currentUser;

  // Fetch user data and backup logs on mount
  useEffect(() => {
    if (currentUser) {
      fetchUserData();
      fetchBackupLogs();
    }
  }, [currentUser]);

  const showAlert = (
    type: "success" | "error" | "info" | "warning",
    message: string
  ) => {
    switch (type) {
      case "success":
        toast.success(message);
        break;
      case "error":
        toast.error(message);
        break;
      case "warning":
        toast.warning(message);
        break;
      case "info":
      default:
        toast.info(message);
        break;
    }
  };

  // Fetch or create userData
  // Fetch or create userData
  const fetchUserData = async () => {
    try {
      // Use userId as document ID directly - no auto-generated IDs
      const userDocRef = doc(
        db,
        `users/${currentUser.uid}/userData`,
        currentUser.uid
      );
      const userDocSnap = await getDoc(userDocRef);

      let userDoc;

      if (!userDocSnap.exists()) {
        // Create userData if doesn't exist - using setDoc with specific ID
        const newUserData = {
          email: currentUser.email,
          displayName: currentUser.displayName || "",
          avatar: currentUser.photoURL || "",
          gstNumber: "",
          businessName: "",
          phone: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await setDoc(userDocRef, newUserData);
        userDoc = { id: currentUser.uid, ...newUserData };
      } else {
        const data = userDocSnap.data();
        userDoc = {
          id: userDocSnap.id,
          email: data.email || "",
          displayName: data.displayName || "",
          avatar: data.avatar || "",
          gstNumber: data.gstNumber || "",
          businessName: data.businessName || "",
          phone: data.phone || "",
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date(),
        };
      }

      setUserData(userDoc);

      // Prefill form with existing data
      setProfileData({
        displayName: userDoc.displayName || "",
        phone: userDoc.phone || "",
        gstNumber: userDoc.gstNumber || "",
        businessName: userDoc.businessName || "",
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      showAlert("error", "Failed to load user data");
    }
  };

  // Fetch backup logs
  const fetchBackupLogs = async () => {
    try {
      const logs: any = await readDocuments("backupLogs", {
        orderBy: "createdAt",
        orderDirection: "desc",
        limit: 3,
      });
      setBackupLogs(logs || []);
    } catch (error) {
      console.error("Error fetching backup logs:", error);
    }
  };

  // Reauthenticate user
  const reauthenticate = async (password: any) => {
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      password
    );
    await reauthenticateWithCredential(currentUser, credential);
  };

  // Handle email update
  const handleEmailUpdate = async () => {
    if (!newEmail || !currentPassword) {
      showAlert("error", "Please fill in all fields");
      return;
    }

    try {
      await reauthenticate(currentPassword);
      await updateEmail(currentUser, newEmail);

      await updateDocument("userData", currentUser.uid, { email: newEmail });

      showAlert(
        "success",
        "Email updated successfully! Please verify your new email."
      );
      setShowEmailDialog(false);
      setNewEmail("");
      setCurrentPassword("");
      fetchUserData();
    } catch (error: any) {
      showAlert("error", error.message || "Failed to update email");
    }
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!currentPassword) {
      showAlert("error", "Please enter your current password");
      return;
    }

    try {
      await reauthenticate(currentPassword);
      await resetPassword(currentUser.email);

      showAlert("success", "Password reset email sent! Check your inbox.");
      setShowPasswordDialog(false);
      setCurrentPassword("");
    } catch (error: any) {
      showAlert("error", error.message || "Failed to send reset email");
    }
  };

  // Handle profile update
  const handleProfileUpdate = async () => {
    try {
      await updateDocument("userData", currentUser.uid, profileData);

      if (profileData.displayName !== currentUser.displayName) {
        await updateProfile(currentUser, {
          displayName: profileData.displayName,
        });
      }

      showAlert("success", "Profile updated successfully!");
      fetchUserData();
    } catch (error) {
      showAlert("error", "Failed to update profile");
    }
  };

  // Create backup
  const createBackup = async (saveToCloud = false) => {
    setBackupProgress(true);
    const startTime = Date.now();

    try {
      // Fetch all collections
      const bills = await readDocuments("bills", { limit: 10000 });
      const inventory = await readDocuments("inventory", { limit: 10000 });
      const customers = await readDocuments("customers", { limit: 10000 });
      const paymentModes = await readDocuments("paymentModes", {
        limit: 10000,
      });

      // Custom replacer to properly serialize Firestore Timestamps
      const timestampReplacer = (key: string, value: any) => {
        // Handle Firestore Timestamp objects
        if (value && typeof value === 'object') {
          // Check if it's a Firestore Timestamp (has toDate method or seconds/nanoseconds)
          if (value.seconds !== undefined && value.nanoseconds !== undefined) {
            // Already in serializable format, return as-is
            return value;
          }
          // Check if it has toDate method (Firestore Timestamp)
          if (typeof value.toDate === 'function') {
            return {
              seconds: Math.floor(value.toDate().getTime() / 1000),
              nanoseconds: (value.toDate().getTime() % 1000) * 1000000,
            };
          }
        }
        return value;
      };

      const backupData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        userId: currentUser.uid,
        collections: {
          bills: bills || [],
          inventory: inventory || [],
          customers: customers || [],
          paymentModes: paymentModes || [],
        },
        metadata: {
          billsCount: bills?.length || 0,
          inventoryCount: inventory?.length || 0,
          customersCount: customers?.length || 0,
          paymentModesCount: paymentModes?.length || 0,
        },
      };

      const backupJson = JSON.stringify(backupData, timestampReplacer, 2);
      const backupBlob = new Blob([backupJson], { type: "application/json" });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      // Download to device
      const fileName = `backup_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`;
      const url = URL.createObjectURL(backupBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      // Save to cloud (Firestore collection instead of Storage for simplicity)
      if (saveToCloud) {
        await addDocument("cloudBackups", {
          userId: currentUser.uid,
          fileName,
          data: backupData,
          size: (backupBlob.size / 1024).toFixed(2) + " KB",
        });

        // Keep only last 3 cloud backups
        const allCloudBackups = await readDocuments("cloudBackups", {
          where: [{ field: "userId", operator: "==", value: currentUser.uid }],
          orderBy: "createdAt",
          orderDirection: "desc",
          limit: 10,
        });

        if (allCloudBackups.length > 3) {
          for (let i = 3; i < allCloudBackups.length; i++) {
            await deleteDocument("cloudBackups", allCloudBackups[i].id);
          }
        }
      }

      // Log backup
      await addDocument("backupLogs", {
        userId: currentUser.uid,
        fileName,
        size: (backupBlob.size / 1024).toFixed(2) + " KB",
        duration: duration + "s",
        collections: backupData.metadata,
        savedToCloud: saveToCloud,
      });

      showAlert("success", `Backup created successfully! (${duration}s)`);
      fetchBackupLogs();
    } catch (error) {
      console.error("Backup error:", error);
      showAlert("error", "Failed to create backup");
    } finally {
      setBackupProgress(false);
    }
  };

  // Handle restore
  // Handle restore
  const handleRestore = async () => {
    if (!restoreFile) {
      showAlert("error", "Please select a backup file");
      return;
    }

    setBackupProgress(true);

    try {
      // Create safety backup first (auto-saved to cloud)
      showAlert("info", "Creating safety backup...");
      const bills = await readDocuments("bills", { limit: 10000 });
      const inventory = await readDocuments("inventory", { limit: 10000 });
      const customers = await readDocuments("customers", { limit: 10000 });
      const paymentModes = await readDocuments("paymentModes", {
        limit: 10000,
      });

      await addDocument("safetyBackups", {
        userId: currentUser.uid,
        fileName: `safety_backup_${new Date()
          .toISOString()
          .replace(/[:.]/g, "-")}.json`,
        data: {
          bills: bills || [],
          inventory: inventory || [],
          customers: customers || [],
          paymentModes: paymentModes || [],
        },
        note: "Auto-created before restore",
      });

      showAlert("info", "Safety backup created. Restoring data...");

      // Read and parse backup file
      const fileContent = await restoreFile.text();
      const backupData = JSON.parse(fileContent);

      // Validate backup structure
      if (!backupData.collections) {
        throw new Error("Invalid backup file format");
      }

      // Restore collections
      const collections = backupData.collections;
      let restoredCount = 0;
      let skippedCount = 0;

      for (const [collectionName, items] of Object.entries(collections)) {
        if (!Array.isArray(items)) continue;

        for (const item of items) {
          try {
            // Helper function to convert timestamp objects to Firestore Timestamps
            const convertTimestamp = (ts: any) => {
              if (!ts) return null;
              // If it's already a Timestamp object (from Firestore), return as-is
              if (ts.seconds !== undefined && ts.nanoseconds !== undefined) {
                return { seconds: ts.seconds, nanoseconds: ts.nanoseconds || 0 };
              }
              // If it's a date string or number, convert it
              if (typeof ts === 'string' || typeof ts === 'number') {
                const date = new Date(ts);
                return { 
                  seconds: Math.floor(date.getTime() / 1000), 
                  nanoseconds: (date.getTime() % 1000) * 1000000 
                };
              }
              return null;
            };

            if (restoreMode === "merge") {
              // Merge mode - add only if not exists
              const existing = await readDocById(collectionName, item.id);
              if (!existing) {
                // Remove id from item before adding (Firestore will create new one)
                // But preserve createdAt and updatedAt timestamps
                const { id, ...itemData } = item;
                
                // Convert timestamps if they exist
                if (itemData.createdAt) {
                  itemData.createdAt = convertTimestamp(itemData.createdAt);
                }
                if (itemData.updatedAt) {
                  itemData.updatedAt = convertTimestamp(itemData.updatedAt);
                }
                
                await addDocument(collectionName, itemData);
                restoredCount++;
              } else {
                skippedCount++;
              }
            } else {
              // Replace mode - update if exists, add if not
              const existing = await readDocById(collectionName, item.id);
              if (existing) {
                // Preserve createdAt and updatedAt from backup when updating
                const { id, ...itemData } = item;
                
                // Convert timestamps if they exist
                if (itemData.createdAt) {
                  itemData.createdAt = convertTimestamp(itemData.createdAt);
                }
                if (itemData.updatedAt) {
                  itemData.updatedAt = convertTimestamp(itemData.updatedAt);
                }
                
                await updateDocument(collectionName, item.id, itemData);
                restoredCount++;
              } else {
                // Remove id but preserve createdAt and updatedAt
                const { id, ...itemData } = item;
                
                // Convert timestamps if they exist
                if (itemData.createdAt) {
                  itemData.createdAt = convertTimestamp(itemData.createdAt);
                }
                if (itemData.updatedAt) {
                  itemData.updatedAt = convertTimestamp(itemData.updatedAt);
                }
                
                await addDocument(collectionName, itemData);
                restoredCount++;
              }
            }
          } catch (err) {
            console.error(`Failed to restore item ${item.id}:`, err);
          }
        }
      }

      const message =
        restoreMode === "merge"
          ? `Restored ${restoredCount} new items (${skippedCount} already existed)`
          : `Restored ${restoredCount} items successfully`;

      showAlert("success", message);
      setRestoreDialog(false);
      setRestoreFile(null);
      setRestoreMode("replace");
    } catch (error) {
      console.error("Restore error:", error);
      showAlert("error", "Failed to restore backup. Check file format.");
    } finally {
      setBackupProgress(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return date.toLocaleString();
  };

  const sections = [
    { id: "account", label: "Account", icon: User },
    { id: "backup", label: "Backup & Restore", icon: HardDrive },
    { id: "profile", label: "Business Profile", icon: Building },
  ];

  if (loading && !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Settings</h1> 
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          activeSection === section.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{section.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3 space-y-6">
            {/* Account Section */}
            {activeSection === "account" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Settings
                    </CardTitle>
                    <CardDescription>Manage your email address</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Current Email</Label>
                      <Input
                        value={currentUser?.email || ""}
                        disabled
                        className="mt-2"
                      />
                    </div>
                    <Button onClick={() => setShowEmailDialog(true)}>
                      Update Email
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      Password Settings
                    </CardTitle>
                    <CardDescription>Reset your password</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => setShowPasswordDialog(true)}>
                      Send Password Reset Email
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Backup Section */}
            {activeSection === "backup" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Create Backup
                    </CardTitle>
                    <CardDescription>
                      Save your data to device or cloud
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-3">
                      <Button
                        onClick={() => createBackup(false)}
                        disabled={backupProgress}
                        className="flex-1"
                      >
                        {backupProgress ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Download to Device
                      </Button>
                      <Button
                        onClick={() => createBackup(true)}
                        disabled={backupProgress}
                        variant="secondary"
                        className="flex-1"
                      >
                        {backupProgress ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Shield className="mr-2 h-4 w-4" />
                        )}
                        Save to Cloud
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Recent Backups
                    </CardTitle>
                    <CardDescription>Last 3 backups</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {backupLogs.length > 0 ? (
                      <div className="space-y-3">
                        {backupLogs.map((log: any, index: any) => (
                          <div
                            key={log.id || index}
                            className="p-4 border rounded-lg hover:bg-muted transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <p className="font-medium text-sm">
                                  {log.fileName}
                                </p>
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  <span>📅 {formatDate(log.createdAt)}</span>
                                  <span>💾 {log.size}</span>
                                  <span>⏱️ {log.duration}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {log.collections?.billsCount || 0} bills •{" "}
                                  {log.collections?.customersCount || 0}{" "}
                                  customers •{" "}
                                  {log.collections?.inventoryCount || 0} items
                                </div>
                              </div>
                              {log.savedToCloud && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full dark:bg-blue-900 dark:text-blue-300">
                                  Cloud
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No backups yet
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Restore Backup
                    </CardTitle>
                    <CardDescription>
                      Upload a backup file to restore your data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => setRestoreDialog(true)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Restore from File
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Business Profile Section */}
            {activeSection === "profile" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                  <CardDescription>
                    Update your business details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={profileData.displayName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          displayName: e.target.value,
                        })
                      }
                      placeholder="Your name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={profileData.businessName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          businessName: e.target.value,
                        })
                      }
                      placeholder="Your business name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          phone: e.target.value,
                        })
                      }
                      placeholder="+91 1234567890"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input
                      id="gstNumber"
                      value={profileData.gstNumber}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          gstNumber: e.target.value,
                        })
                      }
                      placeholder="22AAAAA0000A1Z5"
                    />
                  </div>

                  <Button onClick={handleProfileUpdate} disabled={loading}>
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Email Update Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Email Address</DialogTitle>
            <DialogDescription>
              Enter your current password and new email address
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="newemail@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPasswordEmail">Current Password</Label>
              <Input
                id="currentPasswordEmail"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailUpdate}>Update Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your current password to verify your identity
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPasswordReset">Current Password</Label>
              <Input
                id="currentPasswordReset"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              We'll send a password reset link to:{" "}
              <strong>{currentUser?.email}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handlePasswordReset}>Send Reset Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialog} onOpenChange={setRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Backup</DialogTitle>
            <DialogDescription>
              Choose how to restore your data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="backupFile">Select Backup File</Label>
              <Input
                id="backupFile"
                type="file"
                accept=".json"
                onChange={(e) => setRestoreFile(e.target.files?.[0])}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restoreMode">Restore Mode</Label>
              <Select value={restoreMode} onValueChange={setRestoreMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="replace">Replace All Data</SelectItem>
                  <SelectItem value="merge">Keep Existing & Add New</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {restoreMode === "replace"
                  ? "Removes current data and restores from backup"
                  : "Keeps your data and adds items from backup"}
              </p>
            </div>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                A safety backup will be created automatically before restore
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRestore}
              disabled={backupProgress || !restoreFile}
            >
              {backupProgress ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Restore Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
