import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { toast } from "sonner";

export default function AdminOrgs() {
  const { addDocument, readRootDocuments, updateDocument } = useFirestoreCRUD();
  const [name, setName] = useState("");
  const [ownerUid, setOwnerUid] = useState("");
  const [role, setRole] = useState("owner");
  const [users, setUsers] = useState<Array<{ id: string; displayName?: string; email?: string }>>([]);
  const [roles, setRoles] = useState<Array<string>>([]);

  useEffect(() => {
    (async () => {
      const u = await readRootDocuments<any>("users", { limit: 200 } as any);
      setUsers(u.map((x) => ({ id: x.id, displayName: (x as any).displayName, email: (x as any).email })));
      const r = await readRootDocuments<any>("roles", { limit: 50 } as any);
      const roleNames = r.map((d: any) => (d.name ? d.name : d.id));
      setRoles(roleNames);
    })();
  }, [readRootDocuments]);

  const createOrg = async () => {
    try {
      if (!name.trim() || !ownerUid.trim() || !role) {
        toast.error("Name, Owner and Role are required");
        return;
      }
      const newOrg = await addDocument("organizations", { name: name.trim(), ownerUid } as any);
      const orgId = (newOrg as any)?.id;
      if (!orgId) throw new Error("Failed to create organization");
      // Set owner's organizationId and add owner as member with role
      await updateDocument("users", ownerUid, { organizationId: orgId } as any);
      await addDocument(`organizations/${orgId}/members`, { uid: ownerUid, role } as any);
      toast.success("Organization created and owner assigned");
      setName("");
      setOwnerUid("");
      setRole("owner");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create org");
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Organization name" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={ownerUid} onValueChange={setOwnerUid}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.displayName || u.email || u.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r.toLowerCase()}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={createOrg} className="bg-rose-600 text-white hover:bg-rose-700">Create</Button>
        </CardContent>
      </Card>
    </div>
  );
}


