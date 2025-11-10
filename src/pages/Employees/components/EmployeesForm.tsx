import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { useOrgRBAC } from "@/hooks/use-orgRBAC";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { useState } from "react";
import { Copy, Check, Key } from "lucide-react";

// Generate secure random password
const generateSecurePassword = (): string => {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";
  
  const getRandomChar = (str: string) => str[Math.floor(Math.random() * str.length)];
  
  let password = "";
  // Add at least one of each type
  password += getRandomChar(uppercase);
  password += getRandomChar(lowercase);
  password += getRandomChar(numbers);
  password += getRandomChar(symbols);
  
  // Fill the rest randomly (total 12 characters)
  const allChars = uppercase + lowercase + numbers + symbols;
  for (let i = password.length; i < 12; i++) {
    password += getRandomChar(allChars);
  }
  
  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

function EmployeesForm() {
  const { addDocument, getCurrentUserProfile } = useFirestoreCRUD();
  const { organizationId, isOwner } = useOrgRBAC();
  
  const [generateCredentials, setGenerateCredentials] = useState(false);
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      address: "",
      timingsStart: "",
      timingsEnd: "",
      dateOfJoining: "",
    },
    onSubmit: async ({ value }) => {
      try {
        // Check if user is owner and has organization
        if (!isOwner || !organizationId) {
          toast.error("Only organization owners can add employees");
          return;
        }

        // If generating credentials, email is required
        if (generateCredentials && !value.email.trim()) {
          toast.error("Email is required when generating credentials");
          return;
        }

        const userProfile = await getCurrentUserProfile<any>();
        if (!userProfile?.organizationId) {
          toast.error("You must be part of an organization to add employees");
          return;
        }

        // Generate password if credentials are being generated
        let password = "";
        if (generateCredentials) {
          password = generateSecurePassword();
          setGeneratedPassword(password);
          setEmployeeEmail(value.email.trim());
        }

        const payload: Record<string, any> = {
          name: value.name.trim(),
          phoneNumber: value.phoneNumber.trim(),
          dateOfJoining: value.dateOfJoining,
          role: "employee",
          organizationId: userProfile.organizationId,
          timings: {
            start: value.timingsStart,
            end: value.timingsEnd,
            tz: "Asia/Kolkata",
          },
        };

        if (value.address.trim()) payload.address = value.address.trim();
        
        // Add email if credentials are being generated
        if (generateCredentials && value.email.trim()) {
          payload.email = value.email.trim().toLowerCase();
          payload.hasAccount = false; // Employee hasn't registered yet
          // Note: Password is NOT stored - employee will register themselves
          // Owner shares the generated password manually
        }

        await addDocument("employees", payload);
        
        // If credentials generated, show dialog
        if (generateCredentials && password) {
          setShowCredentialsDialog(true);
        } else {
          toast.success("Employee saved");
        }
        
        form.reset();
        setGenerateCredentials(false);
        setEmployeeEmail("");
      } catch (err: any) {
        toast.error(err?.message || "Failed to save employee");
      }
    },
  });

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
        <form
          className="space-y-4 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-900 mt-12 w-full"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) =>
                value?.trim() ? undefined : "Enter a name",
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">
                  Name
                </label>
                <Input
                  value={String(field.state.value ?? "")}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Employee name"
                />
                {field.state.meta.errors[0] && (
                  <p className="text-xs text-rose-600">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
            <Checkbox
              id="generateCredentials"
              checked={generateCredentials}
              onCheckedChange={(checked) => {
                setGenerateCredentials(!!checked);
                if (!checked) {
                  form.setFieldValue("email", "");
                }
              }}
            />
            <Label
              htmlFor="generateCredentials"
              className="text-sm font-medium cursor-pointer"
            >
              Generate login credentials for employee
            </Label>
          </div>

          {generateCredentials && (
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  if (!value?.trim()) return "Email is required";
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(value.trim())) {
                    return "Invalid email address";
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-1">
                  <label className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Employee Email
                  </label>
                  <Input
                    type="email"
                    value={String(field.state.value ?? "")}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="employee@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Employee will use this email to register. Share the generated password with them.
                  </p>
                  {field.state.meta.errors[0] && (
                    <p className="text-xs text-rose-600">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          )}

          <form.Field
            name="phoneNumber"
            validators={{
              onChange: ({ value }) =>
                String(value).trim() ? undefined : "Enter phone number",
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">
                  Phone Number
                </label>
                <Input
                  value={String(field.state.value ?? "")}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  inputMode="tel"
                  placeholder="98765 43210"
                />
                {field.state.meta.errors[0] && (
                  <p className="text-xs text-rose-600">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="address">
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">
                  Address (optional)
                </label>
                <Input
                  value={String(field.state.value ?? "")}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Address"
                />
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="timingsStart">
              {(field) => (
                <div className="space-y-1">
                  <label className="text-sm text-zinc-600 dark:text-zinc-300">
                    Shift Start (IST)
                  </label>
                  <Input
                    type="time"
                    value={String(field.state.value ?? "")}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="timingsEnd">
              {(field) => (
                <div className="space-y-1">
                  <label className="text-sm text-zinc-600 dark:text-zinc-300">
                    Shift End (IST)
                  </label>
                  <Input
                    type="time"
                    value={String(field.state.value ?? "")}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="dateOfJoining">
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm text-zinc-600 dark:text-zinc-300">
                  Date of Joining
                </label>
                <Input
                  type="date"
                  value={String(field.state.value ?? "")}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={!canSubmit}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {isSubmitting ? "Saving..." : "Save Employee"}
              </Button>
            )}
          </form.Subscribe>
        </form>

        {/* Credentials Dialog */}
        <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Employee Credentials</DialogTitle>
              <DialogDescription>
                Share these credentials with the employee. They will use these to register and access their account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={employeeEmail}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      await navigator.clipboard.writeText(employeeEmail);
                      setCopiedEmail(true);
                      setTimeout(() => setCopiedEmail(false), 2000);
                    }}
                  >
                    {copiedEmail ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={generatedPassword}
                    readOnly
                    className="font-mono text-sm"
                    type="password"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      await navigator.clipboard.writeText(generatedPassword);
                      setCopiedPassword(true);
                      setTimeout(() => setCopiedPassword(false), 2000);
                    }}
                  >
                    {copiedPassword ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Employee must use this password when registering with the email above.
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  ⚠️ Save these credentials securely. They will not be shown again.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setShowCredentialsDialog(false);
                  setGeneratedPassword("");
                  setEmployeeEmail("");
                }}
              >
                Got it
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Quick View</CardTitle>
            </CardHeader>
            <CardContent>
              <form.Subscribe selector={(state) => state.values}>
                {(values) => (
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-zinc-500">Name</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.name || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Email</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.email || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Phone</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.phoneNumber || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Timings (IST)</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.timingsStart && values.timingsEnd
                          ? `${values.timingsStart} - ${values.timingsEnd}`
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Date of Joining</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 min-h-5">
                        {values.dateOfJoining || "—"}
                      </div>
                    </div>
                  </div>
                )}
              </form.Subscribe>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default EmployeesForm;
