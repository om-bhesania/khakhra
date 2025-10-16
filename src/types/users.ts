import type { ModulePermission, Role } from './rbac';
import { Timestamp } from 'firebase/firestore';

export interface MasterUserData {
  id: string;
  email: string;
  displayName: string | null;
  roleId: string;
  role?: Role;
  permissions: Record<string, ModulePermission>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  status: 'active' | 'inactive' | 'suspended';
  metadata?: {
    lastPasswordChange?: Timestamp;
    failedLoginAttempts?: number;
    phoneNumber?: string;
    department?: string;
    position?: string;
  };
}

export interface ActiveUser {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  roleId: string;
  loginTime: Timestamp;
  lastActiveTime: Timestamp;
  deviceInfo: {
    userAgent: string;
    platform: string;
    language: string;
    ipAddress?: string;
  };
  status: 'online' | 'away' | 'offline';
}