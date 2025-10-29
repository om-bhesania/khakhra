// Role Based Access Control constants
// Edit this file to add/remove roles or change module permissions.
// The sync script will read this and update Firestore collections accordingly.

export type RbacAction = "read" | "write" | "update" | "delete";

export type RbacModules = {
  dashboard: RbacAction[];
  billing: RbacAction[];
  inventory: RbacAction[];
  customers: RbacAction[];
  employees: RbacAction[];
};

export type RbacRoles = {
  owner: { module: RbacModules };
  employee: { module: RbacModules };
};

export const RBAC_DEFINITION: RbacRoles = {
  owner: {
    module: {
      dashboard: ["read", "write", "update", "delete"],
      billing: ["read", "write", "update", "delete"],
      inventory: ["read", "write", "update", "delete"],
      customers: ["read", "write", "update", "delete"],
      employees: ["read", "write", "update", "delete"],
    },
  },
  employee: {
    module: {
      dashboard: ["read"],
      billing: ["read", "write"],
      inventory: ["read"],
      customers: ["read", "update"],
      employees: [],
    },
  },
};

// Admin email from env with fallback
export const ADMIN_EMAIL =
  (import.meta as any)?.env?.VITE_ADMIN_EMAIL || "bhesaniaom@gmail.com";

