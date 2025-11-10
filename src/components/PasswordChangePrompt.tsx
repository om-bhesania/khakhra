import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { useRBAC } from "@/wrappers/RBACProvider";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function PasswordChangePrompt() {
  const { user } = useRBAC();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);

  useEffect(() => {
    // Show prompt once after user logs in (only if they haven't been prompted in this session)
    if (user && !hasPrompted) {
      // Check localStorage to see if user has been prompted today
      const lastPromptDate = localStorage.getItem("passwordChangePromptDate");
      const today = new Date().toDateString();
      
      // Only show prompt once per day
      if (lastPromptDate !== today) {
        // Small delay to ensure UI is ready
        setTimeout(() => {
          setShowPrompt(true);
          setHasPrompted(true);
        }, 1000);
      }
    }
  }, [user, hasPrompted]);

  const handlePromptYes = () => {
    setShowPrompt(false);
    setShowChangeModal(true);
  };

  const handlePromptNo = () => {
    setShowPrompt(false);
    // Save today's date so we don't prompt again today
    localStorage.setItem("passwordChangePromptDate", new Date().toDateString());
  };

  const handleChangePassword = async () => {
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!user || !user.email) {
      setError("User not found");
      return;
    }

    try {
      setLoading(true);

      // Try to update password first (works if user recently authenticated)
      try {
        await updatePassword(user, newPassword);
      } catch (updateError: any) {
        // If re-authentication is required, ask for current password
        if (updateError.code === "auth/requires-recent-login") {
          if (!currentPassword) {
            setError("Please enter your current password to continue");
            return;
          }

          // Re-authenticate user
          const credential = EmailAuthProvider.credential(user.email, currentPassword);
          await reauthenticateWithCredential(user, credential);

          // Try updating password again after re-authentication
          await updatePassword(user, newPassword);
        } else {
          throw updateError;
        }
      }

      toast.success("Password changed successfully");
      setShowChangeModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Save today's date so we don't prompt again today
      localStorage.setItem("passwordChangePromptDate", new Date().toDateString());
    } catch (error: any) {
      const errorMessage =
        error.code === "auth/wrong-password"
          ? "Current password is incorrect"
          : error.code === "auth/weak-password"
          ? "Password should be at least 6 characters"
          : error.code === "auth/requires-recent-login"
          ? "Please enter your current password"
          : error.message || "Failed to change password";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Prompt Dialog */}
      <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password?</DialogTitle>
            <DialogDescription>
              Would you like to change your password? This is optional and you can do it later from settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handlePromptNo}>
              Not Now
            </Button>
            <Button onClick={handlePromptYes}>Yes, Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={showChangeModal} onOpenChange={setShowChangeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeModal(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

