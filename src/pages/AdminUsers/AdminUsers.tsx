import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { toast } from "sonner";
import { Edit, Trash2, Search, Loader2 } from "lucide-react";
import { useRBAC } from "@/wrappers/RBACProvider";

interface User {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  organizationId: string | null;
  role: string;
  createdAt?: any;
  updatedAt?: any;
}

export default function AdminUsers() {
  const { readRootDocuments, updateDocument, deleteDocument } = useFirestoreCRUD();
  const { isAdminEmail } = useRBAC();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: "",
    email: "",
    organizationId: "",
    role: "",
  });

  useEffect(() => {
    if (!isAdminEmail) {
      toast.error("Unauthorized. Only Super Admin can access this page.");
      return;
    }

    loadData();
  }, [isAdminEmail]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load users
      const usersData = await readRootDocuments<any>("users", { limit: 1000 } as any);
      setUsers(usersData.map((u: any) => ({
        id: u.id,
        uid: u.uid || u.id,
        email: u.email || "",
        displayName: u.displayName || "",
        organizationId: u.organizationId || null,
        role: u.role || "employee",
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })));

      // Load organizations
      const orgsData = await readRootDocuments<any>("organizations", { limit: 1000 } as any);
      setOrganizations(orgsData.map((o: any) => ({
        id: o.id,
        name: o.name || "Unknown",
      })));
    } catch (error: any) {
      toast.error(error?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      displayName: user.displayName,
      email: user.email,
      organizationId: user.organizationId || "",
      role: user.role,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      await updateDocument("users", editingUser.id, {
        displayName: editForm.displayName.trim(),
        email: editForm.email.trim().toLowerCase(),
        organizationId: editForm.organizationId || null,
        role: editForm.role,
        updatedAt: new Date(),
      } as any);

      toast.success("User updated successfully");
      setEditingUser(null);
      loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update user");
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await deleteDocument("users", userId);
      toast.success("User deleted successfully");
      setDeleteConfirm(null);
      loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete user");
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      user.displayName.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  const getOrganizationName = (orgId: string | null) => {
    if (!orgId) return "—";
    const org = organizations.find((o) => o.id === orgId);
    return org?.name || "Unknown";
  };

  if (!isAdminEmail) {
    return (
      <div className="mt-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Unauthorized. Only Super Admin can access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Users Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.displayName || "—"}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>{getOrganizationName(user.organizationId)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirm(user.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Total users: {filteredUsers.length}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editForm.displayName}
                onChange={(e) =>
                  setEditForm({ ...editForm, displayName: e.target.value })
                }
                placeholder="User name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={editForm.role}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization</label>
              <Select
                value={editForm.organizationId}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, organizationId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Organization</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

