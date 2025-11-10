import { PermissionMatrix } from "@/components/PermissionMatrix";
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
  DialogTrigger,
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
import { useOrgRBAC, type OrgRole } from "@/hooks/use-orgRBAC";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import type { ModulePermission } from "@/types/rbac";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const OrgRoleManagement = () => {
  const {
    organizationId,
    isOwner,
    loading: rbacLoading,
    getOrgRoles,
    createOrgRole,
    updateRolePermission,
    SYSTEM_MODULES,
    hasPermission,
  } = useOrgRBAC();
  
  const { readDocuments } = useFirestoreCRUD();

  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [permissions, setPermissions] = useState<
    Record<string, ModulePermission>
  >({});
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  useEffect(() => {
    if (organizationId && isOwner) {
      loadRoles();
    }
  }, [organizationId, isOwner]);

  useEffect(() => {
    if (selectedRole && organizationId) {
      loadPermissionsForRole(selectedRole);
    }
  }, [selectedRole, organizationId]);

  const loadRoles = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const rolesData = await getOrgRoles(organizationId);
      setRoles(rolesData);

      if (rolesData.length > 0 && !selectedRole) {
        setSelectedRole(rolesData[0].id);
        await loadPermissionsForRole(rolesData[0].id);
      }
    } catch (error) {
      console.error("Error loading roles:", error);
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  const loadPermissionsForRole = async (roleId: string) => {
    if (!organizationId || !roleId) return;

    setLoading(true);
    try {
      const permissionsData = await readDocuments<any>(
        `organizations/${organizationId}/permissions`,
        {
          where: [{ field: "roleId", operator: "==", value: roleId }],
        }
      );

      // Create default permissions for each module
      const defaultPerms: ModulePermission = {
        create: false,
        read: false,
        update: false,
        delete: false,
      };

      const permMap: Record<string, ModulePermission> = {};
      SYSTEM_MODULES.forEach((module) => {
        const existingPerm = permissionsData.find(
          (p: any) => p.moduleId === module.id
        );
        permMap[module.id] = existingPerm?.permissions || { ...defaultPerms };
      });

      setPermissions(permMap);
    } catch (error) {
      console.error("Error loading permissions:", error);
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionUpdate = async (
    moduleId: string,
    newPermissions: ModulePermission
  ): Promise<void> => {
    if (!organizationId || !selectedRole || !isOwner) return;

    setLoading(true);
    try {
      // Update local state immediately for better UX
      setPermissions((prev) => ({
        ...prev,
        [moduleId]: newPermissions,
      }));

      await updateRolePermission(
        organizationId,
        selectedRole,
        moduleId,
        newPermissions
      );
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast.error("Failed to update permissions");
      // Reload permissions on error
      await loadPermissionsForRole(selectedRole);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!organizationId || !isOwner) {
      toast.error("Only organization owners can create roles");
      return;
    }

    if (!newRoleName.trim()) {
      toast.error("Role name is required");
      return;
    }

    try {
      const roleId = await createOrgRole(
        organizationId,
        newRoleName.trim(),
        newRoleDescription.trim() || undefined
      );

      if (roleId) {
        setIsCreateDialogOpen(false);
        setNewRoleName("");
        setNewRoleDescription("");
        await loadRoles();
        toast.success("Role created successfully");
      }
    } catch (error) {
      console.error("Error creating role:", error);
      toast.error("Failed to create role");
    }
  };

  if (rbacLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Role Management</CardTitle>
            <CardDescription>Manage roles and permissions for your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You are not part of an organization. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Role Management</CardTitle>
            <CardDescription>Manage roles and permissions for your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Only organization owners can manage roles and permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>
                Manage roles and permissions for your organization
              </CardDescription>
            </div>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                  <DialogDescription>
                    Create a new role with custom permissions for your organization.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Role Name</Label>
                    <Input
                      id="name"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="Enter role name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newRoleDescription}
                      onChange={(e) => setNewRoleDescription(e.target.value)}
                      placeholder="Enter role description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRole} disabled={!newRoleName}>
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="role-select">Select Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role-select">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name} {role.isSystem && "(System)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRole && (
            <PermissionMatrix
              modules={SYSTEM_MODULES}
              permissions={permissions}
              onUpdatePermissions={handlePermissionUpdate}
              readOnly={false}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrgRoleManagement;

