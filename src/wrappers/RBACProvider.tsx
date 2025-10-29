import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ADMIN_EMAIL, type RbacAction } from "@/utils/Constants";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/config/firebase.config";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/config/firebase.config";

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

export function RBACProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [definition, setDefinition] = useState<RbacDefinition | null>(null);
  const [permissions, setPermissions] = useState<Record<string, RbacAction[]> | null>(null);

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
        } else {
          setRole(null);
          setPermissions(null);
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Load merged RBAC definition from RolesAndPermssions collection (doc: default)
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
  }, []);

  const isAdminEmail = useMemo(() => {
    const email = user?.email?.toLowerCase();
    return !!email && email === ADMIN_EMAIL.toLowerCase();
  }, [user]);

  const can = (moduleKey: string, action: RbacAction) => {
    if (isAdminEmail) return true;
    // Prefer explicit permissions from the user profile if present
    if (permissions) {
      const userActions = permissions[moduleKey] || [];
      return userActions.includes(action);
    }
    if (!role || !definition) return false;
    const actions = definition[role]?.module?.[moduleKey] || [];
    return actions.includes(action);
  };

  const value = useMemo(
    () => ({ user, loading, role, definition, isAdminEmail, permissions, can }),
    [user, loading, role, definition, isAdminEmail, permissions]
  );

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
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


