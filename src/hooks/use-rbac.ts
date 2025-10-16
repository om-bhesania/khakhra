import type { ModulePermission, Permission, Role } from "@/types/rbac";
import { SYSTEM_MODULES, SYSTEM_ROLES } from "@/types/rbac";
import type { MasterUserData } from "@/types/users";
import { Timestamp } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "./use-auth";
import { useFirestoreCRUD } from "./use-firebaseCRUD";

export function useRBAC() {
  const { user } = useAuth();
  const { addDocument, readDocuments, updateDocument, readDocById } =
    useFirestoreCRUD();

  const [masterUserData, setMasterUserData] = useState<MasterUserData | null>(
    null
  );

  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [userPermissions, setUserPermissions] = useState<
    Record<string, ModulePermission>
  >({});
  const [loading, setLoading] = useState(true);

  // Initialize collections
  useEffect(() => {
    if (!loading && user) {
      // Load user's role and permissions only after auth is initialized
      loadUserRoleAndPermissions();
    }
  }, [loading, user]);

  const loadUserRoleAndPermissions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('Loading user data for:', user.uid);
      // Get master user data
      const masterData = await readDocById<MasterUserData>(
        "masterUserData",
        user.uid
      );

      if (!masterData) {
        // Create new master user data with default EMPLOYEE role
        const defaultMasterData: MasterUserData = {
          id: user.uid,
          email: user.email || "",
          displayName: user.displayName,
          roleId: "employee",
          permissions: {},
          status: "active",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          lastLoginAt: Timestamp.now(),
        };

        await addDocument("masterUserData", defaultMasterData);
        setMasterUserData(defaultMasterData);

        // Get role details for default role
        const defaultRole = await readDocById<Role>("roles", "employee");
        if (defaultRole) {
          setCurrentUserRole(defaultRole);
        }
      } else {
        setMasterUserData(masterData);

        // Get role details
        const role = await readDocById<Role>("roles", masterData.roleId);
        if (role) {
          setCurrentUserRole(role);
          setUserPermissions(masterData.permissions);
        } else {
          console.error("Role not found:", masterData.roleId);
          toast.error("User role configuration not found");
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading user role and permissions:", error);
      toast.error("Failed to load user permissions");
      setLoading(false);
    }
  };

  const hasPermission = useCallback(
    (moduleId: string, action: keyof ModulePermission): boolean => {
      if (!currentUserRole) return false;

      // Super Admin has all permissions
      if (currentUserRole.type === "SUPER_ADMIN") return true;

      // Admin has all permissions except role creation
      if (currentUserRole.type === "ADMIN") {
        if (moduleId === "roles" && action === "create") return false;
        return true;
      }

      // Check specific permissions for other roles
      return !!userPermissions[moduleId]?.[action];
    },
    [currentUserRole, userPermissions]
  );

  const updateRolePermissions = async (
    roleId: string,
    moduleId: string,
    permissions: ModulePermission
  ): Promise<boolean> => {
    if (!user || !currentUserRole || !masterUserData) return false;

    // Only ADMIN and SUPER_ADMIN can update permissions
    if (!["ADMIN", "SUPER_ADMIN"].includes(currentUserRole.type)) {
      toast.error("Insufficient permissions");
      return false;
    }

    try {
      // Update masterUserData permissions
      const updatedPermissions = {
        ...masterUserData.permissions,
        [moduleId]: permissions,
      };

      await updateDocument("masterUserData", user.uid, {
        permissions: updatedPermissions,
        updatedAt: Timestamp.now(),
      });

      // Update permissions collection for role-based access
      const permissionData = {
        roleId,
        moduleId,
        permissions,
        updatedBy: user.uid,
        updatedAt: Timestamp.now(),
      };

      const existingPermission = await readDocuments<Permission>(
        "permissions",
        {
          where: [
            { field: "roleId", operator: "==", value: roleId },
            { field: "moduleId", operator: "==", value: moduleId },
          ],
        }
      );

      if (existingPermission.length > 0) {
        await updateDocument(
          "permissions",
          existingPermission[0].id,
          permissionData
        );
      } else {
        await addDocument("permissions", permissionData);
      }

      // Log the change
      await addDocument("auditLogs", {
        action: "PERMISSION_UPDATED",
        performedBy: user.uid,
        performerRole: currentUserRole.type,
        targetRole: roleId,
        changes: {
          before: existingPermission[0]?.permissions || null,
          after: permissions,
        },
        timestamp: Timestamp.now(),
      });

      // Update local state
      setMasterUserData({
        ...masterUserData,
        permissions: updatedPermissions,
      });
      setUserPermissions(updatedPermissions);

      toast.success("Permissions updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast.error("Failed to update permissions");
      return false;
    }
  };

  const createRole = async (
    roleName: string,
    description?: string,
    inheritsFrom?: string
  ): Promise<string | null> => {
    if (!user || currentUserRole?.type !== "SUPER_ADMIN") {
      toast.error("Only Super Admin can create new roles");
      return null;
    }

    try {
      const roleData: Omit<Role, "id"> = {
        name: roleName,
        description,
        type: roleName.toUpperCase().replace(/\s+/g, "_"),
        inheritsFrom,
        isSystem: false,
        createdBy: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const newRole = await addDocument("roles", roleData);
      if (!newRole) throw new Error("Failed to create role");

      // Log the change
      await addDocument("auditLogs", {
        action: "ROLE_CREATED",
        performedBy: user.uid,
        performerRole: currentUserRole.type,
        targetRole: newRole.id,
        changes: {
          before: null,
          after: newRole,
        },
        timestamp: Timestamp.now(),
      });

      toast.success("Role created successfully");
      return newRole.id;
    } catch (error) {
      console.error("Error creating role:", error);
      toast.error("Failed to create role");
      return null;
    }
  };

  return {
    loading,
    currentUserRole,
    userPermissions,
    hasPermission,
    updateRolePermissions,
    createRole,
    SYSTEM_MODULES,
    SYSTEM_ROLES,
  };
}
