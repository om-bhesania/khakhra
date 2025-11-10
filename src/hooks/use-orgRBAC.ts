import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./use-auth";
import { useFirestoreCRUD } from "./use-firebaseCRUD";
import type { ModulePermission } from "@/types/rbac";
import { SYSTEM_MODULES } from "@/types/rbac";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";

export interface OrgRole {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  isSystem: boolean; // true for "owner" role
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface OrgPermission {
  id: string;
  organizationId: string;
  roleId: string;
  moduleId: string;
  permissions: ModulePermission;
  updatedBy: string;
  updatedAt: Timestamp;
}

export interface OrgMember {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  role?: OrgRole;
  permissions?: Record<string, ModulePermission>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Hook for Organization-scoped RBAC
 * Handles roles and permissions within an organization
 */
export function useOrgRBAC() {
  const { user } = useAuth();
  const {
    readDocuments,
    addDocument,
    updateDocument,
    readDocById,
    getCurrentUserProfile,
  } = useFirestoreCRUD();

  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [memberRole, setMemberRole] = useState<OrgRole | null>(null);
  const [memberPermissions, setMemberPermissions] = useState<
    Record<string, ModulePermission>
  >({});
  const [loading, setLoading] = useState(true);

  // Load user's organization and role
  useEffect(() => {
    if (user) {
      loadUserOrgRole();
    }
  }, [user]);

  const loadUserOrgRole = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user profile to find organizationId
      const profile = await getCurrentUserProfile<any>();
      const orgId = profile?.organizationId;

      if (!orgId) {
        setOrganizationId(null);
        setIsOwner(false);
        setMemberRole(null);
        setMemberPermissions({});
        setLoading(false);
        return;
      }

      setOrganizationId(orgId);

      // Check if user is owner
      const org = await readDocById<any>("organizations", orgId);
      const isOrgOwner = org?.ownerUid === user.uid;
      setIsOwner(isOrgOwner);

      // Get member record
      const members = await readDocuments<OrgMember>(
        `organizations/${orgId}/members`,
        {
          where: [{ field: "userId", operator: "==", value: user.uid }],
        }
      );

      if (members.length === 0) {
        // If owner but no member record, create one
        if (isOrgOwner) {
          await createOwnerMemberRecord(orgId);
          // Owner has all permissions
          const allPerms: Record<string, ModulePermission> = {};
          SYSTEM_MODULES.forEach((module) => {
            allPerms[module.id] = {
              create: true,
              read: true,
              update: true,
              delete: true,
            };
          });
          setMemberPermissions(allPerms);
          setLoading(false);
          return;
        }
        setLoading(false);
        return;
      }

      const member = members[0];
      const roleId = member.roleId;

      // Get role by document ID
      const roleDoc = await readDocById<OrgRole>(
        `organizations/${orgId}/roles`,
        roleId
      );

      const roles = roleDoc ? [roleDoc] : [];

      if (roles.length > 0) {
        setMemberRole(roles[0]);
      }

      // Load permissions for this role
      if (roleId) {
        await loadRolePermissions(orgId, roleId);
      } else {
        // If no role, load from member permissions
        setMemberPermissions(member.permissions || {});
      }
    } catch (error) {
      console.error("Error loading org role:", error);
      toast.error("Failed to load organization role");
    } finally {
      setLoading(false);
    }
  };

  const createOwnerMemberRecord = async (orgId: string) => {
    if (!user) return;

    // Get or create owner role
    let ownerRole = await getOrCreateOwnerRole(orgId);

    // Create member record
    await addDocument(`organizations/${orgId}/members`, {
      userId: user.uid,
      roleId: ownerRole.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  };

  const getOrCreateOwnerRole = async (orgId: string): Promise<OrgRole> => {
    // Check if owner role exists by querying all roles and filtering
    const allRoles = await readDocuments<OrgRole>(
      `organizations/${orgId}/roles`
    );

    const ownerRole = allRoles.find((r) => r.name === "Owner" && r.isSystem);

    if (ownerRole) {
      return ownerRole;
    }

    // Create owner role
    const ownerRoleData: Omit<OrgRole, "id"> = {
      organizationId: orgId,
      name: "Owner",
      description: "Organization owner with full access",
      isSystem: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: user!.uid,
    };

    const newRole = await addDocument(
      `organizations/${orgId}/roles`,
      ownerRoleData
    );
    return { ...ownerRoleData, id: newRole?.id || "" } as OrgRole;
  };

  /**
   * Get or create default Employee role with read-only permissions
   * This ensures new employees can see all modules but can't perform CRUD until owner grants permissions
   */
  const getOrCreateEmployeeRole = async (
    orgId: string,
    createdBy: string
  ): Promise<OrgRole> => {
    // Check if employee role exists
    const allRoles = await readDocuments<OrgRole>(
      `organizations/${orgId}/roles`
    );

    let employeeRole = allRoles.find(
      (r) => r.name === "Employee" && r.isSystem
    );

    if (employeeRole) {
      // Ensure Employee role has read-only permissions set up
      await ensureEmployeeRolePermissions(orgId, employeeRole.id, createdBy);
      return employeeRole;
    }

    // Create employee role
    const employeeRoleData: Omit<OrgRole, "id"> = {
      organizationId: orgId,
      name: "Employee",
      description: "Default employee role with read-only access to all modules",
      isSystem: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: createdBy,
    };

    const newRole = await addDocument(
      `organizations/${orgId}/roles`,
      employeeRoleData
    );
    employeeRole = { ...employeeRoleData, id: newRole?.id || null } as OrgRole;

    // Set up read-only permissions for all modules
    await ensureEmployeeRolePermissions(orgId, employeeRole.id, createdBy);

    return employeeRole;
  };

  /**
   * Ensure Employee role has read-only permissions for all modules
   */
  const ensureEmployeeRolePermissions = async (
    orgId: string,
    roleId: string,
    updatedBy: string
  ): Promise<void> => {
    // Read-only permissions: can read but cannot create, update, or delete
    const readOnlyPermissions: ModulePermission = {
      create: false,
      read: true,
      update: false,
      delete: false,
    };

    // Set read-only permissions for all system modules
    for (const module of SYSTEM_MODULES) {
      // Check if permission already exists
      const existing = await readDocuments<OrgPermission>(
        `organizations/${orgId}/permissions`,
        {
          where: [
            { field: "roleId", operator: "==", value: roleId },
            { field: "moduleId", operator: "==", value: module.id },
          ],
        }
      );

      const permissionData: Omit<OrgPermission, "id"> = {
        organizationId: orgId,
        roleId,
        moduleId: module.id,
        permissions: readOnlyPermissions,
        updatedBy,
        updatedAt: Timestamp.now(),
      };

      if (existing.length > 0) {
        // Update existing permission only if it doesn't have read access
        const existingPerm = existing[0];
        if (!existingPerm.permissions.read) {
          await updateDocument(
            `organizations/${orgId}/permissions`,
            existingPerm.id,
            permissionData
          );
        }
      } else {
        // Create new permission
        await addDocument(`organizations/${orgId}/permissions`, permissionData);
      }
    }
  };

  const loadRolePermissions = async (orgId: string, roleId: string) => {
    try {
      // Get role to check if it's Employee role
      const role = await readDocById<OrgRole>(
        `organizations/${orgId}/roles`,
        roleId
      );

      const permissions = await readDocuments<OrgPermission>(
        `organizations/${orgId}/permissions`,
        {
          where: [{ field: "roleId", operator: "==", value: roleId }],
        }
      );

      // If Employee role has no permissions, create default read-only permissions
      // This handles existing organizations that were created before this fix
      if (
        role &&
        role.name === "Employee" &&
        role.isSystem &&
        permissions.length === 0
      ) {
        console.log(
          "Employee role has no permissions, creating default read-only permissions"
        );
        await ensureEmployeeRolePermissions(
          orgId,
          roleId,
          user?.uid || "system"
        );

        // Reload permissions after creating them
        const newPermissions = await readDocuments<OrgPermission>(
          `organizations/${orgId}/permissions`,
          {
            where: [{ field: "roleId", operator: "==", value: roleId }],
          }
        );

        const permMap: Record<string, ModulePermission> = {};
        SYSTEM_MODULES.forEach((module) => {
          const modulePerm = newPermissions.find(
            (p) => p.moduleId === module.id
          );
          if (modulePerm) {
            permMap[module.id] = modulePerm.permissions;
          } else {
            // Default: no permissions (should not happen after ensureEmployeeRolePermissions)
            permMap[module.id] = {
              create: false,
              read: false,
              update: false,
              delete: false,
            };
          }
        });

        setMemberPermissions(permMap);
        return;
      }

      const permMap: Record<string, ModulePermission> = {};
      SYSTEM_MODULES.forEach((module) => {
        const modulePerm = permissions.find((p) => p.moduleId === module.id);
        if (modulePerm) {
          permMap[module.id] = modulePerm.permissions;
        } else {
          // Default: no permissions
          permMap[module.id] = {
            create: false,
            read: false,
            update: false,
            delete: false,
          };
        }
      });

      setMemberPermissions(permMap);
    } catch (error) {
      console.error("Error loading role permissions:", error);
    }
  };

  const hasPermission = useCallback(
    (moduleId: string, action: keyof ModulePermission): boolean => {
      // Owner has all permissions
      if (isOwner) return true;

      // Check member permissions
      return !!memberPermissions[moduleId]?.[action];
    },
    [isOwner, memberPermissions]
  );

  const getOrgRoles = async (orgId: string): Promise<OrgRole[]> => {
    try {
      return await readDocuments<OrgRole>(`organizations/${orgId}/roles`);
    } catch (error) {
      console.error("Error loading org roles:", error);
      return [];
    }
  };

  const createOrgRole = async (
    orgId: string,
    name: string,
    description?: string
  ): Promise<string | null> => {
    if (!user || !isOwner) {
      toast.error("Only organization owners can create roles");
      return null;
    }

    try {
      const roleData: Omit<OrgRole, "id"> = {
        organizationId: orgId,
        name,
        description,
        isSystem: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: user.uid,
      };

      const newRole = await addDocument(
        `organizations/${orgId}/roles`,
        roleData
      );
      return newRole?.id || null;
    } catch (error) {
      console.error("Error creating org role:", error);
      toast.error("Failed to create role");
      return null;
    }
  };

  const updateRolePermission = async (
    orgId: string,
    roleId: string,
    moduleId: string,
    permissions: ModulePermission
  ): Promise<boolean> => {
    if (!user || !isOwner) {
      toast.error("Only organization owners can update permissions");
      return false;
    }

    try {
      // Check if permission exists
      const existing = await readDocuments<OrgPermission>(
        `organizations/${orgId}/permissions`,
        {
          where: [
            { field: "roleId", operator: "==", value: roleId },
            { field: "moduleId", operator: "==", value: moduleId },
          ],
        }
      );

      const permissionData: Omit<OrgPermission, "id"> = {
        organizationId: orgId,
        roleId,
        moduleId,
        permissions,
        updatedBy: user.uid,
        updatedAt: Timestamp.now(),
      };

      if (existing.length > 0) {
        await updateDocument(
          `organizations/${orgId}/permissions`,
          existing[0].id,
          permissionData
        );
      } else {
        await addDocument(`organizations/${orgId}/permissions`, permissionData);
      }

      // If updating current user's role, reload permissions
      if (memberRole?.id === roleId) {
        await loadRolePermissions(orgId, roleId);
      }

      toast.success("Permission updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating permission:", error);
      toast.error("Failed to update permission");
      return false;
    }
  };

  const assignRoleToMember = async (
    orgId: string,
    userId: string,
    roleId: string
  ): Promise<boolean> => {
    if (!user || !isOwner) {
      toast.error("Only organization owners can assign roles");
      return false;
    }

    try {
      // Find member record
      const members = await readDocuments<OrgMember>(
        `organizations/${orgId}/members`,
        {
          where: [{ field: "userId", operator: "==", value: userId }],
        }
      );

      if (members.length === 0) {
        toast.error("Member not found");
        return false;
      }

      const member = members[0];

      // Update member role
      await updateDocument(`organizations/${orgId}/members`, member.id, {
        roleId,
        updatedAt: Timestamp.now(),
      });

      // Load permissions for the new role and update member record
      const permissions = await readDocuments<OrgPermission>(
        `organizations/${orgId}/permissions`,
        {
          where: [{ field: "roleId", operator: "==", value: roleId }],
        }
      );

      const permMap: Record<string, ModulePermission> = {};
      SYSTEM_MODULES.forEach((module) => {
        const modulePerm = permissions.find((p) => p.moduleId === module.id);
        if (modulePerm) {
          permMap[module.id] = modulePerm.permissions;
        } else {
          permMap[module.id] = {
            create: false,
            read: false,
            update: false,
            delete: false,
          };
        }
      });

      // Update member permissions cache
      await updateDocument(`organizations/${orgId}/members`, member.id, {
        permissions: permMap,
      });

      toast.success("Role assigned successfully");
      return true;
    } catch (error) {
      console.error("Error assigning role:", error);
      toast.error("Failed to assign role");
      return false;
    }
  };

  const getOrgMembers = async (orgId: string): Promise<OrgMember[]> => {
    try {
      const members = await readDocuments<OrgMember>(
        `organizations/${orgId}/members`
      );

      // Load role details for each member
      const membersWithRoles = await Promise.all(
        members.map(async (member) => {
          if (member.roleId) {
            const role = await readDocById<OrgRole>(
              `organizations/${orgId}/roles`,
              member.roleId
            );
            if (role) {
              return { ...member, role };
            }
          }
          return member;
        })
      );

      return membersWithRoles;
    } catch (error) {
      console.error("Error loading org members:", error);
      return [];
    }
  };

  return {
    loading,
    organizationId,
    isOwner,
    memberRole,
    memberPermissions,
    hasPermission,
    getOrgRoles,
    createOrgRole,
    updateRolePermission,
    assignRoleToMember,
    getOrgMembers,
    getOrCreateEmployeeRole,
    reload: loadUserOrgRole,
    SYSTEM_MODULES,
  };
}
