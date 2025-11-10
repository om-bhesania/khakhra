import { useEffect, useMemo, useState } from "react";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRBAC, RequireAdminEmail } from "@/wrappers/RBACProvider";
import { RBAC_DEFINITION } from "@/utils/Constants";
import { updateProfile } from "firebase/auth";
import { auth } from "@/config/firebase.config";
 
type UserRow = {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber?: string | null;
  role?: string | null;
};

const AVAILABLE_ROLES = ["Owner", "Employee"] as const;

export default function UsersTable() {
  const { readDocuments, updateDocument, subscribeToCollection, readRootDocuments } = useFirestoreCRUD();
  const [rows, setRows] = useState<UserRow[]>([]);
  const { isAdminEmail, user, definition } = useRBAC();

  const roleToSelectValue = (role?: string | null) => {
    const r = (role || "").toString().toLowerCase();
    if (r === "owner") return "Owner";
    if (r === "employee") return "Employee";
    return "Employee"; // default
  };

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const initial = await readDocuments<any>("users");
      const mapped = initial.map((d: any) => ({
          id: d.id,
          uid: d.uid,
          email: d.email ?? null,
          displayName: d.displayName ?? null,
          photoURL: d.photoURL ?? null,
          phoneNumber: d.phoneNumber ?? null,
          role: d.role ?? null,
        }));
      // Exclude current signed-in user from the list
      const filtered = mapped.filter((u) => u.uid !== user?.uid);
      setRows(filtered);
      unsub = subscribeToCollection("users", {
        onUpdate: (data: any[]) => {
          const mappedLive = data.map((d: any) => ({
              id: d.id,
              uid: d.uid,
              email: d.email ?? null,
              displayName: d.displayName ?? null,
              photoURL: d.photoURL ?? null,
              phoneNumber: d.phoneNumber ?? null,
              role: d.role ?? null,
            }));
          const filteredLive = mappedLive.filter((u) => u.uid !== user?.uid);
          setRows(filteredLive);
        },
      } as any);
    })();
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [readDocuments, subscribeToCollection]);

  const handleRoleChange = async (id: string, nextRole: string) => {
    try {
      const normalized = nextRole.toLowerCase();
      // Prefer root roles collection
      let perms: any = {};
      const roleDocs = await readRootDocuments<any>("roles", {
        where: [{ field: "name", operator: "==", value: normalized }],
        limit: 1,
      } as any);
      if (roleDocs.length) {
        perms = roleDocs[0]?.module || {};
      } else {
        const sourceDef = definition || (RBAC_DEFINITION as any);
        perms = sourceDef?.[normalized]?.module || {};
      }
      await updateDocument("users", id, { role: normalized, permissions: perms } as any);
      toast.success("Role updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update role");
    }
  };

  const handleUpdateCreds = async (
    id: string,
    values: { displayName: string | null; photoURL: string | null; phoneNumber: string | null }
  ) => {
    try {
      // If editing self, update Firebase Auth profile too (only supports displayName and photoURL)
      if (auth.currentUser && auth.currentUser.uid === id) {
        await updateProfile(auth.currentUser, {
          displayName: values.displayName || undefined,
          photoURL: values.photoURL || undefined,
        });
      }
      await updateDocument("users", id, values as any);
      toast.success("User details updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update user details");
    }
  };

  const table = useMemo(
    () => (
      <div className="space-y-3">
        {rows.map((u) => (
          <div key={u.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center rounded-md border p-3">
            <div className="md:col-span-3">
              <div className="text-sm font-medium">{u.displayName || "—"}</div>
              <div className="text-xs text-zinc-500">{u.email || "—"}</div>
            </div>
            <div className="md:col-span-2">
              <Input
                value={u.phoneNumber ?? ""}
                placeholder="Phone number"
                onChange={(e) => setRows((prev) => prev.map(r => r.id === u.id ? { ...r, phoneNumber: e.target.value } : r))}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                value={u.displayName ?? ""}
                placeholder="Display name"
                onChange={(e) => setRows((prev) => prev.map(r => r.id === u.id ? { ...r, displayName: e.target.value } : r))}
              />
            </div>
            <div className="md:col-span-3">
              <Input
                value={u.photoURL ?? ""}
                placeholder="Photo URL"
                onChange={(e) => setRows((prev) => prev.map(r => r.id === u.id ? { ...r, photoURL: e.target.value } : r))}
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Select
                value={roleToSelectValue(u.role)} 
                onValueChange={(val) => handleRoleChange(u.id, val)}
                disabled={!isAdminEmail}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                onClick={() =>
                  handleUpdateCreds(u.id, {
                    displayName: u.displayName || null,
                    photoURL: u.photoURL || null,
                    phoneNumber: (u.phoneNumber as any) || null,
                  })
                }
              >
                Save
              </Button>
            </div>
          </div>
        ))}
      </div>
    ),
    [rows, isAdminEmail]
  );

  return (
    <RequireAdminEmail>
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Role Setup</CardTitle>
          </CardHeader>
          <CardContent>
            {table}
          </CardContent>
        </Card>
      </div>
    </RequireAdminEmail>
  );
}


