import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ADMIN_EMAIL, type RbacAction } from "@/utils/Constants";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/config/firebase.config";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { useOrgRBAC } from "@/hooks/use-orgRBAC";

type RbacDefinition = {
  [role: string]: {
    module: {
      [moduleKey: string]: RbacAction[];
    };
  };
};

type RBACContextType = {
  user: User | null;
  loading: boolean;
  role: string | null;
  definition: RbacDefinition | null;
  isAdminEmail: boolean;
  permissions: Record<string, RbacAction[]> | null;
  can: (moduleKey: string, action: RbacAction) => boolean;
};

const RBACContext = createContext<RBACContextType | undefined>(undefined);

// Internal component that uses hooks
function RBACProviderInner({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [definition, setDefinition] = useState<RbacDefinition | null>(null);
  const [permissions, setPermissions] = useState<Record<string, RbacAction[]> | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [orgPermissions, setOrgPermissions] = useState<Record<string, any>>({});

  // Use org RBAC if user is in an organization
  const orgRBAC = useOrgRBAC();
  const isUsingOrgRBAC = !!orgRBAC.organizationId;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      try {
        if (u) {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          const data = userDoc.exists() ? (userDoc.data() as any) : null;
          const r = (data?.role as string) || null;
          setRole(r);
          const perms = (data?.permissions as Record<string, RbacAction[]>) || null;
          setPermissions(perms);
          
          // Check if user is in organization
          const orgId = data?.organizationId;
          setOrganizationId(orgId || null);
          
          if (orgId) {
            // Check if user is owner
            const orgDoc = await getDoc(doc(db, "organizations", orgId));
            if (orgDoc.exists()) {
              const orgData = orgDoc.data();
              setIsOwner(orgData.ownerUid === u.uid);
            }
          } else {
            setIsOwner(false);
          }
        } else {
          setRole(null);
          setPermissions(null);
          setOrganizationId(null);
          setIsOwner(false);
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);
  
  // Sync org RBAC state
  useEffect(() => {
    if (orgRBAC.organizationId) {
      setOrganizationId(orgRBAC.organizationId);
      setIsOwner(orgRBAC.isOwner);
      setOrgPermissions(orgRBAC.memberPermissions);
    }
  }, [orgRBAC.organizationId, orgRBAC.isOwner, orgRBAC.memberPermissions]);

  useEffect(() => {
    // Load merged RBAC definition from RolesAndPermssions collection (doc: default)
    // Only load if not using org RBAC
    if (isUsingOrgRBAC) return;
    
    (async () => {
      try {
        const defDoc = await getDoc(doc(db, "RolesAndPermssions", "default"));
        if (defDoc.exists()) {
          setDefinition(defDoc.data() as RbacDefinition);
          return;
        }
        // Fallback: build from roles/permissions collections if present
        const rolesSnap = await getDocs(collection(db, "roles"));
        const merged: any = {};
        rolesSnap.forEach((d) => {
          merged[d.id] = d.data();
        });
        if (Object.keys(merged).length > 0) setDefinition(merged as RbacDefinition);
      } catch (_e) {
        // ignore; definition stays null
      }
    })();
  }, [isUsingOrgRBAC]);

  const isAdminEmail = useMemo(() => {
    const email = user?.email?.toLowerCase();
    return !!email && email === ADMIN_EMAIL.toLowerCase();
  }, [user]);

  // Map org RBAC actions to legacy actions
  const mapOrgActionToLegacy = (action: RbacAction): "create" | "read" | "update" | "delete" => {
    // Map legacy actions to org RBAC actions
    if (action === "write") return "create";
    return action as "create" | "read" | "update" | "delete";
  };

  const can = useMemo(() => {
    return (moduleKey: string, action: RbacAction): boolean => {
      if (isAdminEmail) return true;
      
      // If using org RBAC, check org permissions
      if (isUsingOrgRBAC && organizationId) {
        // Owner has all permissions
        if (isOwner) return true;
        
        // Map module names (legacy uses different names)
        const moduleMap: Record<string, string> = {
          dashboard: "dashboard",
          billing: "billing",
          inventory: "inventory",
          customers: "customer",
          employees: "employees",
        };
        
        const orgModuleId = moduleMap[moduleKey] || moduleKey;
        const orgAction = mapOrgActionToLegacy(action);
        
        // Check org permissions
        const modulePerms = orgPermissions[orgModuleId];
        if (!modulePerms) return false;
        
        // Map action names
        const actionMap: Record<string, keyof typeof modulePerms> = {
          create: "create",
          read: "read",
          write: "create",
          update: "update",
          delete: "delete",
        };
        
        const permKey = actionMap[action] || action;
        return !!modulePerms[permKey];
      }
      
      // Legacy RBAC system
      // Prefer explicit permissions from the user profile if present
      if (permissions) {
        const userActions = permissions[moduleKey] || [];
        return userActions.includes(action);
      }
      if (!role || !definition) return false;
      const actions = definition[role]?.module?.[moduleKey] || [];
      return actions.includes(action);
    };
  }, [isAdminEmail, isUsingOrgRBAC, organizationId, isOwner, orgPermissions, permissions, role, definition]);

  const value = useMemo(
    () => ({ user, loading: loading || orgRBAC.loading, role, definition, isAdminEmail, permissions, can }),
    [user, loading, orgRBAC.loading, role, definition, isAdminEmail, permissions, can]
  );

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

export function RBACProvider({ children }: { children: ReactNode }) {
  return <RBACProviderInner>{children}</RBACProviderInner>;
}

export function useRBAC() {
  const ctx = useContext(RBACContext);
  if (!ctx) throw new Error("useRBAC must be used within RBACProvider");
  return ctx;
}

export function RequireAdminEmail({ children }: { children: ReactNode }) {
  const { loading, isAdminEmail } = useRBAC();
  if (loading) return null;
  if (!isAdminEmail) return null;
  return <>{children}</>;
}


