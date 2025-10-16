import { Timestamp } from "firebase/firestore";

export type RoleType = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE' | string;

export interface Role {
  id: string;
  name: string;
  description?: string;
  type: RoleType;
  inheritsFrom?: string; // ID of the role to inherit permissions from
  isSystem?: boolean; // true for built-in roles (SUPER_ADMIN, ADMIN, EMPLOYEE)
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ModulePermission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface Permission {
  id: string;
  roleId: string;
  moduleId: {
    id: string;
    name: string;
    isSystem: boolean;
  };
  permissions: ModulePermission;
  updatedBy: string;
  updatedAt: Timestamp;
}

export interface AuditLog {
  id: string;
  action: 'ROLE_UPDATED' | 'PERMISSION_UPDATED' | 'ROLE_CREATED' | 'ROLE_DELETED';
  performedBy: string;
  performerRole: RoleType;
  targetRole: string;
  changes: {
    before: any;
    after: any;
  };
  timestamp: Timestamp;
}

export interface Module {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
}

// Available modules in the system
export const SYSTEM_MODULES: Module[] = [
  { id: 'inventory', name: 'Inventory', isSystem: true },
  { id: 'billing', name: 'Billing', isSystem: true },
  { id: 'customer', name: 'Customer', isSystem: true },
  { id: 'roles', name: 'Role Management', isSystem: true },
];

// System roles that cannot be deleted
export const SYSTEM_ROLES: Role[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    type: 'SUPER_ADMIN',
    description: 'Developer role with full system access',
    isSystem: true,
    createdBy: 'system',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    id: 'admin',
    name: 'Admin',
    type: 'ADMIN',
    description: 'Administrator with full access except role creation',
    isSystem: true,
    createdBy: 'system',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    id: 'employee',
    name: 'Employee',
    type: 'EMPLOYEE',
    description: 'Basic employee access',
    isSystem: true,
    createdBy: 'system',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
];