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
  const [users, setUsers] = useState<Array<{ id: string; displayName?: string; email?: string }>>([]);

  useEffect(() => {
    (async () => {
      const u = await readRootDocuments<any>("users", { limit: 200 } as any);
      setUsers(u.map((x) => ({ id: x.id, displayName: (x as any).displayName, email: (x as any).email })));
    })();
  }, [readRootDocuments]);

  const createOrg = async () => {
    try {
      if (!name.trim() || !ownerUid.trim()) {
        toast.error("Name and Owner are required");
        return;
      }
      const newOrg = await addDocument("organizations", { name: name.trim(), ownerUid } as any);
      const orgId = (newOrg as any)?.id;
      if (!orgId) throw new Error("Failed to create organization");
      
      // Set owner's organizationId
      await updateDocument("users", ownerUid, { organizationId: orgId } as any);
      
      // Create owner role for this organization
      const { Timestamp } = await import("firebase/firestore");
      const { SYSTEM_MODULES } = await import("@/types/rbac");
      
      const ownerRole = {
        organizationId: orgId,
        name: "Owner",
        description: "Organization owner with full access",
        isSystem: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: ownerUid,
      };
      const roleDoc = await addDocument(`organizations/${orgId}/roles`, ownerRole);
      const ownerRoleId = (roleDoc as any)?.id;
      
      // Create owner permissions (full access)
      const fullPermissions = {
        create: true,
        read: true,
        update: true,
        delete: true,
      };
      
      for (const module of SYSTEM_MODULES) {
        await addDocument(`organizations/${orgId}/permissions`, {
          organizationId: orgId,
          roleId: ownerRoleId,
          moduleId: module.id,
          permissions: fullPermissions,
          updatedBy: ownerUid,
          updatedAt: Timestamp.now(),
        } as any);
      }
      
      // Create default Employee role with read-only permissions
      const employeeRole = {
        organizationId: orgId,
        name: "Employee",
        description: "Default employee role with read-only access to all modules",
        isSystem: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: ownerUid,
      };
      const employeeRoleDoc = await addDocument(`organizations/${orgId}/roles`, employeeRole);
      const employeeRoleId = (employeeRoleDoc as any)?.id;
      
      // Create employee permissions (read-only)
      const readOnlyPermissions = {
        create: false,
        read: true,
        update: false,
        delete: false,
      };
      
      for (const module of SYSTEM_MODULES) {
        await addDocument(`organizations/${orgId}/permissions`, {
          organizationId: orgId,
          roleId: employeeRoleId,
          moduleId: module.id,
          permissions: readOnlyPermissions,
          updatedBy: ownerUid,
          updatedAt: Timestamp.now(),
        } as any);
      }
      
      // Add owner as member with owner role
      await addDocument(`organizations/${orgId}/members`, { 
        userId: ownerUid, 
        roleId: ownerRoleId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      } as any);
      
      toast.success("Organization created and owner assigned");
      setName("");
      setOwnerUid("");
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          </div>
          <Button onClick={createOrg} className="bg-rose-600 text-white hover:bg-rose-700">Create</Button>
        </CardContent>
      </Card>
    </div>
  );
}


