import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRBAC } from "@/hooks/use-rbac";
import { PermissionMatrix } from "@/components/PermissionMatrix";
import type {
  ModulePermission,
  Permission,
  Role,
  RoleType,
} from "@/types/rbac";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { Loader2, Plus } from "lucide-react";
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
import { toast } from "sonner";
import { useCurrentUserRole } from "@/hooks/use-currentUserRole";

const RoleManagement = () => {
  const { role: currentUserRole, loading: userLoading } = useCurrentUserRole();
  const { SYSTEM_MODULES, hasPermission } = useRBAC();
  const { readDocuments, addDocument } = useFirestoreCRUD();

  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [permissions, setPermissions] = useState<
    Record<string, ModulePermission>
  >({});
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        console.log("Fetching roles...");
        const rolesData = await readDocuments<Role>("roles");
        console.log("Fetched roles:", rolesData);

        // Filter out SUPER_ADMIN role
        const filteredRoles = rolesData.filter(
          (role) => role.type !== "SUPER_ADMIN"
        );

        console.log("Filtered roles:", filteredRoles);
        if (!isMounted) return;
        setRoles(filteredRoles);

        if (filteredRoles.length > 0 && !selectedRole) {
          console.log("Setting initial role:", filteredRoles[0]);
          setSelectedRole(filteredRoles[0].id);
          await loadPermissionsForRole(filteredRoles[0].id);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Error loading roles:", error);
        toast.error("Failed to load roles");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [currentUserRole, readDocuments]);

  const loadRolesAndPermissions = async () => {
    setLoading(true);
    try {
      const rolesData = await readDocuments<Role>("roles");
      const filteredRoles = rolesData.filter((role) => {
        if (!currentUserRole?.type) return false;

        switch (currentUserRole.type) {
          case "SUPER_ADMIN":
            return role.type === "ADMIN" || role.type === "EMPLOYEE";
          case "ADMIN":
            return role.type === "EMPLOYEE";
          default:
            return false;
        }
      });

      setRoles(filteredRoles);

      if (filteredRoles.length > 0 && !selectedRole) {
        setSelectedRole(filteredRoles[0].id);
        await loadPermissionsForRole(filteredRoles[0].id);
      }
    } catch (error) {
      console.error("Error loading roles:", error);
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (selectedRole) {
      loadPermissionsForRole(selectedRole);
    }
  }, [selectedRole]);

  const loadPermissionsForRole = async (roleId: string) => {
    if (!roleId) return;

    setLoading(true);
    try {
      // First get all permissions for this role
      const permissionsData = await readDocuments<Permission>("permissions", {
        where: [{ field: "roleId", operator: "==", value: roleId }],
      });
      console.log("Raw permissions data:", permissionsData);

      // Create default permissions for each module
      const defaultPerms: ModulePermission = {
        create: false,
        read: false,
        update: false,
        delete: false,
      };

      // Initialize permMap with default permissions for all modules
      const permMap: Record<string, ModulePermission> = {};
      SYSTEM_MODULES.forEach((module) => {
        const moduleStr = module.toString();
        const existingPerm = permissionsData.find((p) => {
          const pModuleId =
            typeof p.moduleId === "string" ? p.moduleId : p.moduleId?.id;
          return pModuleId === moduleStr;
        });
        permMap[moduleStr] = existingPerm?.permissions || { ...defaultPerms };
      });

      console.log("Permissions loaded for role:", roleId, permMap);
      setPermissions(permMap);
    } catch (error) {
      console.error("Error loading permissions:", error);
      toast.error("Failed to load permissions");
      throw error; // Propagate error to the caller
    } finally {
      setLoading(false);
    }
  };

  const canManageRole = (roleType: string) => {
    if (!currentUserRole) return false;

    const userType = currentUserRole.type.trim().toUpperCase();
    const targetType = roleType.trim().toUpperCase();

    if (userType === "SUPER_ADMIN") return true;
    if (userType === "ADMIN") return targetType === "EMPLOYEE";

    return false;
  };

  const handleRoleChange = async (roleId: string) => {
    try {
      const allRoles = await readDocuments("roles"); // await the promise
      console.log("allRoles", allRoles);

      const role = allRoles.find((r: any) => r.id === roleId);

      if (!role) {
        toast.error("Role not found");
        return;
      }

      if (!canManageRole(role.type)) {
        toast.error("You don't have permission to manage this role");
        return;
      }

      setSelectedRole(roleId);
      await loadPermissionsForRole(roleId);
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to change role");
    }
  };

  const handlePermissionUpdate = async (
    moduleId: string,
    newPermissions: ModulePermission
  ): Promise<void> => {
    if (!currentUserRole || !selectedRole) return;

    // Additional check for Super Admin requirement for role creation
    if (
      moduleId === "roles" &&
      newPermissions.create &&
      currentUserRole.type !== "SUPER_ADMIN"
    ) {
      toast.error("Only Super Admin can grant role creation permissions");
      return;
    }

    setLoading(true);
    try {
      // Update local state immediately for better UX
      setPermissions((prev) => ({
        ...prev,
        [moduleId]: newPermissions,
      }));

      const moduleName =
        SYSTEM_MODULES.find((m) => m.toString() === moduleId)?.toString() ||
        moduleId;

      const permissionsData = {
        roleId: selectedRole,
        moduleId: {
          id: moduleId,
          name: moduleName,
          isSystem: true,
        },
        permissions: newPermissions,
        updatedAt: new Date(),
        updatedBy: currentUserRole.id,
      };

      await addDocument("permissions", permissionsData);
      console.log("Permission updated for module:", moduleId, newPermissions);
      toast.success("Permissions updated successfully");
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast.error("Failed to update permissions");
      // Reload permissions on error to ensure consistency
      await loadPermissionsForRole(selectedRole);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!currentUserRole || currentUserRole.type !== "SUPER_ADMIN") {
      toast.error("Only Super Admin can create new roles");
      return;
    }

    try {
      const roleData = {
        name: newRoleName,
        description: newRoleDescription,
        type: newRoleName.toUpperCase().replace(/\s+/g, "_"),
        isSystem: false,
      };

      await addDocument("roles", roleData);
      setIsCreateDialogOpen(false);
      setNewRoleName("");
      setNewRoleDescription("");
      await loadRolesAndPermissions();
      toast.success("Role created successfully");
    } catch (error) {
      console.error("Error creating role:", error);
      toast.error("Failed to create role");
    }
  };

  if (userLoading || loading) {
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>Manage roles and permissions</CardDescription>
            </div>
            {hasPermission("roles", "create") && (
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
                      Create a new role with custom permissions.
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
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="role-select">Select Role</Label>
            <Select value={selectedRole} onValueChange={handleRoleChange}>
              <SelectTrigger id="role-select">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
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
              readOnly={currentUserRole?.type !== "SUPER_ADMIN"}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
export default RoleManagement;
