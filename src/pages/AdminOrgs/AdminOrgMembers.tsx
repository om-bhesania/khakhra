import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useFirestoreCRUD } from "@/hooks/use-firebaseCRUD";
import { toast } from "sonner";

export default function AdminOrgMembers() {
  const { addDocument, readRootDocuments, updateDocument } = useFirestoreCRUD();
  const [orgId, setOrgId] = useState("");
  const [memberUid, setMemberUid] = useState("");
  const [users, setUsers] = useState<Array<{ id: string; displayName?: string; email?: string }>>([]);
  const [orgs, setOrgs] = useState<Array<{ id: string; name?: string }>>([]);

  useEffect(() => {
    (async () => {
      const u = await readRootDocuments<any>("users", { limit: 500 } as any);
      setUsers(u.map((x) => ({ id: x.id, displayName: (x as any).displayName, email: (x as any).email })));
      const o = await readRootDocuments<any>("organizations", { limit: 500 } as any);
      setOrgs(o.map((d: any) => ({ id: d.id, name: (d as any).name })));
    })();
  }, [readRootDocuments]);

  const addMember = async () => {
    try {
      if (!orgId) {
        toast.error("Select an organization");
        return;
      }
      if (!memberUid.trim()) {
        toast.error("Select a member");
        return;
      }
      // Set user's organizationId and add to members (no extra fields required here)
      await updateDocument("users", memberUid, { organizationId: orgId } as any);
      await addDocument(`organizations/${orgId}/members`, { uid: memberUid } as any);
      toast.success("Member added");
      setMemberUid("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add member");
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Manage Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name || o.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={memberUid} onValueChange={setMemberUid}>
              <SelectTrigger>
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.displayName || u.email || u.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addMember}>Add Member</Button>
        </CardContent>
      </Card>
    </div>
  );
}


