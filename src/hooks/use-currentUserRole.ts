import { useState, useEffect } from "react";
import { auth } from "@/config/firebase.config";
import type { Role } from "@/types/rbac";
import { useFirestoreCRUD } from "./use-firebaseCRUD";

export const useCurrentUserRole = () => {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const { readDocuments } = useFirestoreCRUD();
  useEffect(() => {
    fetchRole();
  }, []);
  const fetchRole = async () => {
    const user = auth.currentUser;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const users = await readDocuments("masterUserData", {
        where: [{ field: "id", operator: "==", value: user.uid }],
      });
      const currentUser = users[0];
      if (currentUser?.roleId) {
        const roles = await readDocuments<Role>("roles", {
          where: [{ field: "id", operator: "==", value: currentUser.roleId }],
        });
        setRole(roles[0] || null);
      } else {
        setRole(null);
      }
    } catch (err) {
      console.error("Failed to fetch user role", err);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  return { role, loading };
};
